
const fs = require('fs');

const lockpoint = {
  timestamp: new Date().toISOString(),
  version: "v1.0.0",
  kernel: fs.existsSync('.kernel-result.json') ? JSON.parse(fs.readFileSync('.kernel-result.json')) : {},
  loops: fs.existsSync('tier2-summary.json') ? JSON.parse(fs.readFileSync('tier2-summary.json')) : {},
  snapshot: fs.existsSync('CalSnapshot.json') ? JSON.parse(fs.readFileSync('CalSnapshot.json')) : {}
};

fs.writeFileSync('calLockpoint.json', JSON.stringify(lockpoint, null, 2));
console.log('🧊 Kernel + loop trust lockpoint written to calLockpoint.json');
