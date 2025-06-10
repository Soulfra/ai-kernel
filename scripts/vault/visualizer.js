#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { ensureUser, getVaultPath } = require('../core/user-vault');

function animateVault(user) {
  ensureUser(user);
  const base = getVaultPath(user);
  const usageFile = path.join(base,'usage.json');
  let count = 0;
  if (fs.existsSync(usageFile)) { try { count = JSON.parse(fs.readFileSync(usageFile,'utf8')).length; } catch {} }
  const summary = { user, steps: count, timestamp: new Date().toISOString() };
  const outDir = path.join(base,'visual');
  fs.mkdirSync(outDir,{ recursive: true });
  const jsonFile = path.join(outDir,'summary.mp4.json');
  fs.writeFileSync(jsonFile, JSON.stringify(summary,null,2));
  const mp4File = path.join(outDir,'summary.mp4');
  fs.writeFileSync(mp4File, Buffer.from(JSON.stringify(summary)).toString('base64'));
  return mp4File;
}

if (require.main === module) {
  const user = process.argv[2];
  if (!user) { console.log('Usage: visualizer.js <user>'); process.exit(1); }
  const file = animateVault(user);
  console.log(file);
}

module.exports = { animateVault };
