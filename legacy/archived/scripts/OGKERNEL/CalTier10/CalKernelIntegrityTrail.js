// Writes full system state + hash signatures to CalKernelSnapshot.json
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const corePath = path.join(__dirname, '../core/');
const outputFile = path.join(__dirname, '../core/CalKernelSnapshot.json');

function getHash(file) {
  const content = fs.readFileSync(file);
  return crypto.createHash('sha512').update(content).digest('hex');
}

function scanCore() {
  const files = fs.readdirSync(corePath).filter(f => f.endsWith('.js'));
  const snapshot = {};
  files.forEach(f => {
    const fullPath = path.join(corePath, f);
    snapshot[f] = {
      hash: getHash(fullPath),
      timestamp: new Date().toISOString(),
      size: fs.statSync(fullPath).size
    };
  });
  fs.writeFileSync(outputFile, JSON.stringify(snapshot, null, 2));
  console.log('✅ CalKernelIntegrityTrail written to snapshot.');
}

scanCore();