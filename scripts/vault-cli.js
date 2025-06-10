#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { deposit, status, ensureUser, getVaultPath } = require('./core/user-vault');

const cmd = process.argv[2];
const user = process.argv[3];
const amount = parseInt(process.argv[4], 10);

if (!cmd || !user) {
  console.log('Usage: vault-cli.js <create|deposit|status|subscribe|billing-summary> <username> [value]');
  process.exit(1);
}

if (cmd === 'create') {
  ensureUser(user);
  console.log(`Created user ${user}`);
} else if (cmd === 'deposit') {
  if (!amount) { console.log('Amount required'); process.exit(1); }
  deposit(user, amount);
  console.log(`Deposited ${amount} tokens to ${user}`);
} else if (cmd === 'status') {
  console.log(JSON.stringify(status(user), null, 2));
} else if (cmd === 'subscribe') {
  const plan = process.argv[4];
  if (!plan) { console.log('Plan required'); process.exit(1); }
  ensureUser(user);
  const file = path.join(getVaultPath(user), 'subscription.json');
  let discount = 1;
  if (plan === 'weekly') discount = 0.9;
  if (plan === 'monthly') discount = 0.8;
  fs.writeFileSync(file, JSON.stringify({ plan, discount }, null, 2));
  console.log(`Subscribed ${user} to ${plan}`);
} else if (cmd === 'billing-summary') {
  const file = path.join(getVaultPath(user), 'billing-history.json');
  let arr = [];
  if (fs.existsSync(file)) { try { arr = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {} }
  const total = arr.reduce((s, e) => s + (e.cost || 0), 0);
  console.log(JSON.stringify({ total, count: arr.length }, null, 2));
} else {
  console.log('Unknown command');
  process.exit(1);
}
