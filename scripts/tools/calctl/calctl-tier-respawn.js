
const fs = require('fs');
const execSync = require('child_process').execSync;

const summary = JSON.parse(fs.readFileSync('tier2-summary.json'));
Object.entries(summary).forEach(([mod, status]) => {
  if (status === '❌' || status === '💥 crash') {
    console.log(`🩺 Respawning: ${mod}`);
    execSync(`node calctl-tier-heal.js ${mod}`);
    execSync(`node calctl-tier-certify.js ${mod}`);
  }
});
