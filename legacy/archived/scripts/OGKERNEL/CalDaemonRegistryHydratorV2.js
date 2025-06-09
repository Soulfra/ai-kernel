// CalDaemonRegistryHydratorV2.js — Rebuilds CalDaemonRegistry.json from all .js files in /core/
const fs = require('fs');
const path = require('path');

const coreDir = path.join(__dirname);
const registryPath = path.join(coreDir, 'CalDaemonRegistry.json');

console.log('🔁 Rehydrating CalDaemonRegistry.json...');

const agents = fs.readdirSync(coreDir)
  .filter(file => file.endsWith('.js') && !file.startsWith('calctl-') && !file.includes('~'))
  .map(file => ({
    name: file,
    path: `./core/${file}`,
    registered_at: new Date().toISOString(),
    status: "hydrated"
  }));

const registry = {
  registry_version: "2.0",
  timestamp: new Date().toISOString(),
  agents
};

fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
console.log(`✅ ${agents.length} agents registered into CalDaemonRegistry.json`);
