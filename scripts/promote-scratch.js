#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const minimist = require('minimist');
const { ensureUser, getVaultPath } = require('./core/user-vault');

const argv = minimist(process.argv.slice(2));
const user = argv.user || 'default';
const id = argv.id;
const confirm = argv.confirm;

if (!id) {
  console.log('Usage: promote-scratch.js --id <uuid> [--confirm] [--user <u>]');
  process.exit(1);
}

ensureUser(user);
const base = path.join('scratch', id);
const inputFile = path.join(base, 'input-transcript.json');

if (!fs.existsSync(inputFile)) {
  console.error('No scratch input for', id);
  process.exit(1);
}

const content = fs.readFileSync(inputFile, 'utf8');
const logEntry = { timestamp: new Date().toISOString(), user, id };

if (confirm) {
  const vaultDir = getVaultPath(user);
  const usageFile = path.join(vaultDir, 'usage.json');
  const promptsFile = path.join(vaultDir, 'prompts.json');
  let usage = [];
  let prompts = [];
  if (fs.existsSync(usageFile)) { try { usage = JSON.parse(fs.readFileSync(usageFile,'utf8')); } catch {} }
  if (fs.existsSync(promptsFile)) { try { prompts = JSON.parse(fs.readFileSync(promptsFile,'utf8')); } catch {} }
  usage.push(JSON.parse(content));
  prompts.push({ id, content: JSON.parse(content) });
  fs.writeFileSync(usageFile, JSON.stringify(usage, null, 2));
  fs.writeFileSync(promptsFile, JSON.stringify(prompts, null, 2));
  logEntry.promoted = true;
  fs.rmSync(base, { recursive: true, force: true });
} else {
  fs.rmSync(base, { recursive: true, force: true });
  logEntry.promoted = false;
}

function appendLog(p, entry) {
  let arr = [];
  if (fs.existsSync(p)) { try { arr = JSON.parse(fs.readFileSync(p,'utf8')); } catch {} }
  arr.push(entry);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(arr, null, 2));
}

appendLog(path.join('logs','scratch-promotions.json'), logEntry);

