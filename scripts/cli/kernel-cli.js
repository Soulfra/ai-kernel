#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..', '..');
const logsDir = path.join(repoRoot, 'logs');
const logFile = path.join(logsDir, 'cli-output.json');
fs.mkdirSync(logsDir, { recursive: true });

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

function runWithOutput(cmd, opts = {}) {
  try {
    const out = execSync(cmd, { encoding: 'utf8', cwd: repoRoot, shell: true, ...opts });
    process.stdout.write(out);
    appendLog(cmd, out.trim());
    return { status: 0, output: out };
  } catch (err) {
    const out = ((err.stdout || '') + (err.stderr || '')).toString();
    process.stdout.write(err.stdout || '');
    process.stderr.write(err.stderr || '');
    appendLog(cmd, out.trim() || err.message);
    return { status: err.status || 1, output: out };
  }
}

function parsePassedTests(output) {
  const m = output.match(/Tests:\s+(?:\d+\s+\w+,\s+)?(\d+)\s+passed/);
  return m ? parseInt(m[1], 10) : null;
}

async function releaseCheck() {
  const errors = [];
  let passed = null;

  const ensure = runWithOutput('node scripts/core/ensure-runtime.js');
  if (ensure.status !== 0) errors.push('ensure-runtime.js');

  const verify = runWithOutput('make verify');
  if (verify.status !== 0) errors.push('make verify');
  const parsed = parsePassedTests(verify.output);
  if (parsed !== null) passed = parsed;

  const inspect = runWithOutput('node scripts/dev/kernel-inspector.js');
  if (inspect.status !== 0) errors.push('kernel-inspector.js');

  const ok = ensure.status === 0 && verify.status === 0 && inspect.status === 0;
  const symbol = ok ? '✅' : '❌';
  const count = passed !== null ? `${passed} tests passed` : 'test count unknown';
  const errMsg = errors.length ? ` errors: ${errors.join(', ')}` : '';
  console.log(`\n${symbol} ${count}${errMsg}`);
}

function help() {
  console.log(`Usage: node kernel-cli.js <command> [args]\n\nCommands:\n  init             clone repo and run setup.sh\n  verify           run make verify\n  inspect          run node scripts/dev/kernel-inspector.js\n  test             run npm test\n  install-agent <path>  install specified agent.yaml\n  launch-ui        run the Express server\n  run release-check  verify release readiness`);
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
    case 'verify':
      run('make verify');
      break;
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
    case 'run':
      if (arg === 'release-check') {
        await releaseCheck();
      } else {
        help();
      }
      break;
    default:
      help();
  }
}

if (require.main === module) {
  main();
}
