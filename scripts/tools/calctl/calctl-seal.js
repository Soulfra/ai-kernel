
const fs = require('fs');
const files = [
  'CalDevTrace.json',
  'CalGitTrail.json',
  'CalIntentEcho.json',
  'CalTrustDelta.json',
  'CalSnapshot.json',
  'calWhisperThoughts.json',
  'calDevMemory.json'
];

const seal = {
  timestamp: new Date().toISOString(),
  project: 'default',
  voice: '',
  files: {}
};

for (const file of files) {
  if (fs.existsSync(file)) {
    seal.files[file] = fs.readFileSync(file, 'utf8');
  }
}

if (fs.existsSync('calVoiceProfile.json')) {
  const vp = JSON.parse(fs.readFileSync('calVoiceProfile.json'));
  seal.voice = vp.voice || 'anon';
  seal.voiceHash = vp.voiceHash || '';
  seal.alias = vp.alias || '';
}

fs.writeFileSync('CalSeal.json', JSON.stringify(seal, null, 2));
console.log('🛡️ CalSeal.json created.');
