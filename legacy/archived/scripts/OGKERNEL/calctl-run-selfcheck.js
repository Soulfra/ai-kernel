
const { execSync } = require('child_process');

console.log("🧪 Running Full Cal Selfcheck...");

try {
  execSync('node core/CalAgentAutoMount.js', { stdio: 'inherit' });
  execSync('node core/CalLoopMeshReflector.js', { stdio: 'inherit' });
  console.log('✅ Selfcheck passed: all core agents operational.');
} catch (e) {
  console.log('❌ Selfcheck failed. Some agents are missing or broken.');
}
