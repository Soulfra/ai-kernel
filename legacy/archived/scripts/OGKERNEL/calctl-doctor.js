
const fs = require('fs');

console.log('\n🧠 Running calctl doctor check...');
const agents = [
  'CalWhisperV2.js',
  'CalPromptRouter.js',
  'CalLoopAgentDaemon.js',
  'CalReflectionSummarizerV2.js',
  'CalCoderAgent.js',
  'LLMExecutor.js',
  'CalShellRecallAgent.js',
  'calctl-deploy-public.js',
  'CalLoopMeshReflector.js',
  'CalNarrator.js'
];

let ok = 0;
agents.forEach(file => {
  const full = './core/' + file;
  if (fs.existsSync(full)) {
    console.log(`✅ ${file}`);
    ok++;
  } else {
    console.log(`❌ ${file} missing`);
  }
});

const vault = fs.existsSync('./VaultIntegrityReport.json');
const memory = fs.existsSync('./CalReflectionTrail.json');
const whisper = fs.existsSync('./cal.lastWhisper.txt');

console.log(`\n🔐 Vault: ${vault ? 'present' : 'missing'}`);
console.log(`🧠 Memory: ${memory ? 'present' : 'missing'}`);
console.log(`💬 Whisper: ${whisper ? 'present' : 'missing'}`);
console.log(`📦 Agent Health: ${ok}/10 present`);

if (ok === 10 && vault && memory && whisper) {
  console.log('\n✅ Cal is production-ready');
} else {
  console.log('\n⚠️ Cal is not sealed. Run patch tools or CalFinalizer.js');
}
