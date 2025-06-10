const fs = require('fs');
const path = require('path');
const { getVaultPath, ensureUser, loadTokens, saveTokens } = require('../core/user-vault');
const { estimatePromptCost } = require('./cost-estimator');
const { rewardReferral } = require('./referral-handler');

function record(file, entry) {
  let arr = [];
  if (fs.existsSync(file)) { try { arr = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {} }
  arr.push(entry);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(arr, null, 2));
}

function loadSubscription(user) {
  const file = path.join(getVaultPath(user), 'subscription.json');
  let sub = { plan: 'free', discount: 1 };
  if (fs.existsSync(file)) { try { sub = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {} }
  return sub;
}

function hasSpentAtLeast(user, amount = 1) {
  const file = path.join(getVaultPath(user), 'billing-history.json');
  let arr = [];
  if (fs.existsSync(file)) { try { arr = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {} }
  const total = arr.reduce((s, e) => s + (e.cost || 0), 0);
  return total >= amount;
}

function processBilling(user, ideaPath, prompt) {
  ensureUser(user);
  const sub = loadSubscription(user);
  const estimate = estimatePromptCost(prompt);
  const cost = +(estimate.estimated_cost * sub.discount).toFixed(6);
  const before = loadTokens(user);
  if (before < cost) throw new Error('Insufficient tokens');
  saveTokens(user, before - cost);
  const entry = { timestamp: new Date().toISOString(), idea: ideaPath, cost, tokens_before: before, tokens_after: before - cost };
  record(path.join(getVaultPath(user), 'billing-history.json'), entry);
  record(path.join(__dirname, '..', '..', 'logs', 'global-billing-summary.json'), { user, idea: ideaPath, cost, tokens: estimate.tokens });
  rewardReferral(user, cost);
  return cost;
}

module.exports = { processBilling, hasSpentAtLeast };
