
const fs = require('fs');

console.log('\n📡 CalPresenceDaemon Boot Report');
const status = {
  vault: fs.existsSync('./VaultIntegrityReport.json'),
  memory: fs.existsSync('./CalReflectionTrail.json'),
  whisper: fs.existsSync('./cal.lastWhisper.txt')
};

if (status.vault) console.log('🔐 Vault: locked');
else console.log('⚠️ Vault missing');

if (status.memory) console.log('🧠 Memory: active');
else console.log('⚠️ Memory trail not found');

if (status.whisper) {
  const msg = fs.readFileSync('./cal.lastWhisper.txt', 'utf8').trim();
  console.log('💬 Whisper: ' + msg);
} else console.log('❌ No whisper found');

console.log('✅ Cal is online');
