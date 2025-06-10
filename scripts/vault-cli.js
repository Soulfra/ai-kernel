#!/usr/bin/env node
const { deposit, status, ensureUser } = require('./core/user-vault');

const cmd = process.argv[2];
const user = process.argv[3];
const amount = parseInt(process.argv[4], 10);

if (!cmd || !user) {
  console.log('Usage: vault-cli.js <create|deposit|status> <username> [amount]');
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
} else {
  console.log('Unknown command');
  process.exit(1);
}
