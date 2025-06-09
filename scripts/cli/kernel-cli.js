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

function help() {
  console.log(`Usage: node kernel-cli.js <command> [args]\n\nCommands:\n  init             clone repo and run setup.sh\n  verify           run make verify\n  inspect          run node scripts/dev/kernel-inspector.js\n  test             run npm test\n  install-agent <path>  install specified agent.yaml\n  launch-ui        run the Express server`);
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
    default:
      help();
  }
}

if (require.main === module) {
  main();
}
