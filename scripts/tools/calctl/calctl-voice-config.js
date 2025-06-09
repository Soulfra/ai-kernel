
const fs = require('fs');
const crypto = require('crypto');

const alias = process.argv[2] || 'anon';
const seed = process.argv[3] || alias + '-calwhisper';

const hash = crypto.createHash('sha256').update(seed).digest('hex').slice(0, 12);
const profile = {
  alias: alias,
  voice: `alias:${alias}`,
  voiceHash: `hash:${hash}`,
  style: {
    prefix: '🧠 ',
    error: '⚠️ nope:',
    success: '✅ good.',
    warn: '🟡 caution:'
  }
};

fs.writeFileSync('calVoiceProfile.json', JSON.stringify(profile, null, 2));
console.log(`🎤 Voice profile created: ${alias} (${hash})`);
