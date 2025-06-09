
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const outputName = `ritual-${Date.now()}.zip`;
const output = fs.createWriteStream(outputName);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log(`📦 Ritual deployed as ${outputName} (${archive.pointer()} bytes)`);
});

archive.on('error', err => { throw err });

archive.pipe(output);

[
  'CalDevTrace.json',
  'CalGitTrail.json',
  'CalIntentEcho.json',
  'CalTrustDelta.json',
  'CalSnapshot.json',
  'calWhisperThoughts.json',
  'calDevMemory.json',
  'CalSeal.json'
].forEach(file => {
  if (fs.existsSync(file)) archive.file(file, { name: file });
});

archive.finalize();
