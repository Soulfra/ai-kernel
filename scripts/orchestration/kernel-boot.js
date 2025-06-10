const fs = require('fs');
const path = require('path');
const { ensureUser, getVaultPath, loadSettings, loadTokens, logUsage } = require('../core/user-vault');
const { reflectVault } = require('../reflect-vault');
const { runIdea } = require('../idea-runner');

function writeJson(file, data) {
  let arr = [];
  if (fs.existsSync(file)) {
    try { arr = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
  }
  arr.push(data);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(arr, null, 2));
}

function loadFreePrompts(user) {
  const file = path.join(getVaultPath(user), 'free_prompts_remaining.json');
  if (fs.existsSync(file)) {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')).count || 0; } catch {}
  }
  return 0;
}

function createSummary(user) {
  const base = getVaultPath(user);
  const usageFile = path.join(base, 'usage.json');
  let usage = [];
  if (fs.existsSync(usageFile)) { try { usage = JSON.parse(fs.readFileSync(usageFile, 'utf8')); } catch {} }
  const tokens = loadTokens(user);
  const summary = {
    timestamp: new Date().toISOString(),
    tokens,
    usage_count: usage.length,
    last_action: usage.length ? usage[usage.length - 1].action : null
  };
  fs.writeFileSync(path.join(base, 'daily-summary.json'), JSON.stringify(summary, null, 2));
  const docDir = path.join(__dirname, '..', '..', 'docs', 'vault');
  fs.mkdirSync(docDir, { recursive: true });
  const md = `# Daily Summary for ${user}\n\n- Tokens: ${tokens}\n- Total actions: ${usage.length}\n- Last action: ${summary.last_action || 'n/a'}\n`;
  fs.writeFileSync(path.join(docDir, `${user}-summary.md`), md);
}

async function kernelBoot(user) {
  if (!user) return false;
  ensureUser(user);
  const vaultPath = getVaultPath(user);
  const settingsPath = path.join(vaultPath, 'settings.json');
  const denialLog = path.join(__dirname, '..', '..', 'logs', 'kernel-boot-denial.json');

  const deny = reason => {
    console.log('Vault blocked:', reason);
    writeJson(denialLog, { timestamp: new Date().toISOString(), user, reason });
  };

  if (!fs.existsSync(settingsPath)) return deny('missing settings.json');
  const settings = loadSettings(user);
  const tokens = loadTokens(user);
  const free = loadFreePrompts(user);
  if (tokens < 0) return deny('negative token balance');
  if (tokens === 0 && free <= 0) return deny('no token or free prompts');
  if (settings.unpaid_balance > 0) return deny('unpaid balance');
  if (settings.soft_limit && tokens < settings.soft_limit) return deny('soft limit exceeded');

  const reflection = reflectVault(user);
  if (reflection && reflection.promote_next) {
    const ideaPath = path.join(vaultPath, 'ideas', `${reflection.promote_next}.idea.yaml`);
    if (fs.existsSync(ideaPath)) {
      await runIdea(ideaPath, 'boot', user).catch(err => console.error(err.message));
    }
  }

  logUsage(user, { timestamp: new Date().toISOString(), action: 'kernel-boot', tokens_used: 0, remaining_tokens: tokens });
  createSummary(user);
  return true;
}

if (require.main === module) {
  const user = process.argv[2];
  kernelBoot(user);
}

module.exports = kernelBoot;
