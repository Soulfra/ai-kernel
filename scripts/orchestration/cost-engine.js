const fs = require('fs');
const path = require('path');

function estimateCost(length, provider = 'openai', context = 4096) {
  const baseRates = { openai: 0.001, claude: 0.0015, ollama: 0 };
  const rate = baseRates[provider] || baseRates.openai;
  const tokens = Math.ceil(length);
  const cost = tokens * rate;
  const markup = +(cost * 0.1).toFixed(6);
  const fallback = provider === 'openai'
    ? ['openai', 'claude', 'ollama']
    : provider === 'claude'
      ? ['claude', 'openai', 'ollama']
      : ['ollama', 'openai', 'claude'];
  return { tokens, estimated_cost: cost, provider, fallback, markup, context };
}

function logEstimate(obj) {
  const logFile = path.join(__dirname, '..', '..', 'logs', 'prompt-cost-estimates.json');
  let arr = [];
  if (fs.existsSync(logFile)) {
    try { arr = JSON.parse(fs.readFileSync(logFile, 'utf8')); } catch {}
  }
  arr.push(obj);
  fs.writeFileSync(logFile, JSON.stringify(arr, null, 2));
}

if (require.main === module) {
  const argv = require('yargs/yargs')(process.argv.slice(2))
    .option('length', { type: 'number', demandOption: true })
    .option('provider', { type: 'string', default: 'openai' })
    .option('context', { type: 'number', default: 4096 })
    .argv;
  const res = estimateCost(argv.length, argv.provider, argv.context);
  logEstimate({ timestamp: new Date().toISOString(), ...res });
  console.log(JSON.stringify(res, null, 2));
}

module.exports = { estimateCost, logEstimate };
