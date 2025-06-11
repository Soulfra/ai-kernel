// setup-test-env.js: Automates test environment setup for the pipeline
// Usage: node scripts/setup-test-env.js [--help]
// - Creates /drop and /ready directories if missing
// - Copies sample files from /test-docs/ if available
// - Prompts user to add files if none found
// - Logs actions to console

const fs = require('fs');
const path = require('path');

const DROP_DIR = path.join(process.cwd(), 'drop');
const READY_DIR = path.join(process.cwd(), 'ready');
const TEST_DOCS_DIR = path.join(process.cwd(), 'test-docs');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  } else {
    console.log(`Directory exists: ${dir}`);
  }
}

function copySampleFiles() {
  if (!fs.existsSync(TEST_DOCS_DIR)) {
    console.log('No /test-docs/ directory found. Please add test files to /drop/.');
    return;
  }
  const files = fs.readdirSync(TEST_DOCS_DIR).filter(f => !f.startsWith('.'));
  if (files.length === 0) {
    console.log('No sample files found in /test-docs/. Please add test files to /drop/.');
    return;
  }
  files.forEach(file => {
    const src = path.join(TEST_DOCS_DIR, file);
    const dest = path.join(DROP_DIR, file);
    fs.copyFileSync(src, dest);
    console.log(`Copied sample file: ${file} -> /drop/`);
  });
}

function main() {
  if (process.argv.includes('--help')) {
    console.log('Usage: node scripts/setup-test-env.js [--help]\nCreates /drop and /ready, copies sample files from /test-docs/ if available.');
    process.exit(0);
  }
  ensureDir(DROP_DIR);
  ensureDir(READY_DIR);
  copySampleFiles();
  console.log('Test environment setup complete. Add your test files to /drop/ if needed.');
}

if (require.main === module) main(); 