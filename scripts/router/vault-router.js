#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const minimist = require('minimist');
const yaml = require('js-yaml');
const { ensureUser, getVaultPath } = require('../core/user-vault');

const argv = minimist(process.argv.slice(2));
const user = argv.user || 'default';
ensureUser(user);

function readFile(file) {
  if (!file) return null;
  try { return fs.readFileSync(file, 'utf8'); } catch { return null; }
}

const ideaFile = argv.idea;
const promptFile = argv.prompt;
const chatFile = argv.chatlog;
const runtimeTag = argv.runtime || 'default-runtime';

const idea = readFile(ideaFile);
const prompt = readFile(promptFile);
const chatlog = readFile(chatFile);

const payload = { idea, prompt, chatlog };
const payloadStr = JSON.stringify(payload);

const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
let encrypted = cipher.update(payloadStr, 'utf8', 'hex');
encrypted += cipher.final('hex');
const authTag = cipher.getAuthTag().toString('hex');

const keyId = crypto.randomUUID();
const timestamp = Date.now();
const keyDir = path.join('keys', keyId);
fs.mkdirSync(keyDir, { recursive: true });
fs.writeFileSync(path.join(keyDir, `${timestamp}.key`), key.toString('hex'));

const vaultHash = crypto.createHash('sha256').update(user).digest('hex');
const message = {
  encrypted_payload: encrypted,
  iv: iv.toString('hex'),
  auth_tag: authTag,
  vault_hash: vaultHash,
  key_ref: `${keyId}/${timestamp}.key`,
  runtime_tag: runtimeTag
};

console.log(JSON.stringify(message, null, 2));

function appendLog(file, entry) {
  let arr = [];
  if (fs.existsSync(file)) {
    try { arr = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
  }
  arr.push(entry);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(arr, null, 2));
}

const logEntry = {
  timestamp: new Date().toISOString(),
  user,
  vault_hash: vaultHash,
  key_ref: message.key_ref,
  files: {
    idea: ideaFile ? path.basename(ideaFile) : null,
    prompt: promptFile ? path.basename(promptFile) : null,
    chatlog: chatFile ? path.basename(chatFile) : null
  }
};

appendLog(path.join('logs', 'transmission-log.json'), logEntry);
const userLog = path.join(getVaultPath(user), 'transmission-history.json');
appendLog(userLog, logEntry);

const middleDir = path.join('middle', user);
fs.mkdirSync(middleDir, { recursive: true });
fs.writeFileSync(path.join(middleDir, `${timestamp}.json`), JSON.stringify(message, null, 2));

