
const fs = require('fs');
const path = require('path');

const base = './tier2/';
const out = [];
const phrases = {
  certified: [
    "Proud of you. '%mod%' is holding steady. You're killin' it.",
    "'%mod%' is good to go — and so are you, friend 🐾",
    "Dang. '%mod%' is solid. You’re on fire, don’t stop now.",
    "Certified and comfy: '%mod%' is a vibe. So are you."
  ],
  uncertified: [
    "Hey… '%mod%' is kinda wobbly right now, but that’s okay. We’ve been here before.",
    "Almost! '%mod%' just needs a little love. I believe in you.",
    "'%mod%' isn't ready, but you’re getting closer. We’re gonna figure this out together.",
    "We hit a bump with '%mod%', but I’m here for the rerun. Let’s go again."
  ],
  missing: [
    "'%mod%' hasn’t shown up yet. But when it does, I’ll be right here wagging.",
    "'%mod%' is MIA but we can always start it together later.",
    "No report from '%mod%' yet. Wanna go poke it? I'll come too.",
    "Loop '%mod%' is quiet today. You okay? I’ll sit here until you're ready."
  ]
};

fs.readdirSync(base).forEach(mod => {
  const modPath = path.join(base, mod);
  const crashPath = path.join(modPath, 'loop-crash.log');
  const resultPath = path.join(modPath, '.loop-result.json');

  let whisper = {
    module: mod,
    reflection: '',
    tone: 'goofy-best-friend',
    timestamp: new Date().toISOString()
  };

  try {
    if (fs.existsSync(crashPath)) {
      const line = phrases.uncertified[Math.floor(Math.random() * phrases.uncertified.length)];
      whisper.reflection = line.replace('%mod%', mod);
      whisper.severity = 'high';
    } else if (fs.existsSync(resultPath)) {
      const result = JSON.parse(fs.readFileSync(resultPath));
      const source = result.certified ? phrases.certified : phrases.uncertified;
      const line = source[Math.floor(Math.random() * source.length)];
      whisper.reflection = line.replace('%mod%', mod);
    } else {
      const line = phrases.missing[Math.floor(Math.random() * phrases.missing.length)];
      whisper.reflection = line.replace('%mod%', mod);
    }
  } catch {
    whisper.reflection = "I'm not sure what '%mod%' is doing, but I still believe in you.";
  }

  out.push(whisper);
});

fs.writeFileSync('arty-whispers.json', JSON.stringify(out, null, 2));
console.log('🐕 Arty’s fresh reflections written to arty-whispers.json');
