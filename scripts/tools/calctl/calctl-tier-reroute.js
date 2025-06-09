
const fs = require('fs');
const path = require('path');

const base = './tier2/';
const misplaced = fs.readdirSync(base).filter(f => f.endsWith('.js'));

misplaced.forEach(file => {
  const mod = file.replace('Agent.js', '').toLowerCase();
  const newPath = path.join(base, mod);
  if (!fs.existsSync(newPath)) fs.mkdirSync(newPath);
  fs.renameSync(path.join(base, file), path.join(newPath, file));
  console.log(`📦 Moved ${file} to /tier2/${mod}/`);
});
