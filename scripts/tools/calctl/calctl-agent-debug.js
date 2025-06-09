
const fs = require('fs');
const path = require('path');

const [mod, agentFile] = process.argv.slice(2);
if (!mod || !agentFile) {
  console.error('Usage: calctl-agent-debug.js [module] [agentFile]');
  process.exit(1);
}

const full = path.resolve(`./tier2/${mod}/${agentFile}`);
const debugOut = `./tier2/${mod}/.debug-${agentFile}.json`;

try {
  const run = require(full);
  if (typeof run === 'function') {
    const result = run('debug input');
    fs.writeFileSync(debugOut, JSON.stringify({ result, status: 'ok', timestamp: new Date().toISOString() }, null, 2));
    console.log(`✅ Agent executed. Debug output written to .debug-${agentFile}.json`);
  }
} catch (err) {
  const report = {
    agent: agentFile,
    module: mod,
    error: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString()
  };
  fs.writeFileSync(debugOut, JSON.stringify(report, null, 2));
  console.error(`❌ Agent crashed. See .debug-${agentFile}.json`);
}
