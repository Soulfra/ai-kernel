
const fs = require('fs');
const logs = ['CalSnapshot.json', 'CalTrustDelta.json', 'CalSeal.json'];

logs.forEach(f => {
  if (!fs.existsSync(f)) return;
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n').length;
  console.log(`📄 ${f} → ${lines} lines`);
});
