// archive-test-results.js: Archives test results for each run
// Usage: node scripts/archive-test-results.js [--desc "description"]
// - Moves /concepts, /clusters, /index, /logs to /test-results/<timestamp or scenario>
// - Modular, non-recursive, under 250 lines
// - Logs actions to console

const fs = require('fs');
const path = require('path');

const DIRS = ['concepts', 'clusters', 'index', 'logs'];
const ARCHIVE_ROOT = path.join(process.cwd(), 'test-results');

function getTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function moveDir(src, dest) {
  if (!fs.existsSync(src)) return;
  if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
  fs.renameSync(src, dest);
  console.log(`Archived: ${src} -> ${dest}`);
}

function main() {
  const descIdx = process.argv.indexOf('--desc');
  const desc = descIdx !== -1 ? process.argv[descIdx + 1] : '';
  const ts = getTimestamp();
  const archiveDir = path.join(ARCHIVE_ROOT, desc ? `${ts}_${desc.replace(/\s+/g, '_')}` : ts);
  ensureDir(ARCHIVE_ROOT);
  ensureDir(archiveDir);
  DIRS.forEach(dir => moveDir(path.join(process.cwd(), dir), path.join(archiveDir, dir)));
  console.log(`Test results archived to: ${archiveDir}`);
}

if (require.main === module) main(); 