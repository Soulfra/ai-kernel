
const fs = require('fs');
const map = JSON.parse(fs.readFileSync('./core/calctl-agentmap.json', 'utf8'));

console.log('🔍 Validating all agent paths...');

let passed = 0;
let total = 0;

Object.values(map).forEach(file => {
  total++;
  const full = './core/' + file.split('/').pop();
  if (fs.existsSync(full)) {
    console.log(`✅ ${full}`);
    passed++;
  } else {
    console.log(`❌ ${full} not found`);
  }
});

console.log(`📊 Check: ${passed}/${total} agents present.`);
