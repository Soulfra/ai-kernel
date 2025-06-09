
const fs = require('fs');

const trail = './core/CalKernelIntegrityTrail.json';
const record = {
  timestamp: new Date().toISOString(),
  vault: fs.existsSync('./VaultIntegrityReport.json'),
  memory: fs.existsSync('./CalReflectionTrail.json'),
  whisper: fs.existsSync('./cal.lastWhisper.txt'),
  agentMap: fs.existsSync('./core/calctl-agentmap.json'),
  meshReflector: fs.existsSync('./core/CalLoopMeshReflector.js')
};

let current = [];
if (fs.existsSync(trail)) {
  current = JSON.parse(fs.readFileSync(trail, 'utf8'));
}

current.push(record);
fs.writeFileSync(trail, JSON.stringify(current.slice(-20), null, 2));
console.log('✅ Boot integrity log appended to CalKernelIntegrityTrail.json');
