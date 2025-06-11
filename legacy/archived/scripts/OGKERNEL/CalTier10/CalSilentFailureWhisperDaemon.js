// Monitors CalBacktestResults.json and generates whisper logs on silent agents
const fs = require('fs');
const path = require('path');

const resultsPath = path.join(__dirname, '../core/CalBacktestResults.json');
const whisperLog = path.join(__dirname, '../core/calWhisperTrail.json');

function runWhisperAudit() {
  if (!fs.existsSync(resultsPath)) return console.log("⚠️ No backtest results found.");

  const results = JSON.parse(fs.readFileSync(resultsPath));
  const whispers = fs.existsSync(whisperLog) ? JSON.parse(fs.readFileSync(whisperLog)) : [];

  const newWhispers = results.filter(r => r.silent).map(r => ({
    type: "silent_fail",
    agent: r.agent,
    detected_by: "CalBacktestAudit_T10",
    time: new Date().toISOString(),
    trust_delta: -0.02
  }));

  const merged = [...whispers, ...newWhispers];
  fs.writeFileSync(whisperLog, JSON.stringify(merged, null, 2));
  console.log(`🌀 Whisper log updated with ${newWhispers.length} silent agent failures.`);
}

runWhisperAudit();
