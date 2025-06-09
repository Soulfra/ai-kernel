
const fs = require('fs');
const files = fs.readdirSync('.');

console.log('🧠 CalKernel Status Check');

['CalShell.js', 'CalGitEcho.js', 'CalSnapshot.js', 'CalDriftScan.js'].forEach(f => {
  console.log(`${fs.existsSync(f) ? '✅' : '❌'} ${f}`);
});

console.log('\n📄 Logs:');
['CalDevTrace.json', 'CalSnapshot.json', 'CalTrustDelta.json'].forEach(f => {
  console.log(`${fs.existsSync(f) ? '✅' : '❌'} ${f}`);
});

console.log('\n🎙 Voice:');
if (fs.existsSync('calVoiceProfile.json')) {
  const profile = JSON.parse(fs.readFileSync('calVoiceProfile.json'));
  console.log(`🔊 Alias: ${profile.alias}`);
  console.log(`🔗 VoiceHash: ${profile.voiceHash}`);
}
