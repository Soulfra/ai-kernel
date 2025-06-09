
const fs = require('fs');

const logs = ['CalDevTrace.json', 'CalSnapshot.json', 'CalTrustDelta.json', 'CalSeal.json'];
const backup = {};

logs.forEach(f => {
  try {
    const raw = fs.readFileSync(f, 'utf8');
    backup[f] = JSON.parse(raw);
  } catch {
    backup[f] = { failed: true };
  }
});

fs.writeFileSync('kernel-recovery.json', JSON.stringify(backup, null, 2));
console.log('🧬 Kernel recovery state saved to kernel-recovery.json');
