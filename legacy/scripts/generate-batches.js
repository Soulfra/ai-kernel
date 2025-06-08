/**
 * @file generate-batches.js
 * @description Scans test/migration directories and auto-generates batches.json for orchestrator-driven migration. Groups files by directory/type, avoids recursion, and outputs a flat batch structure. Usage: node scripts/generate-batches.js
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const TARGETS = [
  { dir: 'scripts/core/tests', batch: 'Orchestrator/Core Tests' },
  { dir: 'tests/core', batch: 'Core Tests' },
  { dir: 'tests/cli', batch: 'CLI Tests' },
  { dir: 'tests/unit', batch: 'Unit Tests' },
  { dir: 'tests/integration', batch: 'Integration Tests' },
  { dir: 'tests/migration', batch: 'Migration Tests' }
];

/**
 * Non-recursively list .js test files in a directory
 */
async function listTestFiles(dir) {
  try {
    const files = await fs.readdir(dir, { withFileTypes: true });
    return files
      .filter(f => f.isFile() && f.name.endsWith('.test.js'))
      .map(f => path.join(dir, f.name));
  } catch {
    return [];
  }
}

/**
 * Main: scan targets, group files, and write batches.json
 */
async function main() {
  const batches = [];
  for (const target of TARGETS) {
    const files = await listTestFiles(target.dir);
    if (files.length) {
      batches.push({
        id: `migration-batch-${batches.length + 1}`,
        type: 'migration',
        batch: target.batch,
        actions: files.map(f => ({ from: f, to: f.replace('scripts/core/tests', 'tests/unit').replace('tests/core', 'tests/unit') })),
        user: os.userInfo().username,
        status: 'pending'
      });
    }
  }
  const outPath = path.resolve(__dirname, 'batches.json');
  await fs.writeFile(outPath, JSON.stringify(batches, null, 2));
  console.log(`Generated ${batches.length} batches in ${outPath}`);
}

if (require.main === module) {
  main().catch(err => {
    console.error('Failed to generate batches:', err);
    process.exit(1);
  });
} 