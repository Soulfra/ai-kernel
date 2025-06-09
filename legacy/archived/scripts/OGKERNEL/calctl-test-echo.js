// Simulates agent echo lifecycle with optional delay/failure
const fs = require('fs');
const path = require('path');
const { commitIntent } = require('./CalIntentEcho');
const pulsePath = path.join(__dirname, '../core/CalEchoPulse.json');
const echoFile = path.join(__dirname, '../core/last_echo.txt');

const agent = process.argv[2];
const delay = parseInt(process.argv[3]) || 0;
const fail = process.argv.includes('--fail');

if (!agent) {
  console.log("Usage: node calctl-test-echo.js <agent> [delayMs] [--fail]");
  process.exit(1);
}

console.log(`🧪 Testing agent: ${agent} with delay ${delay}ms, fail: ${fail}`);

if (!fail) {
  if (delay > 0) {
    setTimeout(() => {
      fs.writeFileSync(echoFile, Date.now().toString());
      const hash = require('crypto').createHash('sha256').update(agent + Date.now()).digest('hex');
      const pulse = fs.existsSync(pulsePath)
        ? JSON.parse(fs.readFileSync(pulsePath)) : {};
      pulse[agent] = { last_echo: Date.now(), hash, status: "test" };
      fs.writeFileSync(pulsePath, JSON.stringify(pulse, null, 2));
      commitIntent({ agent, intent: "Test echo + intent", signature: "vault://test/gauntlet" });
      console.log("✅ Simulated echo + intent completed.");
    }, delay);
  } else {
    fs.writeFileSync(echoFile, Date.now().toString());
    const hash = require('crypto').createHash('sha256').update(agent + Date.now()).digest('hex');
    const pulse = fs.existsSync(pulsePath)
      ? JSON.parse(fs.readFileSync(pulsePath)) : {};
    pulse[agent] = { last_echo: Date.now(), hash, status: "test" };
    fs.writeFileSync(pulsePath, JSON.stringify(pulse, null, 2));
    commitIntent({ agent, intent: "Test echo + intent", signature: "vault://test/gauntlet" });
    console.log("✅ Simulated echo + intent completed.");
  }
} else {
  console.log("❌ Skipping echo commit — simulating failure.");
}
