const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const repoRoot = path.resolve(__dirname, '..', '..');
const logFile = path.join(repoRoot, 'logs', 'qr-auth-pairings.json');

function getFingerprint() {
  const raw = os.hostname() + os.platform() + os.arch();
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 12);
}

function record(entry) {
  let arr = [];
  if (fs.existsSync(logFile)) {
    try { arr = JSON.parse(fs.readFileSync(logFile, 'utf8')); } catch {}
  }
  arr.push(entry);
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  fs.writeFileSync(logFile, JSON.stringify(arr, null, 2));
}

function generateQR() {
  const id = crypto.createHash('sha256')
    .update(getFingerprint() + Date.now())
    .digest('hex')
    .slice(0, 12);
  const uri = `/pair?id=${id}`;
  record({ timestamp: new Date().toISOString(), event: 'generate', id });
  return { id, uri };
}

function pair(id, referrer) {
  const vaultDir = path.join(repoRoot, 'vault', `qr-${id}`);
  fs.mkdirSync(vaultDir, { recursive: true });
  if (referrer) {
    const refFile = path.join(vaultDir, 'referrer.json');
    fs.writeFileSync(refFile, JSON.stringify({ referrer, rewarded: false }, null, 2));
    const { ensureUser } = require('../core/user-vault');
    ensureUser(referrer);
    const rlog = path.join(repoRoot, 'vault', referrer, 'referrals.json');
    let rarr = [];
    if (fs.existsSync(rlog)) {
      try { rarr = JSON.parse(fs.readFileSync(rlog, 'utf8')); } catch {}
    }
    rarr.push({ timestamp: new Date().toISOString(), newUser: id });
    fs.writeFileSync(rlog, JSON.stringify(rarr, null, 2));
    const refEvents = path.join(repoRoot, 'logs', 'referral-events.json');
    let ev = [];
    if (fs.existsSync(refEvents)) { try { ev = JSON.parse(fs.readFileSync(refEvents, 'utf8')); } catch {} }
    ev.push({ timestamp: new Date().toISOString(), referrer, newUser: id, event: 'scan' });
    fs.writeFileSync(refEvents, JSON.stringify(ev, null, 2));
  }
  record({ timestamp: new Date().toISOString(), event: 'pair', id, referrer: referrer || null });
}

function checkPair(id) {
  const vaultDir = path.join(repoRoot, 'vault', `qr-${id}`);
  return fs.existsSync(vaultDir);
}

module.exports = { generateQR, pair, checkPair };
