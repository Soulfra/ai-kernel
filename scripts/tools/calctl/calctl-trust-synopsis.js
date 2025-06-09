
const fs = require('fs');
const path = require('path');

const logFiles = fs.readdirSync('.').filter(f => f.endsWith('.json') && !f.startsWith('package'));

console.log('🧠 CalKernel Synopsis');

logFiles.forEach(f => {
  try {
    const data = fs.readFileSync(f, 'utf8');
    const size = data.length;
    const lines = data.split('\n').length;
    const objects = (JSON.parse(data));
    const count = Array.isArray(objects) ? objects.length : Object.keys(objects).length;
    console.log(` - ${f} → ${count} entries, ${lines} lines, ${size} bytes`);
  } catch {
    console.warn(` ❌ Could not parse ${f}`);
  }
});
