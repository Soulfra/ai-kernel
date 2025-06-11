
const fs = require('fs');

const state = {
  session: new Date().toISOString(),
  whisperCount: 0,
  uptime: process.uptime(),
  agentMapExists: fs.existsSync('./core/calctl-agentmap.json'),
  meshLinked: fs.existsSync('./core/CalLoopMeshReflector.js')
};

fs.writeFileSync('./core/cal_meta_state.json', JSON.stringify(state, null, 2));
console.log('🧠 Meta state snapshot written to /core/');
