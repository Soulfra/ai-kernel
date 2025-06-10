#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { ensureUser, getVaultPath, loadTokens, saveTokens } = require('../core/user-vault');

function main(){
  const referrer = process.argv[2];
  const invitee = process.argv[3];
  if(!referrer || !invitee){
    console.log('Usage: referral.js <referrer> <invitee>');
    process.exit(1);
  }
  ensureUser(referrer);
  ensureUser(invitee);
  const refFile = path.join(getVaultPath(invitee),'referral.json');
  fs.writeFileSync(refFile, JSON.stringify({ referrer, timestamp:new Date().toISOString() },null,2));
  saveTokens(referrer, loadTokens(referrer)+1);
  saveTokens(invitee, loadTokens(invitee)+1);
  console.log('Referral accepted. You\'ve been granted export access. Want to share this with someone else?');
}

if(require.main===module){
  main();
}
