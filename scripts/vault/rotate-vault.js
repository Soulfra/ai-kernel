#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const minimist = require('minimist');
const { ensureUser, getVaultPath } = require('../core/user-vault');

function rotateVault(user, reason='rotation') {
  ensureUser(user);
  const repoRoot = path.resolve(__dirname, '..', '..');
  const vaultRoot = path.join(repoRoot, 'vault');
  const base = getVaultPath(user);

  const existing = fs.readdirSync(vaultRoot).filter(d => d.startsWith(user + '-'));
  const versions = existing.map(d => Number(d.split('-')[1])).filter(v => !isNaN(v));
  const newVersion = versions.length ? Math.max(...versions) + 1 : 1;

  const versionDir = path.join(vaultRoot, `${user}-${newVersion}`);
  if (fs.existsSync(base)) fs.renameSync(base, versionDir);

  const ghostRoot = path.join(repoRoot, 'ghost');
  fs.mkdirSync(ghostRoot, { recursive: true });
  for (const d of existing) {
    const src = path.join(vaultRoot, d);
    if (fs.existsSync(src)) fs.renameSync(src, path.join(ghostRoot, d));
  }

  fs.mkdirSync(base, { recursive: true });
  ['tokens.json', 'usage.json', 'glyph-summary.md'].forEach(f => {
    const src = path.join(versionDir, f);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(base, f));
  });

  const lineagePath = path.join(base, 'lineage.json');
  let lineage = [];
  if (fs.existsSync(lineagePath)) { try { lineage = JSON.parse(fs.readFileSync(lineagePath,'utf8')); } catch {} }
  lineage.push({ version: newVersion, parent: newVersion-1 || null, reason, timestamp: new Date().toISOString() });
  fs.writeFileSync(lineagePath, JSON.stringify(lineage, null, 2));

  const logFile = path.join(repoRoot, 'logs', 'vault-rotations.json');
  let log = [];
  if (fs.existsSync(logFile)) { try { log = JSON.parse(fs.readFileSync(logFile,'utf8')); } catch {} }
  log.push({ user, version: newVersion, reason, timestamp: new Date().toISOString() });
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  fs.writeFileSync(logFile, JSON.stringify(log, null, 2));
  return { user, version: newVersion };
}

if (require.main === module) {
  const args = minimist(process.argv.slice(2));
  const user = args.user || args._[0];
  if (!user) { console.log('Usage: rotate-vault.js --user <id> [--reason <text>]'); process.exit(1); }
  const reason = args.reason || 'rotation';
  const res = rotateVault(user, reason);
  console.log(JSON.stringify(res, null, 2));
}

module.exports = { rotateVault };
