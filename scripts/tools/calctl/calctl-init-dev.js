
const fs = require('fs');
const path = require('path');

const logFiles = [
  'CalDevTrace.json',
  'CalGitTrail.json',
  'CalIntentEcho.json',
  'CalTrustDelta.json',
  'CalSnapshot.json',
  'calDevMemory.json'
];

console.log('\n⚙️ Initializing CalRiven Dev Environment...');
logFiles.forEach(file => {
  const fullPath = path.resolve(file);
  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, JSON.stringify({ initialized: true, time: new Date().toISOString() }, null, 2));
    console.log(`✅ Created ${file}`);
  } else {
    console.log(`🔄 ${file} already exists.`);
  }
});

const structure = {
  project: path.basename(process.cwd()),
  startedAt: new Date().toISOString(),
  sigil: null,
  agents: ['CalShell', 'CalSnapshot', 'CalDriftScan', 'CalGitEcho'],
  logs: logFiles
};

fs.writeFileSync('CalDevSuite_Structure.json', JSON.stringify(structure, null, 2));
console.log('\n🧬 Dev Suite structure recorded. Ready to build with trust.');
