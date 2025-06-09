
const fs = require('fs');
const { execSync } = require('child_process');

const files = [
  'CalShell.js',
  'calctl-kernel-certify.js',
  'calctl-kernel-fix.js',
  'calctl-kernel-recovery.js',
  'calctl-deck-link-arty.js',
  'calTrustGraph.js',
  'calctl-arty-reflect.js',
  'calctl-reflect-runtime.js',
  'calNode-ArtyDaemon.js'
];

const zipName = 'calDevSuite-TrustReady.zip';

const AdmZip = require('adm-zip');
const zip = new AdmZip();

files.forEach(file => {
  if (fs.existsSync(file)) {
    zip.addLocalFile(file);
  }
});

zip.writeZip(zipName);
console.log(`📦 Dev suite zipped → ${zipName}`);
