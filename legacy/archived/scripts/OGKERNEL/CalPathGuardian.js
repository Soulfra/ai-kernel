
const fs = require('fs');
const mapPath = './core/calctl-agentmap.json';

if (!fs.existsSync(mapPath)) {
  console.log('❌ Missing agent map. Run CalFinalizer.js first.');
  process.exit(1);
}

const map = JSON.parse(fs.readFileSync(mapPath));
console.log('🛡️ CalPathGuardian checking mapped agents...');

Object.entries(map).forEach(([name, filepath]) => {
  const resolved = './core/' + filepath.split('/').pop();
  if (!fs.existsSync(resolved)) {
    console.log(`❌ ${name} missing → ${resolved}`);
    console.log(`💡 Suggestion: node CalFailForwardAutoPatchTools/calctl-patch-failforward.js`);
  } else {
    console.log(`✅ ${name} found in /core/`);
  }
});
