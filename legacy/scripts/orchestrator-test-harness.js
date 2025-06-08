#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const EXCLUDED_DIRS = [
  'backups',
  'test-suite',
  'CLARITY_ENGINE_DOCS/backups',
  'CLARITY_ENGINE_DOCS/CLARITY_ENGINE_DOCS/archive',
];

function runTestFile(file) {
  try {
    const output = execSync(`npx jest ${file} --runInBand --silent`, { encoding: 'utf8' });
    return { file, output, success: true };
  } catch (err) {
    return { file, output: err.stdout || err.message, success: false };
  }
}

function checkForInitError(output) {
  if (/Log stream for level 'error' is not initialized/.test(output)) {
    return 'Missing LogOrchestrator initialization. Add beforeAll(async () => { logger = new LogOrchestrator(); await logger.initialize(); });';
  }
  return null;
}

function main() {
  const args = process.argv.slice(2);
  const root = args[0] || path.join('scripts', 'core', 'tests');
  const files = fs.readdirSync(root).filter(f => f.endsWith('.test.js') && !EXCLUDED_DIRS.some(ex => f.includes(ex)));
  let failures = 0;
  for (const file of files) {
    const abs = path.join(root, file);
    const result = runTestFile(abs);
    if (!result.success) {
      failures++;
      console.log(`\n--- FAILURE: ${file} ---`);
      console.log(result.output);
      const suggestion = checkForInitError(result.output);
      if (suggestion) {
        console.log(`\nSUGGESTED PATCH: ${suggestion}`);
      }
    } else {
      console.log(`PASS: ${file}`);
    }
  }
  if (failures === 0) {
    console.log('\nAll orchestrator/core tests passed!');
  } else {
    console.log(`\n${failures} test(s) failed. See above for details and suggestions.`);
  }
}

if (require.main === module) {
  main();
} 