const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const vaultRoot = path.join(repoRoot, 'vault');

function getVaultPath(user) {
  return path.join(vaultRoot, user);
}

function ensureUser(user) {
  const base = getVaultPath(user);
  fs.mkdirSync(path.join(base, 'ideas'), { recursive: true });
  const tokenFile = path.join(base, 'tokens.json');
  const usageFile = path.join(base, 'usage.json');
  if (!fs.existsSync(tokenFile)) {
    fs.writeFileSync(tokenFile, JSON.stringify({ tokens: 0 }, null, 2));
  }
  if (!fs.existsSync(usageFile)) {
    fs.writeFileSync(usageFile, '[]');
  }
}

function loadTokens(user) {
  ensureUser(user);
  try {
    const data = JSON.parse(fs.readFileSync(path.join(getVaultPath(user), 'tokens.json'), 'utf8'));
    return data.tokens || 0;
  } catch {
    return 0;
  }
}

function saveTokens(user, tokens) {
  ensureUser(user);
  fs.writeFileSync(path.join(getVaultPath(user), 'tokens.json'), JSON.stringify({ tokens }, null, 2));
}

function logUsage(user, entry) {
  ensureUser(user);
  const file = path.join(getVaultPath(user), 'usage.json');
  let arr = [];
  if (fs.existsSync(file)) {
    try { arr = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
  }
  arr.push(entry);
  fs.writeFileSync(file, JSON.stringify(arr, null, 2));
}

function loadEnv(user) {
  const file = path.join(getVaultPath(user), 'env.json');
  if (fs.existsSync(file)) {
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      Object.entries(data).forEach(([k, v]) => {
        if (!process.env[k]) process.env[k] = v;
      });
    } catch {}
  }
}

function deposit(user, amount) {
  const tokens = loadTokens(user) + amount;
  saveTokens(user, tokens);
}

function status(user) {
  return { tokens: loadTokens(user) };
}

module.exports = {
  getVaultPath,
  ensureUser,
  loadTokens,
  saveTokens,
  logUsage,
  loadEnv,
  deposit,
  status
};
