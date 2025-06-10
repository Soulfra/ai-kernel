const fs = require('fs');
const path = require('path');
const { ensureUser, getVaultPath, loadTokens } = require('./core/user-vault');

function record(file, entry) {
  let arr = [];
  if (fs.existsSync(file)) { try { arr = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {} }
  arr.push(entry);
  fs.writeFileSync(file, JSON.stringify(arr, null, 2));
}

function loadSubscription(user) {
  const file = path.join(getVaultPath(user), 'subscription.json');
  let sub = { plan: 'free' };
  if (fs.existsSync(file)) { try { sub = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {} }
  return sub;
}

function shouldScan(user) {
  const sub = loadSubscription(user);
  const historyFile = path.join(getVaultPath(user), 'scan-history.json');
  let arr = [];
  if (fs.existsSync(historyFile)) { try { arr = JSON.parse(fs.readFileSync(historyFile, 'utf8')); } catch {} }
  const last = arr[arr.length - 1];
  if (!last) return true;
  const elapsed = Date.now() - new Date(last.timestamp).getTime();
  if (sub.plan === 'free') return elapsed > 24 * 60 * 60 * 1000;
  return true;
}

function scanUsageSummary(user) {
  ensureUser(user);
  if (!shouldScan(user)) return false;
  const base = getVaultPath(user);
  const usageFile = path.join(base, 'usage.json');
  let usage = [];
  if (fs.existsSync(usageFile)) { try { usage = JSON.parse(fs.readFileSync(usageFile, 'utf8')); } catch {} }
  const summary = {
    timestamp: new Date().toISOString(),
    actions: usage.length,
    tokens: loadTokens(user)
  };
  fs.writeFileSync(path.join(base, 'daily-summary.json'), JSON.stringify(summary, null, 2));
  record(path.join(base, 'scan-history.json'), summary);
  return true;
}

if (require.main === module) {
  const user = process.argv[2];
  if (!user) { console.log('Usage: scan-usage-summary.js <user>'); process.exit(1); }
  scanUsageSummary(user);
}

module.exports = { scanUsageSummary };
