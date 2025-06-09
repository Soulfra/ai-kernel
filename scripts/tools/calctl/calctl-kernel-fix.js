
const fs = require('fs');
const memoryFiles = [
  { path: 'CalDevTrace.json', seed: [] },
  { path: 'CalTrustDelta.json', seed: [] },
  { path: 'CalSnapshot.json', seed: [] },
  { path: 'CalSeal.json', seed: { kernel: true, timestamp: new Date().toISOString() } }
];

memoryFiles.forEach(file => {
  try {
    if (!fs.existsSync(file.path)) {
      fs.writeFileSync(file.path, JSON.stringify(file.seed, null, 2));
      console.log(`📄 Seeded ${file.path}`);
    } else {
      const data = fs.readFileSync(file.path);
      JSON.parse(data); // confirm valid JSON
    }
  } catch {
    fs.writeFileSync(file.path, JSON.stringify(file.seed, null, 2));
    console.log(`🩹 Repaired corrupted ${file.path}`);
  }
});

console.log('🛠 Kernel memory files are now seeded and validated.');
