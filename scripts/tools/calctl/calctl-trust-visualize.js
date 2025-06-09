
const fs = require('fs');

const delta = fs.existsSync('CalTrustDelta.json') ? JSON.parse(fs.readFileSync('CalTrustDelta.json')) : {};
const snapshot = fs.existsSync('CalSnapshot.json') ? JSON.parse(fs.readFileSync('CalSnapshot.json')) : {};
const thoughts = fs.existsSync('calWhisperThoughts.json') ? JSON.parse(fs.readFileSync('calWhisperThoughts.json')) : {};

const trustmap = {
  timestamp: new Date().toISOString(),
  driftFiles: delta.delta || [],
  snapshotFiles: Object.keys(snapshot),
  recentThoughts: thoughts.sessionThoughts || []
};

fs.writeFileSync('trustmap.json', JSON.stringify(trustmap, null, 2));
console.log('📊 Trust map written to trustmap.json');
