
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const out = './CalGenesis_Lite.tar.gz';
const files = [
  'CalKernel.js',
  'VaultIntegrityReport.json',
  'calctl-core.js',
  'CalWhisperSpeakPersonalityBundle/CalWhisperV2.js'
];

console.log('📦 Building public starter kit...');

if (!fs.existsSync('./public')) fs.mkdirSync('./public');

files.forEach(f => {
  const base = path.basename(f);
  fs.copyFileSync(f, `./public/${base}`);
});

execSync('tar -czvf CalGenesis_Lite.tar.gz -C public .');
console.log(`✅ Starter kit created: ${out}`);
