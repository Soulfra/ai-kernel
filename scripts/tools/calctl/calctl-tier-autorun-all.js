
const fs = require('fs');
const path = require('path');

const base = path.resolve('./tier2/');
fs.readdirSync(base).forEach(mod => {
  const modPath = path.join(base, mod);
  const files = fs.readdirSync(modPath).filter(f => f.endsWith('.js') && !f.startsWith('calctl'));
  console.log(`▶️ Running ${mod} module agents:`);
  files.forEach(f => {
    try {
      const agentPath = path.resolve(modPath, f);
      const agent = require(agentPath);
      if (typeof agent === 'function') {
        agent("test run");
        console.log(`   ✅ ${f}`);
      }
    } catch (e) {
      console.warn(`   ❌ ${f}: ${e.message}`);
    }
  });
});
