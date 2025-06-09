
const fs = require('fs');
const path = require('path');

const agentRoot = './agents/';
if (!fs.existsSync(agentRoot)) {
  console.log('No agents/ folder found.');
  process.exit(0);
}

fs.readdirSync(agentRoot).forEach(dir => {
  const base = path.join(agentRoot, dir);
  const files = ['voice.json', 'memory.json'];
  files.forEach(f => {
    const full = path.join(base, f);
    if (!fs.existsSync(full)) {
      console.warn(`❌ ${dir} missing: ${f}`);
    }
  });
});
