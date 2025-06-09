
const fs = require('fs');

const hasSnapshot = fs.existsSync('CalSnapshot.json');
const hasDrift = fs.existsSync('CalTrustDelta.json');
const hasThoughts = fs.existsSync('calWhisperThoughts.json');

console.log('🔍 Loop Detector:');

if (hasSnapshot && hasDrift) {
  console.log('🔁 Recommend activating: vault');
}
if (hasThoughts) {
  console.log('💬 Recommend activating: whispernet');
}
