
const fs = require('fs');
const { logTrace } = require('./calTrustTrace');

const name = process.argv[2];
if (!name) {
  logTrace('tier:activate', 'fail', 'no module name provided');
  process.exit(1);
}

const loopFile = `./tier2/${name}/.loop.json`;
if (!fs.existsSync(loopFile)) {
  logTrace('tier:activate', 'fail', `missing loop file for ${name}`);
  console.error(`❌ Module '${name}' not found or missing .loop.json`);
  process.exit(1);
}

logTrace('tier:activate', 'pass', `activated ${name}`);
console.log(`🔁 Activating Tier 2 Module: ${name}`);
const loop = JSON.parse(fs.readFileSync(loopFile));
console.log(`🌀 Loop: ${loop.description}`);
console.log(`📦 Agents: ${loop.agents.join(', ')}`);
console.log(`🔒 Memory: ${loop.memory.join(', ')}`);
