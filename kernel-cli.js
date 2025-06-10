#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync, spawn } = require('child_process');

const repoRoot = __dirname;
const slateCli = path.join(repoRoot, 'kernel-slate', 'scripts', 'cli', 'kernel-cli.js');

function run(cmd, args) {
  const res = spawnSync(cmd, args, { cwd: repoRoot, stdio: 'inherit' });
  return res.status === 0;
}

function ignite() {
  if (!run('make', ['verify'])) process.exit(1);
  run('make', ['standards']);
  run('make', ['release-check']);
  const serverPath = path.join('scripts', 'boot', 'kernel-server.js');
  const child = spawn('node', [serverPath], { cwd: repoRoot, stdio: 'inherit' });
  const agents = (() => {
    try { return JSON.parse(fs.readFileSync('installed-agents.json', 'utf8')); } catch { return []; }
  })();
  console.log(`\nServer started on http://localhost:3077`);
  console.log(`Routes: /status, /agents, /logs, /run/:cmd`);
  console.log(`Installed agents: ${agents.length}`);
  console.log(`See docs at docs/index.md`);
  child.on('exit', code => process.exit(code));
}

const rawArgs = process.argv.slice(2);
const byokIndex = rawArgs.indexOf('--use-byok');
const useByok = byokIndex !== -1;
if (useByok) rawArgs.splice(byokIndex, 1);
if (useByok) process.env.USE_BYOK = 'true';
const cmd = rawArgs[0];
const args = rawArgs.slice(1);

// log CLI flag routing
try {
  const logFile = path.join(repoRoot, 'logs', 'cli-flag-routing.json');
  const entry = { timestamp: new Date().toISOString(), cmd, useByok };
  let arr = [];
  if (fs.existsSync(logFile)) arr = JSON.parse(fs.readFileSync(logFile, 'utf8'));
  arr.push(entry);
  fs.writeFileSync(logFile, JSON.stringify(arr, null, 2));
} catch {}
if (cmd === 'ignite') {
  ignite();
} else if (fs.existsSync(slateCli)) {
  const res = spawnSync('node', [slateCli, cmd, ...args], { cwd: repoRoot, stdio: 'inherit' });
  process.exit(res.status);
} else {
  console.log('Usage: node kernel-cli.js ignite');
  process.exit(1);
}
