
const fs = require('fs');
const path = require('path');

fs.readdirSync('./tier2/').forEach(mod => {
  const modPath = './tier2/' + mod;
  const logs = fs.readdirSync(modPath).filter(f => f.endsWith('.json') && !f.startsWith('.loop-result'));
  const state = {};
  logs.forEach(file => {
    try {
      const contents = fs.readFileSync(path.join(modPath, file), 'utf8');
      state[file] = JSON.parse(contents);
    } catch {}
  });
  fs.writeFileSync(path.join(modPath, 'loop-recovery.json'), JSON.stringify(state, null, 2));
  console.log(`🧬 Recovery state written for ${mod}`);
});
