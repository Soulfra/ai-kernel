
const fs = require('fs');
const patch = `const { logTrace } = require('../../calTrustTrace');`;

function injectTrace(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  if (!code.includes('logTrace')) {
    const injected = patch + '\n' + code;
    fs.writeFileSync(filePath, injected);
    console.log(`✅ Patched trust logger into: ${filePath}`);
  }
}

const base = './tier2/';
fs.readdirSync(base).forEach(mod => {
  const files = fs.readdirSync(`${base}${mod}`).filter(f => f.endsWith('.js') && !f.startsWith('calctl'));
  files.forEach(f => injectTrace(`${base}${mod}/${f}`));
});
