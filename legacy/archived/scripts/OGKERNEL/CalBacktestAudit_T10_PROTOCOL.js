// CalBacktestAudit_T10_PROTOCOL.js — protocol echo check with path fixed
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { verifyEcho } = require('./CalEchoProtocol');

const coreDir = path.resolve(__dirname, '../core');
const resultPath = path.join(__dirname, '../core/CalBacktestResults.json');

const log = [];
console.log("🔬 Soulfra Tier 10 Protocol Echo Audit Running...");

fs.readdirSync(coreDir).filter(f => f.endsWith('.js')).forEach(file => {
  const fullPath = path.join(coreDir, file);
  const result = spawnSync('node', [fullPath], { encoding: 'utf-8' });

  const stdout = result.stdout.trim();
  const stderr = result.stderr.trim();
  const exitCode = result.status;
  const echoFresh = verifyEcho(file);

  const entry = {
    agent: file,
    exitCode,
    stdout,
    stderr,
    echoVerified: echoFresh
  };

  log.push(entry);
});

try {
  fs.writeFileSync(resultPath, JSON.stringify(log, null, 2));
  console.log(`📄 Protocol-level backtest complete. Results saved to ${resultPath}`);
} catch (err) {
  console.error("❌ Failed to save protocol audit results:", err.message);
}
