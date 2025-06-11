#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const minimist = require('minimist');
const { getVaultPath, ensureUser } = require('./core/user-vault');

const argv = minimist(process.argv.slice(2));
const cmd = argv._[0];

if (!cmd) {
  console.log('Usage: diffuse-memory.js <encode|decode> [options]');
  process.exit(1);
}

if (cmd === 'encode') {
  const user = argv.user;
  const file = argv.file;
  if (!user || !file) {
    console.log('encode requires --user <id> --file <path>');
    process.exit(1);
  }
  ensureUser(user);
  const data = fs.readFileSync(file);
  const b64 = data.toString('base64');
  const out = file + '.mp4';
  fs.writeFileSync(out, b64);
  log(user, { file: path.basename(file), out });
  console.log(out);
} else if (cmd === 'decode') {
  const file = argv.file;
  if (!file) { console.log('decode requires --file <file>'); process.exit(1); }
  const b64 = fs.readFileSync(file, 'utf8');
  const out = file.replace(/\.mp4$/,'');
  fs.writeFileSync(out, Buffer.from(b64, 'base64'));
  console.log(out);
} else {
  console.log('Unknown command');
}

function log(user, entry) {
  const vaultLog = path.join(getVaultPath(user), 'diffused-history.json');
  const globalLog = path.join('logs', 'memory-fusion-events.json');
  append(vaultLog, entry);
  append(globalLog, { user, ...entry });
}

function append(p, entry) {
  let arr = [];
  if (fs.existsSync(p)) { try { arr = JSON.parse(fs.readFileSync(p,'utf8')); } catch {} }
  arr.push({ timestamp: new Date().toISOString(), ...entry });
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(arr, null, 2));
}

