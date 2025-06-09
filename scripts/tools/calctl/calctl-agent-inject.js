
const fs = require('fs');
const path = require('path');

const name = process.argv[2];
if (!name) {
  console.error('Usage: calctl agent:inject [name]');
  process.exit(1);
}

const dir = path.resolve(`agents/${name}`);
fs.mkdirSync(dir, { recursive: true });

const trustImport = "const { logTrace } = require('../../calTrustTrace');\n";

const agentBody = `module.exports = function(input) {
  logTrace('${name}', 'pass', 'agent initialized');
  return { echo: 'Agent ${name} received: ' + input };
};`;

fs.writeFileSync(path.join(dir, `${name}.js`), `// CalAgent: ${name}\n${trustImport}${agentBody}`);
fs.writeFileSync(path.join(dir, 'voice.json'), JSON.stringify({
  alias: name,
  voice: `alias:${name}`,
  voiceHash: 'hash:' + Math.random().toString(36).slice(2, 14)
}, null, 2));
fs.writeFileSync(path.join(dir, 'memory.json'), JSON.stringify({ runs: 0, lastRun: null }, null, 2));

console.log(`✅ Agent '${name}' scaffolded with trust logging in agents/${name}`);
