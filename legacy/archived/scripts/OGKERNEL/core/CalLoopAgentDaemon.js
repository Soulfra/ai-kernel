
const fs = require('fs');

console.log('🧠 CalLoopAgentDaemon initializing...');

const agents = [
  { name: 'ReflectAgent', path: './CalReflectionSummarizerV2.js' },
  { name: 'PromptRouter', path: './CalPromptRouter.js' }
];

let healthy = true;

agents.forEach(agent => {
  if (fs.existsSync(agent.path)) {
    console.log(`✅ ${agent.name} loaded from ${agent.path}`);
    require(agent.path);
  } else {
    console.log(`❌ ${agent.name} missing at ${agent.path}`);
    healthy = false;
  }
});

if (healthy) {
  console.log('🟢 All loop agents active.');
} else {
  console.log('🟡 Some agents were missing. Loop will attempt partial run.');
}
