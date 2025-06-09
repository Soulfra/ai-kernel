
const fs = require('fs');
const tier2 = './tier2/';
const results = [];

console.log('🧪 Loop Ping: Scanning Tier 2 modules...');

if (!fs.existsSync(tier2)) {
  console.log('❌ No /tier2/ directory found.');
  process.exit(0);
}

fs.readdirSync(tier2).forEach(mod => {
  const path = `${tier2}${mod}/.loop.json`;
  if (!fs.existsSync(path)) {
    results.push({ mod, status: 'missing loop.json' });
    return;
  }
  try {
    const data = JSON.parse(fs.readFileSync(path));
    results.push({ mod, status: 'ready', agents: data.agents?.length, memory: data.memory?.length });
  } catch {
    results.push({ mod, status: 'invalid JSON' });
  }
});

results.forEach(r => {
  console.log(` - ${r.mod}: ${r.status}${r.agents ? ` | agents: ${r.agents}` : ''}`);
});
