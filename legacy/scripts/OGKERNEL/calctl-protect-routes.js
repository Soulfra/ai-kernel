
const fs = require('fs');
const { execSync } = require('child_process');

const agents = fs.readdirSync('./core').filter(f => f.endsWith('.js'));
console.log('🔐 Protecting core agents...');

agents.forEach(file => {
  try {
    execSync(`chmod 444 ./core/${file}`);
    console.log(`✅ Locked: ${file}`);
  } catch {
    console.log(`❌ Failed to lock: ${file}`);
  }
});
