#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { ProviderRouter } = require('./core/provider-router');
const { ensureUser, getVaultPath } = require('./core/user-vault');

function readJson(p){ try { return JSON.parse(fs.readFileSync(p,'utf8')); } catch { return []; } }

async function main() {
  const user = process.argv[2];
  if (!user) { console.log('Usage: node session-summary.js <user>'); process.exit(1); }
  ensureUser(user);
  const repoRoot = path.resolve(__dirname, '..');
  const base = getVaultPath(user);
  const usage = readJson(path.join(base,'usage.json'));
  const router = new ProviderRouter();
  const prompt = `Summarize this session:\n${JSON.stringify(usage).slice(0,2000)}`;
  const { text } = await router.callAnthropic(prompt);
  const docDir = path.join(repoRoot,'docs','vault-summaries');
  fs.mkdirSync(docDir,{recursive:true});
  const mdPath = path.join(docDir, `${user}-summary.md`);
  fs.writeFileSync(mdPath, text);
  const logFile = path.join(repoRoot,'logs','session-summary.json');
  let arr = readJson(logFile); arr.push({ timestamp:new Date().toISOString(), user });
  fs.writeFileSync(logFile, JSON.stringify(arr, null, 2));
  const zipDir = path.join(repoRoot,'build');
  fs.mkdirSync(zipDir,{recursive:true});
  const zipPath = path.join(zipDir, `vault-session-${user}.zip`);
  spawnSync('zip',['-r',zipPath, base]);
  console.log('Summary written to', mdPath);
}

if (require.main===module){ main().catch(err=>{ console.error(err); process.exit(1); }); }

module.exports = { main };
