#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { ensureUser, getVaultPath } = require('../core/user-vault');
const { speak } = require('../agent/glyph-agent');

function summarize(text){
  return text.split('\n')[0].slice(0,60);
}

function main(){
  const user = process.argv[2];
  if(!user){ console.log('Usage: seed-idea.js <user>'); process.exit(1); }
  ensureUser(user);
  const vault = getVaultPath(user);
  const onboard = path.join(vault,'onboarding.md');
  if(!fs.existsSync(onboard)) throw new Error('onboarding.md not found');
  const text = fs.readFileSync(onboard,'utf8');
  const summary = summarize(text);
  fs.writeFileSync(path.join(vault,'reflection.md'), summary);
  const idea = { name: summary, description: text };
  fs.writeFileSync(path.join(vault,'seed.idea.yaml'), yaml.dump(idea));
  speak(user, 'This sounds like an idea worth building. Want me to prep a DevKit?');
}

if(require.main===module){
  try { main(); } catch(err){ console.error(err); process.exit(1); }
}
