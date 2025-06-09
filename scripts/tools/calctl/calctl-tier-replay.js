
const fs = require('fs');
const path = require('path');

const base = './tier2/';
fs.readdirSync(base).forEach(mod => {
  const modPath = path.join(base, mod);
  const agents = fs.readdirSync(modPath).filter(f => f.endsWith('.js') && !f.startsWith('calctl'));
  console.log(`🔁 Replaying ${mod} agents:`);
  agents.forEach(agent => {
    try {
      const run = require(path.resolve(modPath, agent));
      if (typeof run === 'function') {
        run('replayed by loop-replayer');
        console.log(`   ✅ ${agent}`);
      }
    } catch (err) {
      console.warn(`   ❌ ${agent}: ${err.message}`);
    }
  });
});
