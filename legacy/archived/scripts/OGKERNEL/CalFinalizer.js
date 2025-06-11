
const fs = require('fs');
const path = require('path');

const agentMap = {
  "CalWhisper": "CalWhisperSpeakPersonalityBundle/CalWhisperV2.js",
  "CalPromptRouter": "CalPromptRouter.js",
  "CalLoopAgentDaemon": "CalLoopAgentDaemon.js",
  "CalReflectionSummarizer": "CalReflectionSummarizerV2.js",
  "CalCoderAgent": "CalCoderAgent.js",
  "LLMExecutor": "LLMExecutor.js",
  "CalShellRecall": "CalShellRecallAgent.js",
  "CalDeploy": "calctl-deploy-public.js",
  "CalMeshReflector": "CalLoopMeshReflector.js",
  "CalNarrator": "CalNarrator.js"
};

if (!fs.existsSync('./core')) fs.mkdirSync('./core');

Object.entries(agentMap).forEach(([key, src]) => {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, `./core/${path.basename(src)}`);
    console.log(`✅ Copied ${key} to /core/`);
  } else {
    console.log(`❌ Missing ${key}: ${src}`);
  }
});

fs.writeFileSync('./core/calctl-agentmap.json', JSON.stringify(agentMap, null, 2));
console.log('🧠 Finalizer complete: /core/ hydrated + agentmap written.');
