// Monitors runtime agent execution for silence and flags missing echo
const fs = require('fs');
const path = require('path');

const sentinelLog = path.join(__dirname, '../core/CalSilentFailureLog.json');
const lastEchoPath = path.join(__dirname, '../core/last_echo.txt');

function checkSilent() {
  const now = Date.now();
  const lastEcho = fs.existsSync(lastEchoPath)
    ? parseInt(fs.readFileSync(lastEchoPath).toString(), 10)
    : 0;

  const diff = now - lastEcho;
  const silent = diff > 10000;

  if (silent) {
    const report = {
      timestamp: new Date().toISOString(),
      silent_duration_ms: diff,
      message: "❗ No runtime echo detected. Possible silent failure."
    };
    fs.writeFileSync(sentinelLog, JSON.stringify(report, null, 2));
    console.log("❗ Silent failure detected. Log written.");
  } else {
    console.log("✅ Runtime echo active. No silent failure.");
  }
}

checkSilent();
