
const fs = require('fs');

const modules = fs.readdirSync('./tier2/');
const trustSnapshot = {};

modules.forEach(mod => {
  const file = `./tier2/${mod}/arty-sync.json`;
  if (fs.existsSync(file)) {
    const sync = JSON.parse(fs.readFileSync(file));
    trustSnapshot[mod] = sync.state;
  }
});

fs.writeFileSync('deck-trust.json', JSON.stringify(trustSnapshot, null, 2));
console.log('🧠 Deck trust map written to deck-trust.json');
