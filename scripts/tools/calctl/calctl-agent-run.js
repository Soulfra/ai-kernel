
const fs = require('fs');
const path = require('path');

const [module, agent] = process.argv.slice(2);
if (!module || !agent) {
  console.error('Usage: calctl agent:run [module] [agent]');
  process.exit(1);
}

const full = path.resolve(`./tier2/${module}/${agent}`);
try {
  const run = require(full);
  if (typeof run === 'function') {
    console.log(`▶️ Running ${agent} in ${module}...`);
    run('manual run');
  } else {
    console.error('Loaded agent is not a function.');
  }
} catch (err) {
  console.error(`❌ Failed to run agent: ${err.message}`);
}
