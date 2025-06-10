#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { ensureUser, getVaultPath } = require('../core/user-vault');
const { run } = require('../cron/nightly-reflection');
const { speak } = require('../agent/glyph-agent');

async function main(){
  const user = process.argv[2];
  if(!user){ console.log('Usage: daily-digest.js <user>'); process.exit(1); }
  ensureUser(user);
  await run(user);
  const vault = getVaultPath(user);
  fs.writeFileSync(path.join(vault,'remix-candidates.json'), JSON.stringify([{ id: Date.now() }],null,2));
  speak(user, 'I found a forgotten sketch from last week. Want to review it together?');
}

if(require.main===module){
  main().catch(err=>{ console.error(err); process.exit(1); });
}
