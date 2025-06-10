#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const minimist = require('minimist');
const argv = minimist(process.argv.slice(2));

const session = argv.session;
const keyFile = argv.key;
if (!session || !keyFile) {
  console.log('Usage: admin-decrypt.js --session <file> --key <keyfile>');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(session, 'utf8'));
const key = Buffer.from(fs.readFileSync(keyFile, 'utf8'), 'hex');
const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(data.iv,'hex'));
decipher.setAuthTag(Buffer.from(data.auth_tag,'hex'));
let dec = decipher.update(data.encrypted_payload, 'hex', 'utf8');
dec += decipher.final('utf8');
console.log(dec);

