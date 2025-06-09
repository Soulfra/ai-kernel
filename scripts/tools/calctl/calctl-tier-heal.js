
const fs = require('fs');
const path = require('path');

const mod = process.argv[2];
if (!mod) {
  console.error('Usage: calctl tier:heal [module]');
  process.exit(1);
}

const modPath = `./tier2/${mod}/`;
if (!fs.existsSync(modPath)) {
  console.error(`❌ Module '${mod}' not found`);
  process.exit(1);
}

const files = fs.readdirSync(modPath).filter(f => f.endsWith('.json'));
files.forEach(file => {
  const full = path.join(modPath, file);
  let content = {};
  try {
    content = JSON.parse(fs.readFileSync(full, 'utf8'));
    if (Object.keys(content).length === 0) {
      content.seeded = true;
      content.timestamp = new Date().toISOString();
      fs.writeFileSync(full, JSON.stringify(content, null, 2));
      console.log(`🛠 Healed: ${file}`);
    }
  } catch {
    fs.writeFileSync(full, JSON.stringify({ healed: true }, null, 2));
    console.log(`🩹 Overwrote corrupted: ${file}`);
  }
});
