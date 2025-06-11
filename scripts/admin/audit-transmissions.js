#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const logFile = path.join('logs','transmission-log.json');
if (!fs.existsSync(logFile)) {
  console.log('No transmissions logged');
  process.exit(0);
}
const data = JSON.parse(fs.readFileSync(logFile,'utf8'));
console.log(JSON.stringify(data, null, 2));

