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
  const outDir = path.join(repoRoot, 'snapshots');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, `${user}-vault.json`), JSON.stringify({ user, timestamp: new Date().toISOString(), files: data }, null, 2));
  const docDir = path.join(repoRoot, 'docs', 'vault');
  fs.mkdirSync(docDir, { recursive: true });
  const md = `# Vault Snapshot for ${user}\n\nFiles: ${files.length}\nTimestamp: ${new Date().toISOString()}\n`;
  fs.writeFileSync(path.join(docDir, `${user}-summary.md`), md);
}

if (require.main === module) {
  const user = process.argv[2];
  if (!user) { console.log('Usage: vault-snapshot.js <user>'); process.exit(1); }
  snapshotVault(user);
}

module.exports = { snapshotVault };
