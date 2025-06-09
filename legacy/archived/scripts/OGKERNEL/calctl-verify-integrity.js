// Cross-checks trust of agents between echo, intent, and canonical registry
const fs = require('fs');
const path = require('path');

const echoPath = path.join(__dirname, '../core/CalEchoPulse.json');
const intentPath = path.join(__dirname, '../core/CalIntentEcho.json');
const canonPath = path.join(__dirname, '../core/CalAgentCanonical.json');
const registryPath = path.join(__dirname, '../core/CalDaemonRegistry.json');

const echo = fs.existsSync(echoPath) ? JSON.parse(fs.readFileSync(echoPath)) : {};
const intent = fs.existsSync(intentPath) ? JSON.parse(fs.readFileSync(intentPath)) : [];
const canon = fs.existsSync(canonPath) ? JSON.parse(fs.readFileSync(canonPath)) : { valid_agents: [] };
const registry = fs.existsSync(registryPath) ? JSON.parse(fs.readFileSync(registryPath)) : { agents: [] };

const canonSet = new Set(canon.valid_agents);
const regSet = new Set(registry.agents.map(a => a.name));

console.log("🔍 Verifying integrity of Cal runtime agents...");

canon.valid_agents.forEach(agent => {
  const echoExists = !!echo[agent];
  const intentExists = intent.some(e => e.agent === agent);
  const regExists = regSet.has(agent);

  if (!echoExists || !intentExists || !regExists) {
    console.log(`❌ ${agent} - echo: ${echoExists}, intent: ${intentExists}, registry: ${regExists}`);
  } else {
    console.log(`✅ ${agent} - all checks passed`);
  }
});
