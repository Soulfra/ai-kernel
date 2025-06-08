// Captures before/after vault delta snapshots
const fs = require('fs');
const path = require('path');

const vaultFile = path.join(__dirname, '../core/calVault.json');
const snapshotFile = path.join(__dirname, '../core/vault_delta_snapshot.json');

function loadVault() {
  return fs.existsSync(vaultFile) ? JSON.parse(fs.readFileSync(vaultFile)) : {};
}

function captureDelta(before, after) {
  const delta = { added: [], removed: [], changed: [] };
  for (const key in after) {
    if (!(key in before)) delta.added.push(key);
    else if (JSON.stringify(after[key]) !== JSON.stringify(before[key])) delta.changed.push(key);
  }
  for (const key in before) {
    if (!(key in after)) delta.removed.push(key);
  }
  return delta;
}

function runDeltaCheck() {
  const before = loadVault();
  setTimeout(() => {
    const after = loadVault();
    const delta = captureDelta(before, after);
    fs.writeFileSync(snapshotFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      delta
    }, null, 2));
    console.log("✅ CalVaultMemoryDelta: snapshot delta written.");
  }, 2000); // wait to simulate before/after snapshot
}

runDeltaCheck();