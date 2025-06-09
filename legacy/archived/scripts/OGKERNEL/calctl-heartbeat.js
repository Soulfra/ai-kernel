
const fs = require('fs');

const status = {
  vault: fs.existsSync('./VaultIntegrityReport.json'),
  memory: fs.existsSync('./CalReflectionTrail.json'),
  whisper: fs.existsSync('./cal.lastWhisper.txt'),
  timestamp: new Date().toISOString()
};

fs.writeFileSync('./core/last.status.json', JSON.stringify(status, null, 2));
console.log('✅ Cal heartbeat written to /core/last.status.json');
