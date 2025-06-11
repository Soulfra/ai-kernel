// Forces all /core daemons to sync, backfill, and register
const fs = require('fs');
const path = require('path');

const corePath = path.join(__dirname, '../core/');
const registryPath = path.join(__dirname, '../core/CalDaemonRegistry.json');

function hydrateRegistry() {
  const files = fs.readdirSync(corePath).filter(f => f.endsWith('.js'));
  const registry = {
    registry_version: "2.0",
    timestamp: new Date().toISOString(),
    agents: []
  };

  files.forEach(file => {
    registry.agents.push({
      name: file,
      path: `./core/${file}`,
      registered_at: new Date().toISOString(),
      status: "hydrated"
    });
  });

  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
  console.log(`✅ CalDaemonRegistryHydratorV2: ${registry.agents.length} agents registered.`);
}

hydrateRegistry();