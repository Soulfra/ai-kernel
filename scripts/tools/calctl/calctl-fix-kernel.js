
const fs = require('fs');
const path = require('path');

const files = fs.readdirSync('.').filter(f => f.endsWith('.js'));
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const fixed = content.replace(/\r/g, '');
  fs.writeFileSync(file, fixed);
  console.log(`🔧 Normalized: ${file}`);
}
console.log('✅ All line endings set to LF.');
