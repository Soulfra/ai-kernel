
const fs = require('fs');
const path = require('path');

const base = './tier2/';
const { logTrace } = require('./calTrustTrace');

function protectAgent(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('try {')) return; // already patched

  const wrapped = `
const { logTrace } = require('../../calTrustTrace');
try {
${content.replace(/^/gm, '  ')}
} catch (err) {
  logTrace('${filePath}', 'fail', err.message);
}
`;
  fs.writeFileSync(filePath, wrapped);
  console.log(`🛡️ Protected: ${filePath}`);
}

fs.readdirSync(base).forEach(mod => {
  const modPath = path.join(base, mod);
  if (!fs.statSync(modPath).isDirectory()) return;
  const files = fs.readdirSync(modPath).filter(f => f.endsWith('.js') && !f.startsWith('calctl'));
  files.forEach(f => protectAgent(path.join(modPath, f)));
});
