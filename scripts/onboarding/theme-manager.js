#!/usr/bin/env node
const { loadTheme, saveTheme } = require('../agent/glyph-agent');
const { ensureUser } = require('../core/user-vault');
const fs = require('fs');
const path = require('path');
const { loadTokens, saveTokens, getVaultPath } = require('../core/user-vault');

const cmd = process.argv[2];
const name = process.argv[3];
const user = process.argv[4] || 'demo';

ensureUser(user);

switch(cmd){
  case 'set':
    if(!name){ console.log('Usage: theme-manager.js set <theme> [user]'); process.exit(1); }
    const file = path.join('themes', `${name}.json`);
    if(fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file,'utf8'));
      saveTheme(user, data);
      console.log('Theme set to', name);
    } else {
      console.log('Theme not found');
    }
    break;
  case 'buy':
    if(!name){ console.log('Usage: theme-manager.js buy <theme> [user]'); process.exit(1); }
    const cost = 1;
    let tokens = loadTokens(user);
    if(tokens < cost){ console.log('Need 1 token to buy theme'); return; }
    tokens -= cost; saveTokens(user, tokens);
    fs.copyFileSync(path.join('themes',`${name}.json`), path.join(getVaultPath(user),`owned-${name}.json`));
    console.log('Theme purchased:', name);
    break;
  default:
    console.log('Usage: theme-manager.js <set|buy> <theme> [user]');
}
