
const fs = require('fs');

const status = {
  timestamp: new Date().toISOString(),
  vault: fs.existsSync('./VaultIntegrityReport.json'),
  memory: fs.existsSync('./CalReflectionTrail.json'),
  whisper: fs.existsSync('./cal.lastWhisper.txt'),
  pulse: 'active',
  mesh: fs.existsSync('./core/CalLoopMeshReflector.js')
};

fs.writeFileSync('./core/loop.status.json', JSON.stringify(status, null, 2));
console.log('🫀 Cal loop pulse written to core/loop.status.json');
