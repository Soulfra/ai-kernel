
const fs = require('fs');
const path = require('path');

const base = './tier2/';
console.log('🧠 Loop Diagnosis:
');

fs.readdirSync(base).forEach(mod => {
  const modPath = path.join(base, mod);
  const loop = path.join(modPath, '.loop.json');
  const result = path.join(modPath, '.loop-result.json');
  const agents = fs.readdirSync(modPath).filter(f => f.endsWith('.js') && !f.startsWith('calctl'));

  if (!fs.existsSync(loop)) return console.log(`❌ ${mod}: missing .loop.json`);
  if (!fs.existsSync(result)) return console.log(`⚠️ ${mod}: not certified`);

  console.log(`✅ ${mod} loop present`);
  agents.forEach(a => {
    const full = path.join(modPath, a);
    if (!fs.existsSync(full)) return console.log(`  ❌ missing: ${a}`);
    const content = fs.readFileSync(full, 'utf8');
    if (!content.includes('logTrace')) console.log(`  ⚠️ no trust logging: ${a}`);
  });
});
