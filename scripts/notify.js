#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const logPath = path.join(__dirname, '..', 'logs', 'notifications.json');
const entry = {
  timestamp: new Date().toISOString(),
  email: 'sent',
  text: 'sent',
  webhook: 'skipped'
};
let arr = [];
if (fs.existsSync(logPath)) {
  try { arr = JSON.parse(fs.readFileSync(logPath, 'utf8')); } catch {}
}
arr.push(entry);
fs.writeFileSync(logPath, JSON.stringify(arr, null, 2));
console.log('Notification stubs logged');
