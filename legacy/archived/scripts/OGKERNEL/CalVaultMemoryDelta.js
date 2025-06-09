// CalVaultMemoryDelta.js — captures and diffs memory state into delta
const fs = require('fs');
const path = require('path');

const vaultFile = path.join(__dirname, 'calVault.json');
const deltaFile = path.join(__dirname, 'CalVaultMemoryDelta.json');

console.log("📊 Capturing vault memory delta...");

function loadVault() {
  return fs.existsSync(vaultFile) ? JSON.parse(fs.readFileSync(vaultFile)) : {};
}

const before = loadVault();
setTimeout(() => {
  const after = loadVault();
  const delta = {
    added: [],
    removed: [],
    changed: []
  };

  for (const key in after) {
    if (!(key in before)) delta.added.push(key);
    else if (JSON.stringify(after[key]) !== JSON.stringify(before[key])) delta.changed.push(key);
  }

  for (const key in before) {
    if (!(key in after)) delta.removed.push(key);
  }

  const result = {
    timestamp: new Date().toISOString(),
    delta
  };

  fs.writeFileSync(deltaFile, JSON.stringify(result, null, 2));
  console.log("✅ Vault delta snapshot saved to CalVaultMemoryDelta.json");
}, 1500);
