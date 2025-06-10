const fs = require('fs');
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { ensureUser, getVaultPath, loadTokens, saveTokens } = require('../core/user-vault');
const { rewardReferral } = require('./referral-handler');
const { hasSpentAtLeast } = require('./billing-agent');
const { checkPair } = require('../auth/qr-pairing');
const { reflectVault } = require('../reflect-vault');
const { loadRules } = require('../core/admin-rule-engine');
const { parseChatLog } = require('../../kernel-slate/scripts/features/chatlog-utils');

function unzip(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  spawnSync('unzip', ['-o', src, '-d', dest]);
}

function parseChatDir(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter(f => f.match(/\.\w+$/));
  const messages = [];
  for (const file of files) {
    const full = path.join(dir, file);
    const ext = path.extname(file).toLowerCase();
    let text = '';
    try { text = fs.readFileSync(full, 'utf8'); } catch { continue; }
    if (ext === '.txt' || ext === '.md') {
      messages.push(...parseChatLog(text));
    } else if (ext === '.json') {
      try { const arr = JSON.parse(text); if (Array.isArray(arr)) messages.push(...arr); } catch {}
    }
  }
  return messages;
}

function parseCodeDir(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
  for (const file of files) {
    const full = path.join(dir, file);
    let text = '';
    try { text = fs.readFileSync(full, 'utf8'); } catch { continue; }
    const fn = [...text.matchAll(/function\s+(\w+)/g)].map(m => m[1]);
    out.push({ file, functions: fn });
  }
  return out;
}

function scoreUpload(messages, code) {
  const quality = Math.min(10, (messages.length + code.reduce((s,c)=>s+c.functions.length,0))/5);
  const repoRoot = path.resolve(__dirname, '..', '..');
  const logFile = path.join(repoRoot, 'logs', 'upload-contributions.json');
  let past = [];
  if (fs.existsSync(logFile)) { try { past = JSON.parse(fs.readFileSync(logFile, 'utf8')); } catch {} }
  const hash = crypto.createHash('sha1').update(JSON.stringify(messages)+JSON.stringify(code)).digest('hex');
  const seen = past.find(e => e.hash === hash);
  const novelty = seen ? 0 : 5;
  const depth = Math.min(5, new Set(messages.map(m=>m.role)).size + code.length);
  return { quality, novelty, depth, hash };
}

function logScore(user, score) {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const userFile = path.join(getVaultPath(user), 'contribution-score.json');
  let arr = [];
  if (fs.existsSync(userFile)) { try { arr = JSON.parse(fs.readFileSync(userFile, 'utf8')); } catch {} }
  arr.push({ timestamp: new Date().toISOString(), score });
  fs.mkdirSync(path.dirname(userFile), { recursive: true });
  fs.writeFileSync(userFile, JSON.stringify(arr, null, 2));

  const globalFile = path.join(repoRoot, 'logs', 'upload-contributions.json');
  let g = [];
  if (fs.existsSync(globalFile)) { try { g = JSON.parse(fs.readFileSync(globalFile, 'utf8')); } catch {} }
  g.push({ timestamp: new Date().toISOString(), user, ...score });
  fs.mkdirSync(path.dirname(globalFile), { recursive: true });
  fs.writeFileSync(globalFile, JSON.stringify(g, null, 2));
}

async function uploadRewardAgent(chatZip, codeZip, ideaYaml, user) {
  ensureUser(user);
  const deviceFile = path.join(getVaultPath(user), 'device.json');
  if (!fs.existsSync(deviceFile)) throw new Error('device not registered');
  let device = {};
  try { device = JSON.parse(fs.readFileSync(deviceFile, 'utf8')); } catch {}
  const deviceId = device.qr_uuid || device.device_id;
  if (!deviceId || !checkPair(deviceId)) throw new Error('unpaired device');

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'upload-'));
  const chatDir = path.join(tmp, 'chat');
  const codeDir = path.join(tmp, 'code');
  unzip(chatZip, chatDir);
  unzip(codeZip, codeDir);
  const messages = parseChatDir(chatDir);
  const code = parseCodeDir(codeDir);
  let idea = {};
  if (fs.existsSync(ideaYaml)) {
    try { idea = yaml.load(fs.readFileSync(ideaYaml, 'utf8')) || {}; } catch {}
  }
  const score = scoreUpload(messages, code);
  logScore(user, score);

  const rules = loadRules();
  const reward = Math.max(rules.min_token_reward || 1, Math.min(rules.max_token_reward || 50, Math.round(score.quality + score.novelty + score.depth)));
  const before = loadTokens(user);
  saveTokens(user, before + reward);
  rewardReferral(user, reward);

  const reflect = reflectVault(user);
  const promptDir = path.join(path.resolve(__dirname, '..', '..'), 'vault-prompts', user);
  if (hasSpentAtLeast(user, rules.export_gate || 1)) {
    fs.mkdirSync(promptDir, { recursive: true });
    fs.writeFileSync(path.join(promptDir, 'new-suggestions.json'), JSON.stringify(reflect, null, 2));
  }

  return { score, reward };
}

if (require.main === module) {
  const [chatZip, codeZip, ideaYaml, user] = process.argv.slice(2);
  if (!chatZip || !codeZip || !ideaYaml || !user) {
    console.log('Usage: node upload-reward-agent.js <chatlog.zip> <code.zip> <idea.yaml> <user>');
    process.exit(1);
  }
  uploadRewardAgent(chatZip, codeZip, ideaYaml, user)
    .then(r => console.log(JSON.stringify(r, null, 2)))
    .catch(e => { console.error(e.message); process.exit(1); });
}

module.exports = { uploadRewardAgent };
