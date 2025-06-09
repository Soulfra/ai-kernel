// CalBacktestAudit_T10_DIAGNOSTIC.js — enhanced with detailed echo failure triage, delta reporting, and fix hints
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const coreDir = path.resolve(__dirname, '../core');
const resultPath = path.resolve(coreDir, 'CalBacktestResults.json');
const echoFile = path.join(coreDir, 'last_echo.txt');

const log = [];
console.log("🔬 Soulfra Tier 10 Diagnostic Audit Running...");

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

  const entry = {
    agent: file,
    exitCode,
    stdout,
    stderr,
    echoRecent,
    echoDeltaMs: echoDelta,
    silent,
    diagnostic: {}
  };

  if (silent) {
    console.log(`❗ Silent or unverified echo: ${file} (echoDelta=${echoDelta}ms)`);
    entry.diagnostic.echo_path = echoFile;
    entry.diagnostic.hints = [
      "Confirm require('./CalTier10/CalRuntimeEcho.js') is the last line of the file",
      "Run this agent manually to verify it prints '✅ Agent echo committed.'",
      "Check for early returns, uncaught exceptions, or logic branches that skip echo",
      "If 'No whisper provided', ensure whisper flag/env is passed OR bypass logic gates",
      "Ensure echoFile is writable (chmod 644 core/*.js before rerun)"
    ];
  } else {
    console.log(`✅ Verified execution: ${file}`);
  }

  log.push(entry);
});

try {
  fs.writeFileSync(resultPath, JSON.stringify(log, null, 2));
  console.log(`📄 Backtest complete. Results saved to ${resultPath}`);
} catch (err) {
  console.error("❌ Failed to write results file:", err.message);
}
