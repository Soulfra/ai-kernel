
const fs = require('fs');
const path = require('path');

const base = './tier2/';
const echoLog = {};

fs.readdirSync(base).forEach(mod => {
  const modPath = path.join(base, mod);
  const agents = fs.readdirSync(modPath).filter(f => f.endsWith('.js') && !f.startsWith('calctl'));
  echoLog[mod] = [];

  agents.forEach(agent => {
    try {
      const runner = require(path.resolve(modPath, agent));
      if (typeof runner === 'function') {
        runner('echo run');
        echoLog[mod].push({ agent, status: 'ok' });
      }
    } catch (e) {
      echoLog[mod].push({ agent, status: 'fail', reason: e.message });
    }
  });
});

fs.writeFileSync('loop-echo.json', JSON.stringify(echoLog, null, 2));
console.log('📣 Loop echo report saved to loop-echo.json');
