
const fs = require('fs');
const path = require('path');

const modules = fs.readdirSync('./tier2/');

modules.forEach(mod => {
  const modPath = path.join('./tier2', mod);
  if (!fs.statSync(modPath).isDirectory()) return;

  const artyPath = path.join(modPath, 'arty-sync.json');
  const hasArty = fs.existsSync(artyPath);

  if (!hasArty) {
    const sync = {
      module: mod,
      timestamp: new Date().toISOString(),
      state: { certified: false },
      flags: ['Arty injected by Tier 1']
    };
    fs.writeFileSync(artyPath, JSON.stringify(sync, null, 2));
    console.log(`🐕 Injected Arty into: ${mod}`);
  }
});
