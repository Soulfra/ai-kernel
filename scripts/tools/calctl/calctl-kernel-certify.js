
const fs = require('fs');

const files = ['CalShell.js', 'CalGitEcho.js', 'CalSnapshot.js', 'CalDriftScan.js'];
const memoryFiles = ['CalDevTrace.json', 'CalSnapshot.json', 'CalTrustDelta.json', 'CalSeal.json'];
const result = {
  verified: new Date().toISOString(),
  files: {},
  memory: {},
  certified: true
};

files.forEach(file => {
  result.files[file] = fs.existsSync(file) ? '✅' : '❌ missing';
  if (!fs.existsSync(file)) result.certified = false;
});

memoryFiles.forEach(file => {
  try {
    const data = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(data);
    const count = Array.isArray(parsed) ? parsed.length : Object.keys(parsed).length;
    result.memory[file] = count > 0 ? '✅' : '⚠️ empty';
    if (count === 0) result.certified = false;
  } catch {
    result.memory[file] = '❌ unreadable';
    result.certified = false;
  }
});

fs.writeFileSync('.kernel-result.json', JSON.stringify(result, null, 2));
console.log(`🔒 Kernel certification ${result.certified ? '✅ PASSED' : '❌ FAILED'}`);
