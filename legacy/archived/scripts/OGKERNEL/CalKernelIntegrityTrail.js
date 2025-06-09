// CalKernelIntegrityTrail.js — hashes and records state of kernel agents
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const coreDir = path.join(__dirname);
const outputFile = path.join(__dirname, 'CalKernelSnapshot.json');

function hashFile(filepath) {
  const content = fs.readFileSync(filepath);
  return crypto.createHash('sha512').update(content).digest('hex');
}

console.log("🔒 Generating CalKernelSnapshot...");

const files = fs.readdirSync(coreDir).filter(f => f.endsWith('.js'));
const snapshot = {};

files.forEach(f => {
  const fullPath = path.join(coreDir, f);
  snapshot[f] = {
    hash: hashFile(fullPath),
    size: fs.statSync(fullPath).size,
    timestamp: new Date().toISOString()
  };
});

fs.writeFileSync(outputFile, JSON.stringify(snapshot, null, 2));
console.log("✅ CalKernelSnapshot written to CalKernelSnapshot.json");
