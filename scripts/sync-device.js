const fs = require('fs');
const path = require('path');
const os = require('os');
const { ensureUser, getVaultPath } = require('./core/user-vault');

function syncDevice(user) {
  ensureUser(user);
  const file = path.join(getVaultPath(user), 'devices.json');
  let arr = [];
  if (fs.existsSync(file)) {
    try { arr = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
  }
  const entry = {
    timestamp: new Date().toISOString(),
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch()
  };
  arr.push(entry);
  fs.writeFileSync(file, JSON.stringify(arr, null, 2));
  return entry;
}

if (require.main === module) {
  const user = process.argv[2];
  if (!user) { console.log('Usage: sync-device.js <user>'); process.exit(1); }
  const out = syncDevice(user);
  console.log(JSON.stringify(out, null, 2));
}

module.exports = { syncDevice };
