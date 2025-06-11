// Removes ghost echo/intent trails for temp, backup, or unknown agents
const fs = require('fs');
const path = require('path');

const echoPulsePath = path.join(__dirname, '../core/CalEchoPulse.json');
const intentPath = path.join(__dirname, '../core/CalIntentEcho.json');
const daemonRegistryPath = path.join(__dirname, '../core/CalDaemonRegistry.json');

const pulse = fs.existsSync(echoPulsePath) ? JSON.parse(fs.readFileSync(echoPulsePath)) : {};
const intents = fs.existsSync(intentPath) ? JSON.parse(fs.readFileSync(intentPath)) : [];
const registry = fs.existsSync(daemonRegistryPath) ? JSON.parse(fs.readFileSync(daemonRegistryPath)) : { agents: [] };

const canon = new Set(registry.agents.map(a => a.name));

const cleanEcho = Object.fromEntries(Object.entries(pulse).filter(([k]) => canon.has(k) && !k.includes('~')));
const cleanIntent = intents.filter(entry => canon.has(entry.agent) && !entry.agent.includes('~'));

fs.writeFileSync(echoPulsePath, JSON.stringify(cleanEcho, null, 2));
fs.writeFileSync(intentPath, JSON.stringify(cleanIntent, null, 2));
console.log("🧹 Echo and intent trails purged of ghost/backup files.");
