
const fs = require('fs');

console.log('🧠 Installing Cal kernel structure...');
['cal', 'cal/core', 'cal/init', 'cal/utils'].forEach(p => {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

fs.writeFileSync('./cal/README.txt', 'This is your full Cal kernel layout.');
console.log('✅ Cal filesystem initialized.');
