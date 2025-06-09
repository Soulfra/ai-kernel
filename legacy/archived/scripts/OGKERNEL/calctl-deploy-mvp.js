// calctl-deploy-mvp.js — prepares CalGenesis for developer install, audit, and release
const fs = require('fs');
const path = require('path');

console.log("🚀 Deploying CalGenesis MVP...");

const filesToVerify = [
  'CalDaemonRegistry.json',
  'CalEchoPulse.json',
  'CalIntentEcho.json',
  'CalBacktestResults.json',
  'CalVaultMemoryDelta.json',
  'CalKernelSnapshot.json'
];

let missing = [];

filesToVerify.forEach(f => {
  const fullPath = path.join(__dirname, f);
  if (!fs.existsSync(fullPath)) {
    missing.push(f);
  }
});

if (missing.length > 0) {
  console.log("❌ Missing critical files:");
  console.log(missing.join('\n'));
  process.exit(1);
}

console.log("✅ All trust and reflection artifacts present.");
console.log("📦 CalGenesis is ready for vault snapshot, GitHub deploy, or Whisper onboarding.");
