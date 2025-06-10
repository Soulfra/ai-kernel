const fs = require('fs');
const path = require('path');
const { ensureUser, getVaultPath, loadTokens, saveTokens } = require('../core/user-vault');

function rewardReferral(user, amount) {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const settingsPath = path.join(getVaultPath(user), 'settings.json');
  if (!fs.existsSync(settingsPath)) return;
  let settings = {};
  try { settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')); } catch {}
  const referrer = settings.referrer_id;
  if (!referrer || amount < 1) return;

  const deviceFile = path.join(getVaultPath(user), 'device.json');
  let deviceId = null;
  if (fs.existsSync(deviceFile)) {
    try { const d = JSON.parse(fs.readFileSync(deviceFile, 'utf8')); deviceId = d.qr_uuid || d.device_id || null; } catch {}
  }
  ensureUser(referrer);
  const earnFile = path.join(getVaultPath(referrer), 'earnings.json');
  let arr = [];
  if (fs.existsSync(earnFile)) { try { arr = JSON.parse(fs.readFileSync(earnFile, 'utf8')); } catch {} }
  if (deviceId && arr.find(e => e.device_id === deviceId)) return;
  const reward = 10;
  const before = loadTokens(referrer);
  saveTokens(referrer, before + reward);
  arr.push({ timestamp: new Date().toISOString(), from: user, tokens: reward, device_id: deviceId, spent: amount });
  fs.writeFileSync(earnFile, JSON.stringify(arr, null, 2));
}

module.exports = { rewardReferral };
