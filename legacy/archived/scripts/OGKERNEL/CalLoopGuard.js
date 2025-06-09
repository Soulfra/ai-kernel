
const fs = require('fs');
const required = [
  'CalWhisperV2.js', 'CalPromptRouter.js', 'CalLoopAgentDaemon.js',
  'CalReflectionSummarizerV2.js', 'CalCoderAgent.js', 'LLMExecutor.js',
  'CalShellRecallAgent.js', 'calctl-deploy-public.js', 'CalLoopMeshReflector.js',
  'CalNarrator.js'
];

console.log('🛡️ Verifying /core/ loop kernel structure...');
let good = 0;
required.forEach(file => {
  const path = './core/' + file;
  if (fs.existsSync(path)) {
    console.log(`✅ ${file}`);
    good++;
  } else {
    console.log(`❌ ${file} missing`);
  }
});
console.log(`📦 Kernel Agent Check: ${good}/10 present`);
