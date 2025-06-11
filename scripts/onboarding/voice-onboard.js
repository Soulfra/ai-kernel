#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { ensureUser, getVaultPath } = require('../core/user-vault');
const { transcribe } = require('../agent/claude-voice');
const { speak } = require('../agent/glyph-agent');

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.log('Usage: voice-onboard.js <voice-file> [user]');
    process.exit(1);
  }
  let user = process.argv[3] || randomUUID();
  ensureUser(user);
  const vault = getVaultPath(user);
  fs.mkdirSync(vault, { recursive: true });
  const dest = path.join(vault, 'voice.mp3');
  fs.copyFileSync(file, dest);
  const text = await transcribe(file);
  fs.writeFileSync(path.join(vault, 'onboarding.md'), text);
  speak(user, "Got it. Welcome. I've created a vault for you. Let's take a look.");
  console.log(user);
}

if (require.main === module) {
  main().catch(err => { console.error(err); process.exit(1); });
}
