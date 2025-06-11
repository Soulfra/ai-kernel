// Automatically appends echo code to agents that lack it
const fs = require('fs');
const path = require('path');

const coreDir = path.join(__dirname, '../core');
const echoLine = "require('./CalTier10/CalRuntimeEcho.js');";

function patchAgents() {
  const files = fs.readdirSync(coreDir).filter(f => f.endsWith('.js') && !f.includes('CalRuntimeEcho'));
  let patched = 0;

  files.forEach(file => {
    const fullPath = path.join(coreDir, file);
    const content = fs.readFileSync(fullPath, 'utf-8');

    if (!content.includes(echoLine)) {
      fs.appendFileSync(fullPath, `\n${echoLine}\n`);
      console.log(`🔧 Patched echo into: ${file}`);
      patched++;
    }
  });

  console.log(`✅ Echo patching complete. ${patched} files updated.`);
}

patchAgents();
