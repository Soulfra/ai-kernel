const fs = require('fs');
const path = require('path');
const glob = require('glob');
const { getVaultPath, ensureUser } = require('./core/user-vault');

function snapshotVault(user) {
  ensureUser(user);
  const repoRoot = path.resolve(__dirname, '..');
  const base = getVaultPath(user);
  const files = glob.sync('**/*', { cwd: base, nodir: true });
  const data = {};
  for (const f of files) {
    const p = path.join(base, f);
    try { data[f] = fs.readFileSync(p, 'utf8'); } catch {}
  }
  const outDir = path.join(repoRoot, 'vault-backups');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${user}-snapshot.json`);
  fs.writeFileSync(outFile, JSON.stringify({ user, timestamp: new Date().toISOString(), files: data }, null, 2));
  return outFile;
}

if (require.main === module) {
  const user = process.argv[2];
  if (!user) { console.log('Usage: vault-snapshot.js <user>'); process.exit(1); }
  snapshotVault(user);
}

module.exports = { snapshotVault };
