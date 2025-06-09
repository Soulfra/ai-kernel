
const fs = require('fs');
const execSync = require('child_process').execSync;

const base = './tier2/';
const summary = {};

fs.readdirSync(base).forEach(mod => {
  if (!fs.existsSync(`${base}${mod}/.loop.json`)) return;
  try {
    console.log(`🧪 Testing module: ${mod}`);
    const agents = fs.readdirSync(`${base}${mod}`).filter(f => f.endsWith('.js') && !f.startsWith('calctl'));
    const agentToRun = agents[0];
    if (agentToRun) {
      const code = fs.readFileSync(`${base}${mod}/${agentToRun}`, 'utf8');
      if (code.includes('module.exports')) {
        const temp = require(`.${base}${mod}/${agentToRun}`);
        if (typeof temp === 'function') temp("test input");
      }
    }
    execSync(`node calctl-tier-certify.js ${mod}`);
    const result = JSON.parse(fs.readFileSync(`${base}${mod}/.loop-result.json`));
    summary[mod] = result.certified ? '✅' : '❌';
  } catch (e) {
    summary[mod] = '💥 crash';
  }
});

fs.writeFileSync('tier2-summary.json', JSON.stringify(summary, null, 2));
console.log('📊 Autotest summary written to tier2-summary.json');
