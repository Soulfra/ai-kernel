const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const rulePath = path.join(repoRoot, 'rules', 'admin-rules.json');
const logPath = path.join(repoRoot, 'logs', 'admin-events.json');

function defaultRules() {
  return {
    min_token_reward: 1,
    max_token_reward: 50,
    referral_percent: 10,
    export_gate: 1,
    queue_pricing: { priority: 1, background: 0.1 },
    tiers: { free: 0, pro: 10 }
  };
}

function loadRules() {
  let rules = defaultRules();
  if (fs.existsSync(rulePath)) {
    try { rules = { ...rules, ...JSON.parse(fs.readFileSync(rulePath, 'utf8')) }; } catch {}
  }
  return rules;
}

function saveRules(rules) {
  fs.mkdirSync(path.dirname(rulePath), { recursive: true });
  fs.writeFileSync(rulePath, JSON.stringify(rules, null, 2));
}

function logEvent(action, detail) {
  let arr = [];
  if (fs.existsSync(logPath)) { try { arr = JSON.parse(fs.readFileSync(logPath, 'utf8')); } catch {} }
  arr.push({ timestamp: new Date().toISOString(), action, detail });
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.writeFileSync(logPath, JSON.stringify(arr, null, 2));
}

function view() {
  console.log(JSON.stringify(loadRules(), null, 2));
}

function update(pair) {
  const [key, val] = (pair || '').split('=');
  if (!key || val === undefined) {
    console.log('Usage: rules-update key=value');
    return;
  }
  const rules = loadRules();
  let parsed;
  try { parsed = JSON.parse(val); } catch { parsed = isNaN(val) ? val : Number(val); }
  rules[key] = parsed;
  saveRules(rules);
  logEvent('update', { [key]: parsed });
  console.log('updated');
}

if (require.main === module) {
  const cmd = process.argv[2];
  if (cmd === 'view') view();
  else if (cmd === 'update') update(process.argv[3]);
  else console.log('Usage: node admin-rule-engine.js <view|update key=value>');
}

module.exports = { loadRules, saveRules };
