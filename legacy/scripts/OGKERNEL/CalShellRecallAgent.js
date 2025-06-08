
const fs = require('fs');

if (!fs.existsSync('CalReflectionTrail.json')) {
  console.error('❌ Memory file missing.');
  process.exit(1);
}

const lines = fs.readFileSync('CalReflectionTrail.json', 'utf8').split('\n').filter(Boolean);
const shells = {};

lines.forEach(line => {
  try {
    const entry = JSON.parse(line);
    if (entry.text && entry.text.toLowerCase().includes('shell')) {
      const label = entry.text.match(/shell[\s_-]?(\w+)/i);
      if (label) {
        const tag = label[1].toLowerCase();
        if (!shells[tag]) shells[tag] = [];
        shells[tag].push(entry.text.slice(0, 80));
      }
    }
  } catch {}
});

fs.writeFileSync('cal_shell_recall.json', JSON.stringify(shells, null, 2));
console.log('🔁 cal_shell_recall.json generated.');
