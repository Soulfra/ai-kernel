// Tier 11 audit — intent + echo + whisper integrity
const fs = require('fs');
const path = require('path');
const { verifyEcho } = require('./CalEchoProtocol');

const echoPulse = path.join(__dirname, '../core/CalEchoPulse.json');
const intentTrail = path.join(__dirname, '../core/CalIntentEcho.json');
const resultPath = path.join(__dirname, '../core/CalBacktestResults.json');

const pulse = fs.existsSync(echoPulse) ? JSON.parse(fs.readFileSync(echoPulse)) : {};
const intents = fs.existsSync(intentTrail) ? JSON.parse(fs.readFileSync(intentTrail)) : [];

const log = [];

Object.keys(pulse).forEach(agent => {
  const echoDelta = Date.now() - pulse[agent].last_echo;
  const hasIntent = intents.find(i => i.agent === agent);
  const pass = echoDelta < 15000 && hasIntent;

  log.push({
    agent,
    echoDelta,
    intentDeclared: !!hasIntent,
    status: pass ? "✅ PASS" : "❌ FAIL"
  });

  if (!pass) {
    console.log(`❌ ${agent}: echoDelta=${echoDelta}, intentDeclared=${!!hasIntent}`);
  } else {
    console.log(`✅ ${agent}: echo verified and intent recorded`);
  }
});

fs.writeFileSync(resultPath, JSON.stringify(log, null, 2));
console.log(`📄 Audit written to ${resultPath}`);
