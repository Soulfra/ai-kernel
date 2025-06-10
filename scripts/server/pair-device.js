const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { ensureUser } = require('../core/user-vault');

function fingerprint() {
  const raw = os.hostname() + os.platform() + os.arch();
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0,12);
}

function pair(user) {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const id = fingerprint();
  ensureUser(user);
  const entry = { timestamp: new Date().toISOString(), user, id };
  const logFile = path.join(repoRoot, 'logs', 'device-sync-history.json');
  let arr = [];
  if (fs.existsSync(logFile)) { try { arr = JSON.parse(fs.readFileSync(logFile,'utf8')); } catch {} }
  arr.push(entry);
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  fs.writeFileSync(logFile, JSON.stringify(arr, null, 2));
  const deviceFile = path.join(repoRoot, 'vault', user, 'devices.json');
  let devArr = [];
  if (fs.existsSync(deviceFile)) { try { devArr = JSON.parse(fs.readFileSync(deviceFile,'utf8')); } catch {} }
  devArr.push(entry);
  fs.mkdirSync(path.dirname(deviceFile), { recursive: true });
  fs.writeFileSync(deviceFile, JSON.stringify(devArr, null, 2));
  console.log(JSON.stringify({ paired: true, user, id }, null, 2));
}

if (require.main === module) {
  const user = process.argv[2];
  if (!user) { console.log('Usage: node pair-device.js <user>'); process.exit(1); }
  pair(user);
}

module.exports = { pair };
