const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { generateQR } = require('../auth/qr-pairing');
const { ensureUser, deposit } = require('../core/user-vault');

async function init() {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const vaultRoot = path.join(repoRoot, 'vault');
  if (fs.existsSync(vaultRoot) && fs.readdirSync(vaultRoot).length) return false;
  const { id, uri } = generateQR();
  console.log('Scan this QR or visit:', uri);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = q => new Promise(r => rl.question(q, a => r(a)));
  const amount = parseInt(await ask('Deposit tokens: '), 10) || 0;
  rl.close();
  ensureUser(id);
  if (amount > 0) deposit(id, amount);
  const logFile = path.join(repoRoot, 'logs', 'init-log.json');
  let arr = [];
  if (fs.existsSync(logFile)) { try { arr = JSON.parse(fs.readFileSync(logFile, 'utf8')); } catch {} }
  arr.push({ timestamp: new Date().toISOString(), user: id, amount });
  fs.writeFileSync(logFile, JSON.stringify(arr, null, 2));
  return true;
}

if (require.main === module) {
  init().catch(err => { console.error(err); process.exit(1); });
}

module.exports = { init };
