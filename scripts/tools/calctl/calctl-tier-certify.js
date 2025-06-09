
const fs = require('fs');

const name = process.argv[2];
if (!name) {
  console.error('Usage: calctl tier:certify [module]');
  process.exit(1);
}

const base = `./tier2/${name}/`;
const resultFile = base + '.loop-result.json';
const memoryFiles = fs.readdirSync(base).filter(f => f.endsWith('.json') && !f.startsWith('.loop-result'));

let certified = true;
const output = { verified: new Date().toISOString(), module: name, memoryStatus: {} };

memoryFiles.forEach(file => {
  const path = base + file;
  try {
    const data = JSON.parse(fs.readFileSync(path));
    const keys = Array.isArray(data) ? data.length : Object.keys(data).length;
    output.memoryStatus[file] = keys >= 1 ? '✅' : '⚠️ low content';
    if (keys === 0) certified = false;
  } catch {
    output.memoryStatus[file] = '❌ parse error';
    certified = false;
  }
});

output.certified = certified;
fs.writeFileSync(resultFile, JSON.stringify(output, null, 2));
console.log(`🧠 Tier 2 module '${name}' certification ${certified ? '✅ PASSED' : '❌ FAILED'}`);
