const fs = require('fs');
const path = require('path');
const glob = require('glob');
const yaml = require('js-yaml');
const { ensureUser, getVaultPath } = require('../core/user-vault');
const { loadRules } = require('../core/admin-rule-engine');
const { rewardReferral } = require('./referral-handler');
const { parseChatLog } = require('../../kernel-slate/scripts/features/chatlog-utils');

const repoRoot = path.resolve(__dirname, '..', '..');
const logFile = path.join(repoRoot, 'logs', 'legacy-parsing-log.json');
const rebuildDir = path.join(repoRoot, 'docs', 'legacy-idea-rebuilds');
const vaultDir = path.join(repoRoot, 'vault', 'dev-legacy');
fs.mkdirSync(rebuildDir, { recursive: true });
fs.mkdirSync(vaultDir, { recursive: true });

function log(entry) {
  let arr = [];
  if (fs.existsSync(logFile)) { try { arr = JSON.parse(fs.readFileSync(logFile, 'utf8')); } catch {} }
  arr.push(entry);
  fs.writeFileSync(logFile, JSON.stringify(arr, null, 2));
}

function parseLegacy() {
  const ideaFiles = glob.sync('legacy/**/*.idea.yaml');
  const mdFiles = glob.sync('legacy/**/*.md');
  const snapFiles = glob.sync('legacy/**/*.snapshot.json');
  const entries = [];

  for (const f of ideaFiles) {
    const dest = path.join(vaultDir, path.basename(f));
    fs.copyFileSync(f, dest);
    entries.push({ type: 'idea', file: f });
  }

  for (const f of mdFiles) {
    const text = fs.readFileSync(f, 'utf8');
    if (/prompt/i.test(text)) {
      const ideas = parseChatLog(text).map(m => '- ' + m.content).join('\n');
      const out = path.join(rebuildDir, path.basename(f));
      fs.writeFileSync(out, `# Rebuilt from ${f}\n\n${ideas}\n`);
      entries.push({ type: 'md', file: f });
    }
  }

  for (const f of snapFiles) {
    try {
      const data = JSON.parse(fs.readFileSync(f, 'utf8'));
      if (!data.completed) {
        const out = path.join(rebuildDir, path.basename(f, '.snapshot.json') + '.md');
        fs.writeFileSync(out, `# Snapshot rebuild for ${f}\n\nIncomplete snapshot.`);
        entries.push({ type: 'snapshot', file: f });
      }
    } catch {}
  }

  log({ timestamp: new Date().toISOString(), processed: entries.length });
  return entries;
}

if (require.main === module) {
  const user = process.argv[2] || 'dev-legacy';
  ensureUser(user);
  const res = parseLegacy();
  const rules = loadRules();
  const reward = Math.max(rules.min_token_reward || 1, res.length);
  const { loadTokens, saveTokens } = require('../core/user-vault');
  const before = loadTokens(user);
  saveTokens(user, before + reward);
  rewardReferral(user, reward);
  console.log(JSON.stringify({ processed: res.length, reward }, null, 2));
}

module.exports = { parseLegacy };
