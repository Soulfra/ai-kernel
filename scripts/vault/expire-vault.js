#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const minimist = require('minimist');
const { ensureUser, getVaultPath } = require('../core/user-vault');

function parseDuration(str='7d') {
  const m = str.match(/(\d+)([dhm])/); if(!m) return 0;
  const n = parseInt(m[1],10); const u=m[2];
  if(u==='d') return n*24*60*60*1000;
  if(u==='h') return n*60*60*1000;
  if(u==='m') return n*60*1000; return n;
}

function loadSettings(base) {
  const file = path.join(base,'settings.json');
  let data = {};
  if (fs.existsSync(file)) { try { data = JSON.parse(fs.readFileSync(file,'utf8')); } catch {} }
  return data;
}

function lastUsage(base) {
  const file = path.join(base,'usage.json');
  if (!fs.existsSync(file)) return Date.now();
  try {
    const arr = JSON.parse(fs.readFileSync(file,'utf8'));
    if (arr.length) return new Date(arr[arr.length-1].timestamp).getTime();
  } catch {}
  return Date.now();
}

function isExpired(user) {
  ensureUser(user);
  const base = getVaultPath(user);
  const settings = loadSettings(base);
  const ttl = parseDuration(settings.expires_after || '7d');
  const age = Date.now() - lastUsage(base);
  return age > ttl;
}

function expireVault(user) {
  if (!isExpired(user)) return null;
  const repoRoot = path.resolve(__dirname,'..','..');
  const base = getVaultPath(user);
  const ghostRoot = path.join(repoRoot,'ghost');
  fs.mkdirSync(ghostRoot,{ recursive: true });
  const gid = `${user}-${Date.now()}`;
  fs.renameSync(base, path.join(ghostRoot,gid));
  const logFile = path.join(repoRoot,'logs','vault-expirations.json');
  let arr=[]; if(fs.existsSync(logFile)){ try{ arr=JSON.parse(fs.readFileSync(logFile,'utf8')); }catch{} }
  arr.push({ user, ghost: gid, timestamp: new Date().toISOString() });
  fs.writeFileSync(logFile, JSON.stringify(arr,null,2));
  return gid;
}

function recallVault(id) {
  const repoRoot = path.resolve(__dirname,'..','..');
  const ghostPath = path.join(repoRoot,'ghost', id);
  const user = id.split('-')[0];
  const base = getVaultPath(user);
  if (!fs.existsSync(ghostPath)) return null;
  if (fs.existsSync(base)) { console.log('vault exists'); return null; }
  fs.renameSync(ghostPath, base);
  return base;
}

if(require.main===module){
  const argv=minimist(process.argv.slice(2));
  const cmd=argv._[0];
  if(cmd==='expire'){
    const user=argv.user; if(!user){console.log('Usage: expire-vault.js expire --user <id>');process.exit(1);} const id=expireVault(user); console.log(id?`expired ${id}`:'not expired');
  } else if(cmd==='recall'){
    const ghost=argv.ghost; if(!ghost){console.log('Usage: expire-vault.js recall --ghost <id>');process.exit(1);} const res=recallVault(ghost); console.log(res?`restored ${ghost}`:'not found');
  } else { console.log('Usage: expire-vault.js <expire|recall> --user <id>'); }
}

module.exports={expireVault, recallVault, isExpired};
