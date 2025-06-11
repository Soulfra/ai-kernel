#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { ensureUser, getVaultPath, loadTokens, saveTokens } = require('./core/user-vault');
const { loadRules } = require('./core/admin-rule-engine');

const repoRoot = path.resolve(__dirname, '..');

function setThemeName(user, name) {
  ensureUser(user);
  const rules = loadRules();
  const cost = rules.vault_theme_tokens ? rules.vault_theme_tokens.skin_change : 0;
  const tokens = loadTokens(user);
  if (tokens < cost) throw new Error('Insufficient tokens');
  saveTokens(user, tokens - cost);
  const themeFile = path.join(getVaultPath(user), 'theme.json');
  let data = {};
  if (fs.existsSync(themeFile)) { try { data = JSON.parse(fs.readFileSync(themeFile, 'utf8')); } catch {} }
  data.guide_name = name;
  fs.mkdirSync(path.dirname(themeFile), { recursive: true });
  fs.writeFileSync(themeFile, JSON.stringify(data, null, 2));
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
  console.log(JSON.stringify({ user, name, tokens: tokens - cost }, null, 2));
}

if (require.main === module) {
  const user = process.argv[2];
  const name = process.argv[3];
  if (!user || !name) {
    console.log('Usage: node vault-theme.js <user> <name>');
    process.exit(1);
  }
  try {
    setThemeName(user, name);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

module.exports = { setThemeName };
