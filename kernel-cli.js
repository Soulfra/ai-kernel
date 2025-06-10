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
const userIndex = rawArgs.indexOf('--user');
let vaultUser = null;
if (userIndex !== -1) {
  vaultUser = rawArgs[userIndex + 1];
  rawArgs.splice(userIndex, 2);
  process.env.KERNEL_USER = vaultUser;
  const { ensureUser, loadEnv } = require('./scripts/core/user-vault');
  ensureUser(vaultUser);
  if (useByok) loadEnv(vaultUser);
}
const simulateIndex = rawArgs.indexOf('--simulate');
const simulate = simulateIndex !== -1;
if (simulate) {
  rawArgs.splice(simulateIndex, 1);
  process.env.SIMULATE = 'true';
  process.env.PROVIDER = 'none';
}
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
async function runIdeaCli() {
  const { runIdea } = require('./scripts/idea-runner');
  const target = args[0];
  if (!target) {
    console.log('Usage: run-idea <slug|path>');
    process.exit(1);
  }
  try {
    const res = await runIdea(target, 'cli', vaultUser);
    if (res && res.success) {
      console.log(`Run complete. Promote with: node kernel-cli.js promote-idea ${res.slug}`);
    }
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

function promoteIdeaCli() {
  const { promoteIdea } = require('./scripts/promote-idea');
  const slug = args[0];
  if (!slug) {
    console.log('Usage: promote-idea <slug>');
    process.exit(1);
  }
  try {
    promoteIdea(slug);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

function buildAgentFromIdeaCli() {
  const { buildAgentFromIdea } = require('./scripts/build-agent-from-idea');
  const slug = args[0];
  if (!slug || !vaultUser) {
    console.log('Usage: build-agent-from-idea <slug> --user <user>');
    process.exit(1);
  }
  try {
    const out = buildAgentFromIdea(slug, vaultUser);
    console.log(`Created ${out}`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

function reflectVaultCli() {
  const { reflectVault } = require('./scripts/reflect-vault');
  if (!vaultUser) {
    console.log('Usage: reflect-vault --user <user>');
    process.exit(1);
  }
  try {
    const res = reflectVault(vaultUser);
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

function generateQrCli() {
  const { generateQR } = require('./scripts/auth/qr-pairing');
  const out = generateQR();
  console.log(out.uri);
}

function checkPairingCli() {
  const { checkPair } = require('./scripts/auth/qr-pairing');
  const id = args[0];
  if (!id) {
    console.log('Usage: check-pairing <id>');
    process.exit(1);
  }
  console.log(checkPair(id) ? 'paired' : 'pending');
}

if (cmd === 'ignite') {
  ignite();
} else if (cmd === 'run-idea') {
  runIdeaCli();
} else if (cmd === 'promote-idea') {
  promoteIdeaCli();
} else if (cmd === 'build-agent-from-idea') {
  buildAgentFromIdeaCli();
} else if (cmd === 'reflect-vault') {
  reflectVaultCli();
} else if (cmd === 'generate-qr') {
  generateQrCli();
} else if (cmd === 'check-pairing') {
  checkPairingCli();
} else if (fs.existsSync(slateCli)) {
  const res = spawnSync('node', [slateCli, cmd, ...args], { cwd: repoRoot, stdio: 'inherit' });
  process.exit(res.status);
} else {
  console.log('Usage: node kernel-cli.js ignite');
  process.exit(1);
}
