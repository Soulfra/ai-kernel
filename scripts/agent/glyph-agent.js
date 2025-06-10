const fs = require('fs');
const path = require('path');
const { ensureUser, getVaultPath, loadTokens, saveTokens } = require('../core/user-vault');
const { loadRules } = require('../core/admin-rule-engine');

const repoRoot = path.resolve(__dirname, '..', '..');

function themePath(user) {
  return path.join(getVaultPath(user), 'theme.json');
}

function loadTheme(user) {
  ensureUser(user);
  const rules = loadRules();
  const file = themePath(user);
  let data = {};
  if (fs.existsSync(file)) { try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {} }
  return Object.assign({
    guide_name: rules.default_guide_name || 'Cal Riven',
    companion: rules.companion_name || 'Arty',
    style: 'soft markdown',
    voice: 'text'
  }, data);
}

function saveTheme(user, data) {
  fs.mkdirSync(path.dirname(themePath(user)), { recursive: true });
  fs.writeFileSync(themePath(user), JSON.stringify(data, null, 2));
}

function logAdmin(event) {
  const adminFile = path.join(repoRoot, 'rules', 'admin-rules.json');
  let admin = loadRules();
  if (!Array.isArray(admin.guide_log)) admin.guide_log = [];
  admin.guide_log.push(event);
  fs.writeFileSync(adminFile, JSON.stringify(admin, null, 2));
}

function speak(user, message, opts = {}) {
  const theme = loadTheme(user);
  const alias = opts.alias || theme.guide_name;
  const tone = opts.tone || 'neutral';
  const out = `**${alias}**:\n_"${message}"_`;
  logAdmin({ timestamp: new Date().toISOString(), user, tone, alias });
  saveTheme(user, Object.assign({}, theme, { tone }));
  return out;
}

function companion(user, message) {
  const theme = loadTheme(user);
  const alias = theme.companion || 'Arty';
  const file = path.join(getVaultPath(user), 'companion-history.json');
  let arr = [];
  if (fs.existsSync(file)) { try { arr = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {} }
  arr.push({ timestamp: new Date().toISOString(), message });
  fs.writeFileSync(file, JSON.stringify(arr, null, 2));
  return `**${alias}**: _"${message}"_`;
}

function setName(user, name) {
  const rules = loadRules();
  const cost = rules.vault_theme_tokens ? rules.vault_theme_tokens.skin_change : 0;
  const tokens = loadTokens(user);
  if (tokens < cost) throw new Error('Insufficient tokens');
  saveTokens(user, tokens - cost);
  const theme = loadTheme(user);
  theme.guide_name = name;
  saveTheme(user, theme);
  const histFile = path.join(getVaultPath(user), 'theme-history.json');
  let hist = [];
  if (fs.existsSync(histFile)) { try { hist = JSON.parse(fs.readFileSync(histFile, 'utf8')); } catch {} }
  hist.push({ timestamp: new Date().toISOString(), name, cost });
  fs.writeFileSync(histFile, JSON.stringify(hist, null, 2));
  const logFile = path.join(repoRoot, 'logs', 'theme-economy.json');
  let log = [];
  if (fs.existsSync(logFile)) { try { log = JSON.parse(fs.readFileSync(logFile, 'utf8')); } catch {} }
  log.push({ timestamp: new Date().toISOString(), user, name, cost });
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  fs.writeFileSync(logFile, JSON.stringify(log, null, 2));
  console.log(`Guide name set to ${name}`);
}

if (require.main === module) {
  const [cmd, user, ...rest] = process.argv.slice(2);
  if (cmd === 'speak') {
    const message = rest.join(' ');
    if (!user || !message) { console.log('Usage: glyph-agent.js speak <user> <message>'); process.exit(1); }
    console.log(speak(user, message));
  } else if (cmd === 'set') {
    const name = rest.join(' ');
    if (!user || !name) { console.log('Usage: glyph-agent.js set <user> <name>'); process.exit(1); }
    try { setName(user, name); } catch (err) { console.error(err.message); process.exit(1); }
  } else {
    console.log('Usage: glyph-agent.js <speak|set> <user> <text>');
    process.exit(1);
  }
}

module.exports = { speak, setName, companion, loadTheme, saveTheme };
