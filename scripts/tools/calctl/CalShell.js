const fs = require('fs');
const readline = require('readline');
const path = require('path');

const tokenPath = './tokenLedger.json';
const licensePath = './license.cal';

let tokens = 0;
let licenseValid = false;

try {
  const tokenData = JSON.parse(fs.readFileSync(tokenPath));
  tokens = tokenData.tokens || 0;
} catch {}

try {
  const licenseData = JSON.parse(fs.readFileSync(licensePath));
  if (licenseData && licenseData.grantedBy) {
    licenseValid = true;
  }
} catch {}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'cal> '
});

console.log('🧠 CalShell v1.0.1 (Protected) Initialized');
console.log(`🎟️ Tokens: ${tokens} | License: ${licenseValid ? '✅ Valid' : '❌ None'}`);
rl.prompt();

rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return rl.prompt();

  const [cmd, ...args] = trimmed.split(' ');

  if (['certify', 'seal', 'publish', 'deck'].includes(cmd) && tokens === 0 && !licenseValid) {
    console.log('💸 Not enough tokens or valid license. Run: calctl-tokens-topup.js or load license.cal');
    return rl.prompt();
  }

  try {
    const filePath = `./calctl-${cmd}.js`;
    if (!fs.existsSync(filePath)) {
      console.log(`❌ Unknown command: ${cmd}`);
      return rl.prompt();
    }
    const run = require(filePath);
    if (typeof run === 'function') {
      run(...args);
    } else {
      console.log('⚠️ Module loaded but is not a callable function.');
    }
  } catch (err) {
    console.error(`❌ Error running command '${cmd}':`, err.message);
  }

  rl.prompt();
});