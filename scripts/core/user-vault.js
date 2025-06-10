const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const vaultRoot = path.join(repoRoot, 'vault');

function getVaultPath(user) {
  return path.join(vaultRoot, user);
}

function getSettingsPath(user) {
  return path.join(getVaultPath(user), 'settings.json');
}

function ensureSettings(user) {
  const sp = getSettingsPath(user);
  if (!fs.existsSync(sp)) {
    fs.writeFileSync(sp, JSON.stringify({ commission_rate: 10, referrer_id: null }, null, 2));
  }
}

function loadSettings(user) {
  ensureSettings(user);
  try { return JSON.parse(fs.readFileSync(getSettingsPath(user), 'utf8')); } catch { return { commission_rate: 10, referrer_id: null }; }
}

function logEarnings(user, entry) {
  ensureUser(user);
  const file = path.join(getVaultPath(user), 'earnings.json');
  let arr = [];
  if (fs.existsSync(file)) {
    try { arr = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
  }
  arr.push(entry);
  fs.writeFileSync(file, JSON.stringify(arr, null, 2));
}

function ensureUser(user) {
  const base = getVaultPath(user);
  fs.mkdirSync(path.join(base, 'ideas'), { recursive: true });
  ensureSettings(user);
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

  try {
    const settings = loadSettings(user);
    if (settings.referrer_id) {
      const rate = Number(settings.commission_rate) || 10;
      const spent = entry.tokens_used || entry.cost || 0;
      if (spent > 0) {
        const reward = Math.ceil((spent * rate) / 100);
        if (reward > 0) {
          const referrer = settings.referrer_id;
          ensureUser(referrer);
          const current = loadTokens(referrer);
          saveTokens(referrer, current + reward);
          logEarnings(referrer, {
            timestamp: new Date().toISOString(),
            from: user,
            tokens: reward,
            usage: spent
          });
        }
      }
    }
  } catch {}
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

  // referral reward check
  const refFile = path.join(getVaultPath(user), 'referrer.json');
  if (fs.existsSync(refFile)) {
    try {
      const refData = JSON.parse(fs.readFileSync(refFile, 'utf8'));
      if (refData.referrer && !refData.rewarded && amount > 0) {
        const referrer = refData.referrer;
        ensureUser(referrer);
        const refTokens = loadTokens(referrer) + 1;
        saveTokens(referrer, refTokens);
        const rfile = path.join(getVaultPath(referrer), 'referrals.json');
        let arr = [];
        if (fs.existsSync(rfile)) { try { arr = JSON.parse(fs.readFileSync(rfile,'utf8')); } catch {} }
        arr.push({ timestamp: new Date().toISOString(), newUser: user, reward: 1, deposit: amount });
        fs.writeFileSync(rfile, JSON.stringify(arr, null, 2));
        const logPath = path.join(repoRoot, 'logs', 'referral-events.json');
        let events = [];
        if (fs.existsSync(logPath)) { try { events = JSON.parse(fs.readFileSync(logPath,'utf8')); } catch {} }
        events.push({ timestamp: new Date().toISOString(), referrer, newUser: user, event: 'reward' });
        fs.writeFileSync(logPath, JSON.stringify(events, null, 2));
        refData.rewarded = true;
        fs.writeFileSync(refFile, JSON.stringify(refData, null, 2));
      }
    } catch {}
  }
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
  status,
  loadSettings,
  logEarnings
};
