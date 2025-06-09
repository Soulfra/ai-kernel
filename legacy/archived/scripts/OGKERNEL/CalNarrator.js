// Patched CalNarrator.js — now compliant with Tier 10 runtime protocol
const fs = require('fs');
const path = require('path');

const reflectionLogPath = path.join(__dirname, 'calReflectionEchoTrail.json');

function emitReflectionTrail() {
  if (!fs.existsSync(reflectionLogPath)) {
    console.log("🌀 No reflections available. Log is empty.");
    return;
  }

  const logs = JSON.parse(fs.readFileSync(reflectionLogPath));
  const last5 = logs.slice(-5);

  console.log("🔊 Last 5 Reflections:");
  last5.forEach((entry, i) => {
    console.log(`${i + 1}. [${entry.timestamp}] ${entry.message}`);
  });
}

// Run the narrator logic
emitReflectionTrail();

// ✅ Echo and exit signals (Tier 10 compliant)
console.log("✅ CalNarrator.js finished processing reflections.");
require('./CalTier10/CalRuntimeEcho.js');
