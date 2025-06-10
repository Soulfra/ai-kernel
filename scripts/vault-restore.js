const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

function restoreVault(file) {
  const repoRoot = path.resolve(__dirname, '..');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const newId = randomUUID().slice(0,8);
  const base = path.join(repoRoot, 'vault', newId);
  fs.mkdirSync(base, { recursive: true });
  for (const [p, content] of Object.entries(data.files || {})) {
    const fp = path.join(base, p);
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    fs.writeFileSync(fp, content);
  }
  fs.writeFileSync(path.join(base,'device.json'), JSON.stringify({ restored_from: data.user, paired: false }, null, 2));
  return newId;
}

if (require.main === module) {
  const file = process.argv[2];
  if (!file) { console.log('Usage: vault-restore.js <snapshot.json>'); process.exit(1); }
  const id = restoreVault(file);
  console.log('restored to', id);
}

module.exports = { restoreVault };
