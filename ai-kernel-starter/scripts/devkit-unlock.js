#!/usr/bin/env node
const { ensureUser, loadTokens, saveTokens } = require('../core/user-vault');
const { exportDevkit } = require('../devkit/export-devkit');

function main(){
  const user = process.argv[2];
  if(!user){ console.log('Usage: devkit-unlock.js <user>'); process.exit(1); }
  ensureUser(user);
  let tokens = loadTokens(user);
  if(tokens < 1){
    console.log('This vault is sealed. You can unlock it for $1 or with a referral.');
    return;
  }
  saveTokens(user, tokens-1);
  const zip = exportDevkit(user);
  console.log('DevKit zipped:', zip);
}

if(require.main===module){
  main();
}
