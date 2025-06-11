#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const EXCLUDED_DIRS = [
  'backups',
  'test-suite',
  'CLARITY_ENGINE_DOCS/backups',
  'CLARITY_ENGINE_DOCS/CLARITY_ENGINE_DOCS/archive',
];

const RULES_PATH = path.join(process.cwd(), '.cursorrules.json');
const rules = JSON.parse(fs.readFileSync(RULES_PATH, 'utf8'));

function runStep(cmd, desc, root) {
  console.log(`\n=== ${desc} ===`);
  try {
    const fullCmd = root ? `${cmd} ${root}` : cmd;
    const output = execSync(fullCmd, { encoding: 'utf8', stdio: 'pipe' });
    console.log(output);
    return output;
  } catch (err) {
    console.error(`Error running ${desc}:`, err.stdout || err.message);
    return null;
  }
}

function summarizeValidation(log) {
  const summary = {};
  const lines = log.split('\n');
  for (const line of lines) {
    if (line.startsWith('Total Files:')) summary.total = line.split(':')[1].trim();
    if (line.startsWith('Passed:')) summary.passed = line.split(':')[1].trim();
    if (line.startsWith('Failed:')) summary.failed = line.split(':')[1].trim();
    if (line.startsWith('- Line Count Issues:')) summary.lineCount = line.split(':')[1].trim();
    if (line.startsWith('- Missing Fields:')) summary.missingFields = line.split(':')[1].trim();
    if (line.startsWith('- Missing Sections:')) summary.missingSections = line.split(':')[1].trim();
    if (line.startsWith('- Broken Links:')) summary.brokenLinks = line.split(':')[1].trim();
    if (line.startsWith('- Circular Dependencies:')) summary.circular = line.split(':')[1].trim();
  }
  return summary;
}

function logSummary(summary) {
  console.log('\n=== Documentation Validation Summary ===');
  Object.entries(summary).forEach(([k, v]) => {
    console.log(`${k}: ${v}`);
  });
}

function main() {
  const args = process.argv.slice(2);
  const root = args[0] || 'docs/';
  // 1. Validate docs (now using rules from .cursorrules.json)
  const validationLog = runStep('node scripts/validate-docs.js', 'Documentation Validation', root);
  const summary = summarizeValidation(validationLog || '');
  logSummary(summary);

  // 2. Auto-fix docs (rules loaded in fix-docs.js)
  runStep('node scripts/documentation/fix-docs.js', 'Documentation Auto-Fix', root);

  // 3. Re-validate and summarize
  const postFixLog = runStep('node scripts/validate-docs.js', 'Post-Fix Validation', root);
  const postSummary = summarizeValidation(postFixLog || '');
  console.log('\n=== Post-Fix Validation Summary ===');
  Object.entries(postSummary).forEach(([k, v]) => {
    console.log(`${k}: ${v}`);
  });

  // 4. Optionally, could add git add/commit here for CI/pre-commit
}

if (require.main === module) {
  main();
} 