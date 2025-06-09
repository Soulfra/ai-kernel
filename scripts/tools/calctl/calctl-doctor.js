
const fs = require('fs');
const files = [
  'CalShell.js',
  'CalGitEcho.js',
  'CalSnapshot.js',
  'CalDriftScan.js',
  'calctl-init-dev.js',
  'calctl-trust-replay.js'
];

let allGood = true;

for (const file of files) {
  if (!fs.existsSync(file)) {
    console.error(`❌ Missing file: ${file}`);
    allGood = false;
  } else {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('\r')) {
      console.warn(`⚠️ File ${file} uses CRLF line endings.`);
      allGood = false;
    }
  }
}

if (allGood) {
  console.log('✅ Cal kernel fully healthy.');
}
