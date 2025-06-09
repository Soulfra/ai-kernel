#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
let chalk = null;
try { chalk = require('chalk'); } catch {}

const repoRoot = path.resolve(__dirname, '..', '..');
const logsDir = path.join(repoRoot, 'logs');
const logFile = path.join(logsDir, 'cli-output.json');
const statusFile = path.join(logsDir, 'kernel-status.json');
const verifyFile = path.join(logsDir, 'verify-pass.json');
fs.mkdirSync(logsDir, { recursive: true });

function color(text, fn) {
  return chalk && chalk[fn] ? chalk[fn](text) : text;
}

function appendLog(command, output) {
  let arr = [];
  if (fs.existsSync(logFile)) {
    try { arr = JSON.parse(fs.readFileSync(logFile, 'utf8')); } catch {}
  }
  arr.push({ timestamp: new Date().toISOString(), command, output });
  fs.writeFileSync(logFile, JSON.stringify(arr, null, 2));
}

function run(cmd, opts = {}) {
  try {
    const out = execSync(cmd, { encoding: 'utf8', cwd: repoRoot, shell: true, ...opts });
    process.stdout.write(out);
    appendLog(cmd, out.trim());
    return 0;
  } catch (err) {
    const out = ((err.stdout || '') + (err.stderr || '')).toString();
    process.stdout.write(err.stdout || '');
    process.stderr.write(err.stderr || '');
    appendLog(cmd, out.trim() || err.message);
    return err.status || 1;
  }
}

function help() {
  console.log(`Usage: node kernel-cli.js <command> [args]\n\nCommands:\n  init             clone repo and run setup.sh\n  verify           run make verify\n  inspect          run node scripts/dev/kernel-inspector.js\n  test             run npm test\n  install-agent <path>  install specified agent.yaml\n  launch-ui        run the Express server\n  status           show repository status`);
}

function writeStatus(obj) {
  fs.writeFileSync(statusFile, JSON.stringify(obj, null, 2));
}

function printStatus() {
  const res = {};
  const agentsPath = path.join(repoRoot, 'installed-agents.json');
  try { res.agents = JSON.parse(fs.readFileSync(agentsPath, 'utf8')); } catch { res.agents = []; }

  if (fs.existsSync(verifyFile)) {
    try { res.lastVerify = JSON.parse(fs.readFileSync(verifyFile, 'utf8')).timestamp; } catch {}
  } else if (fs.existsSync(logFile)) {
    try {
      const arr = JSON.parse(fs.readFileSync(logFile, 'utf8'));
      for (let i = arr.length - 1; i >= 0; i--) {
        const e = arr[i];
        if (e.command.includes('make verify') && !/\u274c|fail/i.test(e.output)) {
          res.lastVerify = e.timestamp;
          break;
        }
      }
    } catch {}
  }
  if (!res.lastVerify) res.lastVerify = null;

  const tf = execSync(`find kernel-slate -name '*.test.js' -not -path '*/node_modules/*'`, { cwd: repoRoot, encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean);
  res.testFiles = tf.length;

  let jestResults = null;
  const jestOut = path.join(logsDir, 'jest_results.json');
  try {
    execSync(`npm test --prefix kernel-slate -- --json --outputFile=${jestOut}`, { cwd: repoRoot, stdio: 'pipe' });
    jestResults = JSON.parse(fs.readFileSync(jestOut, 'utf8'));
  } catch (err) {
    try { jestResults = JSON.parse(fs.readFileSync(jestOut, 'utf8')); } catch {}
  }
  if (jestResults) {
    res.tests = {
      passed: jestResults.numPassedTests,
      failed: jestResults.numFailedTests,
      total: jestResults.numTotalTests
    };
  }

  const calctlPath = path.join(repoRoot, 'legacy', 'scripts', 'OGKERNEL', 'calctl-core.js');
  res.calctlAvailable = fs.existsSync(calctlPath);

  writeStatus(res);

  console.log(color('Installed agents:', 'cyan'), res.agents.length ? res.agents.join(', ') : 'none');
  console.log(color('Last verify pass:', 'cyan'), res.lastVerify || 'never');
  console.log(color('Test files:', 'cyan'), res.testFiles);
  if (res.tests) console.log(color('Tests:', 'cyan'), `${res.tests.passed} passed, ${res.tests.failed} failed`);
  console.log(color('CalCTL menu layer:', 'cyan'), res.calctlAvailable ? color('available', 'green') : color('missing', 'red'));
}

async function main() {
  const [cmd, arg] = process.argv.slice(2);
  if (!cmd) return help();
  switch (cmd) {
    case 'init': {
      const repoUrl = process.env.REPO_URL || 'https://github.com/your-org/clarity-engine.git';
      const dir = repoUrl.split('/').pop().replace(/\.git$/, '') || 'repo';
      if (run(`git clone ${repoUrl}`) !== 0) break;
      run('bash setup.sh', { cwd: path.join(process.cwd(), dir) });
      break;
    }
    case 'verify': {
      const code = run('make verify');
      if (code === 0) fs.writeFileSync(verifyFile, JSON.stringify({ timestamp: new Date().toISOString() }, null, 2));
      break;
    }
    case 'inspect':
      run('node scripts/dev/kernel-inspector.js');
      break;
    case 'test':
      run('npm test');
      break;
    case 'install-agent':
      if (!arg) return help();
      run(`node kernel-slate/scripts/market/install-agent.js ${arg}`);
      break;
    case 'launch-ui':
      run('node scripts/ui/server.js');
      break;
    case 'status':
      printStatus();
      break;
    default:
      help();
  }
}

if (require.main === module) {
  main();
}
