
const fs = require('fs');
const base = './tier2/';

console.log('📖 Loop Explanation Summary:\n');

fs.readdirSync(base).forEach(mod => {
  const path = base + mod + '/.loop-result.json';
  if (fs.existsSync(path)) {
    const data = JSON.parse(fs.readFileSync(path));
    console.log(`Module: ${mod}`);
    console.log(` - Certified: ${data.certified}`);
    Object.entries(data.memoryStatus).forEach(([f, v]) => {
      console.log(`   • ${f}: ${v}`);
    });
    console.log('');
  }
});
