
const execSync = require('child_process').execSync;

console.log('🌀 Running all Tier 1 loops...');
[
  'calctl-kernel-status.js',
  'calctl-loop-detect.js',
  'calctl-whisper-reflect.js',
  'calctl-whisper-mirror-v2.js',
  'calctl-seal.js',
  'calctl-trust-visualize.js'
].forEach(cmd => {
  try {
    console.log(`\n▶️ ${cmd}`);
    execSync(`node ${cmd}`, { stdio: 'inherit' });
  } catch (e) {
    console.warn(`❌ Failed: ${cmd}`);
  }
});
