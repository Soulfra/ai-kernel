
const fs = require('fs');

const reflection = {
  timestamp: new Date().toISOString(),
  kernel: {},
  loops: {},
  echo: {}
};

try {
  const kernelResult = JSON.parse(fs.readFileSync('.kernel-result.json'));
  reflection.kernel = kernelResult;
} catch {}

try {
  const loopResult = JSON.parse(fs.readFileSync('tier2-summary.json'));
  reflection.loops = loopResult;
} catch {}

try {
  const loopEcho = JSON.parse(fs.readFileSync('loop-echo.json'));
  reflection.echo = loopEcho;
} catch {}

fs.writeFileSync('runtime-intelligence.json', JSON.stringify(reflection, null, 2));
console.log('🪞 Runtime intelligence snapshot saved to runtime-intelligence.json');
