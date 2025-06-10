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
  run('node', ['scripts/setup/first-time-init.js']);
  if (!run('make', ['verify'])) process.exit(1);
  run('make', ['standards']);
  run('make', ['release-check']);
  if (vaultUser) {
    try {
      require('./scripts/orchestration/kernel-boot')(vaultUser);
      require('./scripts/reflect-vault')(vaultUser);
      require('./scripts/scan-usage-summary').scanUsageSummary(vaultUser);
      require('./scripts/run-jobs').runJobs(vaultUser).catch(() => {});
    } catch (err) {
      console.error(err.message);
    }
  }
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

function queueAgentCli() {
  const zip = args[0];
  if (!zip || !vaultUser) {
    console.log('Usage: queue-agent <path.zip> --user <user>');
    process.exit(1);
  }
  try {
    const { queueAgent } = require('./scripts/queue-agent');
    queueAgent(zip, vaultUser);
    console.log('queued');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

async function runQueueCli() {
  if (!vaultUser) {
    console.log('Usage: run-queue --user <user>');
    process.exit(1);
  }
  try {
    const { runQueue } = require('./scripts/run-queue');
    const out = await runQueue(vaultUser);
    console.log(JSON.stringify(out, null, 2));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

async function runAgentZipCli() {
  const zip = args[0];
  const prompt = args.slice(1).join(' ');
  if (!zip || !vaultUser) {
    console.log('Usage: run-agent <path.zip> --user <user> [prompt]');
    process.exit(1);
  }
  try {
    const { runAgentZip } = require('./scripts/run-agent-zip');
    const out = await runAgentZip(zip, prompt, vaultUser);
    if (out) console.log(out);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

async function sanitizeCli() {
  try {
    await require('./scripts/orchestration/sanitizer')();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

async function snapshotCli() {
  try {
    await require('./scripts/orchestration/snapshot')();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

function syncDeviceCli() {
  if (!vaultUser) {
    console.log('Usage: sync-device --user <user>');
    process.exit(1);
  }
  try {
    const { syncDevice } = require('./scripts/sync-device');
    const out = syncDevice(vaultUser);
    console.log(JSON.stringify(out, null, 2));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

async function runJobsCli() {
  if (!vaultUser) {
    console.log('Usage: run-jobs --user <user>');
    process.exit(1);
  }
  try {
    const { runJobs } = require('./scripts/run-jobs');
    const res = await runJobs(vaultUser);
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

function checkJobCli() {
  const id = args[0];
  if (!id || !vaultUser) {
    console.log('Usage: check-job <id> --user <user>');
    process.exit(1);
  }
  const { getVaultPath } = require('./scripts/core/user-vault');
  const file = path.join(getVaultPath(vaultUser), 'jobs', `${id}.json`);
  if (!fs.existsSync(file)) {
    console.log('Job not found');
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log(JSON.stringify(data, null, 2));
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
} else if (cmd === 'run-agent') {
  runAgentZipCli();
} else if (cmd === 'queue-agent') {
  queueAgentCli();
} else if (cmd === 'run-queue') {
  runQueueCli();
} else if (cmd === 'sanitize') {
  sanitizeCli();
} else if (cmd === 'snapshot') {
  snapshotCli();
} else if (cmd === 'check-job') {
  checkJobCli();
} else if (cmd === 'sync-device') {
  syncDeviceCli();
} else if (cmd === 'run-jobs') {
  runJobsCli();
} else if (fs.existsSync(slateCli)) {
  const res = spawnSync('node', [slateCli, cmd, ...args], { cwd: repoRoot, stdio: 'inherit' });
  process.exit(res.status);
} else {
  console.log('Usage: node kernel-cli.js ignite');
  process.exit(1);
}
