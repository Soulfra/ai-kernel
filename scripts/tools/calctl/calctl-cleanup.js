
const fs = require('fs');
const path = require('path');

const filesToClean = [
  'CalDevTrace.json',
  'CalGitTrail.json',
  'CalIntentEcho.json',
  'CalTrustDelta.json',
  'CalSnapshot.json',
  'calWhisperSession.json',
  'calWhisperThoughts.json',
  'calDevMemory.json',
  'CalSeal.json'
];

filesToClean.forEach(file => {
  if (!fs.existsSync(file)) return;

  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));

    // Remove known placeholder-only content
    if (data.initialized === true) {
      console.log(`🧹 ${file} contained placeholder object. Wiping...`);
      fs.writeFileSync(file, JSON.stringify({}, null, 2));
      return;
    }

    // Strip voice ID if present and anonymize
    if (file === 'calWhisperThoughts.json' || file === 'CalSeal.json') {
      if (data.voice && data.voice.startsWith('alias:')) {
        data.voice = 'alias:anon';
      }
      if (data.voiceHash && data.voiceHash.startsWith('hash:')) {
        data.voiceHash = 'hash:000000000000';
      }
      if (data.alias) {
        data.alias = 'anon';
      }
      fs.writeFileSync(file, JSON.stringify(data, null, 2));
      console.log(`🔒 Anonymized voice metadata in ${file}`);
      return;
    }

  } catch (e) {
    console.warn(`⚠️ Skipping ${file} — parse failed`);
  }
});

console.log('\n✅ Cleanup complete. Kernel is stable and stripped.');
