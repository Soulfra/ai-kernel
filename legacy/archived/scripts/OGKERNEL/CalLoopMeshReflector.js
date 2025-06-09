
const fs = require('fs');

const agents = [
  'CalLoopAgentDaemon.js',
  'CalPromptRouter.js',
  'CalReflectionSummarizerV2.js',
  'CalWhisperSpeakPersonalityBundle/CalWhisperV2.js',
  'CalCoderAgent.js'
];

console.log('🧠 CalLoopMeshReflector running...');
let health = { total: agents.length, found: 0, missing: [] };

agents.forEach(f => {
  if (fs.existsSync(f)) {
    console.log(`✅ Found: ${f}`);
    health.found++;
  } else {
    console.log(`❌ Missing: ${f}`);
    health.missing.push(f);
  }
});

console.log(`🧩 Agent Mesh Coverage: ${health.found}/${health.total}`);
if (health.found === health.total) {
  console.log('🟢 Loop Mesh Status: FULLY LINKED.');
} else {
  console.log('🟡 Loop Mesh Status: INCOMPLETE.');
}
