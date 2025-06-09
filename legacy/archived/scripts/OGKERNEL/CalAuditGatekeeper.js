// CalAuditGatekeeper.js — validates echo + intent only for known canonical agents
const fs = require('fs');
const path = require('path');

const daemonRegistryPath = path.join(__dirname, '../core/CalDaemonRegistry.json');
const echoPulsePath = path.join(__dirname, '../core/CalEchoPulse.json');
const intentPath = path.join(__dirname, '../core/CalIntentEcho.json');
const resultPath = path.join(__dirname, '../core/CalBacktestResults.json');

const echo = fs.existsSync(echoPulsePath) ? JSON.parse(fs.readFileSync(echoPulsePath)) : {};
const intents = fs.existsSync(intentPath) ? JSON.parse(fs.readFileSync(intentPath)) : [];
const registry = fs.existsSync(daemonRegistryPath) ? JSON.parse(fs.readFileSync(daemonRegistryPath)) : { agents: [] };

const canon = new Set(registry.agents.map(a => a.name));
const results = [];

Object.keys(echo).forEach(agent => {
  if (!canon.has(agent)) return;

  const delta = Date.now() - echo[agent].last_echo;
  const hasIntent = intents.find(i => i.agent === agent);
  const pass = delta < 15000 && hasIntent;

  results.push({
    agent,
    echoDelta: delta,
    intentDeclared: !!hasIntent,
    status: pass ? "✅ PASS" : "❌ FAIL"
  });

  if (!pass) {
    console.log(`❌ ${agent}: echoDelta=${delta}, intentDeclared=${!!hasIntent}`);
  } else {
    console.log(`✅ ${agent}: verified`);
  }
});

fs.writeFileSync(resultPath, JSON.stringify(results, null, 2));
console.log(`📄 Canonical audit complete. Results written to ${resultPath}`);
