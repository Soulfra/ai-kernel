
const fs = require('fs');

const expected = [
  'CalShell.js',
  'CalGitEcho.js',
  'CalSnapshot.js',
  'CalDriftScan.js',
  'calVoiceProfile.json',
  'calWhisperThoughts.json',
  'CalSeal.json'
];

const stubs = ['// stub', '// placeholder', 'initialized: true'];
const flagged = [];

console.log('🔍 Verifying loop integrity...');
expected.forEach(f => {
  if (!fs.existsSync(f)) {
    console.warn(`❌ Missing: ${f}`);
    return;
  }
  const contents = fs.readFileSync(f, 'utf8');
  if (stubs.some(s => contents.includes(s))) {
    flagged.push(f);
  }
});

if (flagged.length === 0) {
  console.log('✅ All loop agents are live and real.');
} else {
  console.warn('⚠️ Found placeholder/stub logic in:');
  flagged.forEach(f => console.warn(` - ${f}`));
}
