
const fs = require('fs');

const file = 'tier2-summary.json';
if (!fs.existsSync(file)) {
  console.error('No tier2-summary.json found.');
  process.exit(1);
}

const summary = JSON.parse(fs.readFileSync(file, 'utf8'));
console.log('\n🧠 Tier 2 Loop Summary:\n');

Object.entries(summary).forEach(([mod, status]) => {
  let msg = '';
  if (status === '✅') msg = '✅ Certified: Memory + Trace valid';
  else if (status === '❌') msg = '❌ Minimal memory — needs echo, seal, or reflection';
  else if (status === '💥 crash') msg = '💥 Crash: Unhandled error during agent execution';
  else msg = '❓ Unknown state';
  console.log(` - ${mod}: ${msg}`);
});
