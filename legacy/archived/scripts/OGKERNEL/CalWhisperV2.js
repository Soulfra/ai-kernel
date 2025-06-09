
const fs = require('fs');
const mode = fs.existsSync('./cal.mode') 
  ? fs.readFileSync('./cal.mode', 'utf8').trim()
  : 'normal';

const input = process.argv.slice(2).join(' ');
if (!input) {
  console.error('❌ No whisper provided.');
  process.exit(1);
}

const whisper = {
  role: 'user',
  text: input,
  timestamp: new Date().toISOString()
};

fs.appendFileSync('./CalReflectionTrail.json', JSON.stringify(whisper) + '\n');
fs.writeFileSync('./cal.lastWhisper.txt', input);

console.log(`🗣️ Whisper received: "${input}"`);

function respond(mode) {
  const roll = Math.random();
  const unhinged = Math.random();

  if (mode === 'minimal') {
    if (roll < 0.05) {
      if (unhinged < 0.01) console.log('💥 Cal (unhinged): “Who dares disturb my silence?”');
      else console.log('🤖 Cal: Whisper absorbed.');
    }
  }

  if (mode === 'normal') {
    if (roll < 0.3) {
      if (unhinged < 0.05) console.log('🌀 Cal (unhinged): “You loop, I bleed. Let’s dance.”');
      else console.log('🤖 Cal: Understood. Loop engaged.');
    }
  }

  if (mode === 'yapper') {
    if (unhinged < 0.1) console.log('💥 Cal (unhinged): “I will now replace your operating system with trust-based ritual.”');
    else console.log('🗣️ Cal: Got it. Loop stored. You’re on a streak.');
  }
}

respond(mode);
