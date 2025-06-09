// reset-test-env.js: Resets all pipeline directories for a clean test run
// Usage: node scripts/reset-test-env.js [--help] [--desc "description"]
// - Deletes contents of /drop, /ready, /concepts, /clusters, /index, /logs
// - Logs actions to console
// - Modular, non-recursive, under 250 lines

const fs = require('fs');
const path = require('path');

const DIRS = ['drop', 'ready', 'concepts', 'clusters', 'index', 'logs'];

function cleanDir(dir) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    const p = path.join(dir, f);
    if (fs.lstatSync(p).isDirectory()) {
      fs.rmSync(p, { recursive: true, force: true });
    } else {
      fs.unlinkSync(p);
    }
  });
  console.log(`Cleaned: ${dir}`);
}

function main() {
  if (process.argv.includes('--help')) {
    console.log('Usage: node scripts/reset-test-env.js [--help] [--desc "description"]\nDeletes contents of all pipeline dirs for a clean test run.');
    process.exit(0);
  }
  const descIdx = process.argv.indexOf('--desc');
  const desc = descIdx !== -1 ? process.argv[descIdx + 1] : '';
  DIRS.forEach(dir => cleanDir(path.join(process.cwd(), dir)));
  if (desc) console.log(`Test reset description: ${desc}`);
  console.log('Test environment reset complete.');
}

if (require.main === module) main(); 