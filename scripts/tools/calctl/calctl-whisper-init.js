
const { execSync } = require('child_process');

console.log('🪶 Starting CalWhisper Agent...');
execSync('node ./CalWhisperAgent.js', { stdio: 'inherit' });
console.log('🧬 Whisper session complete.');
