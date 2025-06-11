// CalAgentAutoMountV4_FINALSEAL.js — Final Tier 10.6 Seal with unconditional echo + whisper awareness
const fs = require('fs');
const path = require('path');

const agentMapPath = path.join(__dirname, 'calctl-agentmap.json');
const whisperLog = path.join(__dirname, 'calWhisperTrail.json');
const echoFile = path.join(__dirname, 'last_echo.txt');

console.log('🧠 Auto-mounting agents from /core/...');

let mountedCount = 0;
const errors = [];
let whisperProvided = process.argv.includes('--whisper') || process.env.CAL_WHISPER_MODE === 'true';

if (!fs.existsSync(agentMapPath)) {
  console.log("❌ Missing calctl-agentmap.json");
  errors.push({ agent: "AutoMount", error: "Missing agent map file" });
}

const map = fs.existsSync(agentMapPath)
  ? JSON.parse(fs.readFileSync(agentMapPath, 'utf8'))
  : {};

Object.entries(map).forEach(([key, file]) => {
  const finalPath = path.join(__dirname, file.split('/').pop());
  if (fs.existsSync(finalPath)) {
    try {
      require(finalPath);
      mountedCount++;
      console.log(`✅ Mounted ${key}: ${finalPath}`);
    } catch (err) {
      console.log(`❌ Error mounting ${key}: ${err.message}`);
      errors.push({ agent: key, error: err.message });
    }
  } else {
    console.log(`❌ ${key} not found at ${finalPath}`);
    errors.push({ agent: key, error: "Missing file" });
  }
});

// Log result to echo + whisper trail before exit
fs.writeFileSync(echoFile, Date.now().toString());
console.log("✅ Agent echo committed.");

if (!whisperProvided) {
  console.log("❌ No whisper provided.");
  const currentWhispers = fs.existsSync(whisperLog)
    ? JSON.parse(fs.readFileSync(whisperLog)) : [];

  const timestamp = new Date().toISOString();
  currentWhispers.push({
    type: "whisper_missing",
    agent: "CalAgentAutoMount",
    message: "Execution without whisper context.",
    time: timestamp,
    trust_delta: -0.04
  });

  fs.writeFileSync(whisperLog, JSON.stringify(currentWhispers, null, 2));
  console.log(`📣 Whisper trail updated with whisper-missing failure.`);
}

if (errors.length > 0) {
  const timestamp = new Date().toISOString();
  const currentWhispers = fs.existsSync(whisperLog)
    ? JSON.parse(fs.readFileSync(whisperLog)) : [];

  const newWhispers = errors.map(err => ({
    type: "autoloader_error",
    agent: err.agent,
    message: err.error,
    detected_by: "CalAgentAutoMountV4",
    time: timestamp,
    trust_delta: -0.03
  }));

  fs.writeFileSync(whisperLog, JSON.stringify([...currentWhispers, ...newWhispers], null, 2));
  console.log(`📣 Whisper trail updated with ${newWhispers.length} agent failures.`);
} else {
  console.log("✅ All agents mounted cleanly.");
}
