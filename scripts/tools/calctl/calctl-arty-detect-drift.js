
const fs = require('fs');
const path = require('path');

const drift = {};
fs.readdirSync('./tier2/').forEach(mod => {
  const loopResult = path.join('./tier2', mod, '.loop-result.json');
  const arty = path.join('./tier2', mod, 'arty-sync.json');

  if (fs.existsSync(loopResult) && fs.existsSync(arty)) {
    const current = JSON.parse(fs.readFileSync(loopResult));
    const last = JSON.parse(fs.readFileSync(arty));

    if (last.state.certified && !current.certified) {
      drift[mod] = '🔻 certified → uncertified';
    }
  }
});

fs.writeFileSync('loop-drift.json', JSON.stringify(drift, null, 2));
console.log('⚠️ Loop drift report saved to loop-drift.json');
