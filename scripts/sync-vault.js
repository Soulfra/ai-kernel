const fs = require('fs');
const path = require('path');
const { ensureUser, getVaultPath } = require('./core/user-vault');

function syncVault(user) {
  ensureUser(user);
  const base = getVaultPath(user);
  const deviceFile = path.join(base, 'device.json');
  let data = { qr_uuid: null, geo_tag: null, last_sync: null, os: null };
  if (fs.existsSync(deviceFile)) {
    try { data = JSON.parse(fs.readFileSync(deviceFile, 'utf8')); } catch {}
  }
  data.last_sync = new Date().toISOString();
  fs.writeFileSync(deviceFile, JSON.stringify(data, null, 2));

  const logFile = path.join(__dirname, '..', 'logs', 'mobile-sync-history.json');
  let arr = [];
  if (fs.existsSync(logFile)) {
    try { arr = JSON.parse(fs.readFileSync(logFile, 'utf8')); } catch {}
  }
  arr.push({ timestamp: data.last_sync, user, os: data.os || null });
  fs.writeFileSync(logFile, JSON.stringify(arr, null, 2));
  return data;
}

if (require.main === module) {
  const user = process.argv[2];
  if (!user) {
    console.log('Usage: sync-vault.js <user>');
    process.exit(1);
  }
  const res = syncVault(user);
  console.log(JSON.stringify(res, null, 2));
}

module.exports = { syncVault };
