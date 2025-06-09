// Confirms agent echoed, declared intent, and matched trust expectations
const fs = require('fs');
const path = require('path');

const echoPulse = path.join(__dirname, '../core/CalEchoPulse.json');
const intentTrail = path.join(__dirname, '../core/CalIntentEcho.json');

function verifyAll() {
  const pulse = fs.existsSync(echoPulse) ? JSON.parse(fs.readFileSync(echoPulse)) : {};
  const intents = fs.existsSync(intentTrail) ? JSON.parse(fs.readFileSync(intentTrail)) : [];

  const echoAgents = Object.keys(pulse);
  const intentAgents = intents.map(i => i.agent);
  const issues = [];

  echoAgents.forEach(agent => {
    const hasIntent = intentAgents.includes(agent);
    const echoDelta = Date.now() - pulse[agent].last_echo;

    if (!hasIntent) {
      console.log(`⚠️ ${agent} echoed but did not declare intent.`);
      issues.push(agent);
    } else if (echoDelta > 15000) {
      console.log(`⚠️ ${agent} has stale echo (${echoDelta}ms)`);
      issues.push(agent);
    } else {
      console.log(`✅ ${agent} verified with echo + intent`);
    }
  });

  if (issues.length === 0) {
    console.log("✅ All agents passed witness verification.");
  }
}

verifyAll();
