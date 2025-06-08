// T10 audit agent with working path
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const coreDir = path.resolve(__dirname, '../core');
const resultPath = path.resolve(coreDir, 'CalBacktestResults.json');
const echoFile = path.join(coreDir, 'last_echo.txt');
const log = [];

console.log("🔍 Soulfra Tier 10 Audit Running...");
fs.readdirSync(coreDir).filter(f => f.endsWith('.js')).forEach(file => {
  const fullPath = path.join(coreDir, file);
  const result = spawnSync('node', [fullPath], { encoding: 'utf-8' });
  const stdout = result.stdout.trim();
  const stderr = result.stderr.trim();
  const exitCode = result.status;
  const echoExists = fs.existsSync(echoFile);
  const echoTime = echoExists ? parseInt(fs.readFileSync(echoFile).toString(), 10) : 0;
  const now = Date.now();
  const echoDelta = now - echoTime;
  const echoRecent = echoExists && echoDelta < 10000;
  const silent = (!stdout && !stderr) || !echoRecent;
  log.push({ agent: file, exitCode, stdout, stderr, echoRecent, echoDeltaMs: echoDelta, silent });
  if (silent) console.log(`❗ Silent or unverified echo: ${file} (echoDelta=${echoDelta}ms)`);
  else console.log(`✅ Verified execution: ${file}`);
});
try {
  fs.writeFileSync(resultPath, JSON.stringify(log, null, 2));
  console.log(`📦 Backtest complete. Results saved to ${resultPath}`);
} catch (err) {
  console.error("❌ Failed to save CalBacktestResults.json:", err.message);
}
