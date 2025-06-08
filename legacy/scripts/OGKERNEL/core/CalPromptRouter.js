
const fs = require('fs');
const whisper = fs.existsSync('./cal.lastWhisper.txt') ? fs.readFileSync('./cal.lastWhisper.txt', 'utf8') : '';

if (whisper.toLowerCase().includes('code')) {
  console.log('🛠️ Route intent: code → CalCoderAgent.js');
} else if (whisper.toLowerCase().includes('sync')) {
  console.log('📡 Route intent: sync → calctl-sync-packet.js');
} else {
  console.log('🧭 No route matched in fallback PromptRouter.');
}
