// Validation Script: Runs all validation checks, logs results, exits with status via orchestrator
const fs = require('fs');
const path = require('path');
const LogOrchestrator = require('./core/log-orchestrator');
const TelemetryManager = require('./core/telemetry-manager');

function checkFileLength(file) {
  const lines = fs.readFileSync(file, 'utf8').split('\n').length;
  return lines <= 250;
}

function checkFileName(file) {
  return /^[a-z0-9\-]+\.[a-z]+$/.test(path.basename(file));
}

function checkFrontmatter(content) {
  return /---[\s\S]*title:[\s\S]*description:[\s\S]*lastUpdated:[\s\S]*version:[\s\S]*---/.test(content);
}

function validateFile(file) {
  const content = fs.readFileSync(file, 'utf8');
  const results = [];
  if (!checkFileLength(file)) results.push('File too long');
  if (!checkFileName(file)) results.push('Invalid file name');
  if (file.endsWith('.md') && !checkFrontmatter(content)) results.push('Missing/invalid frontmatter');
  // TODO: Add dependency/cycle checks
  return results;
}

function walk(dir, ext) {
  let files = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) files = files.concat(walk(p, ext));
    else if (!ext || p.endsWith(ext)) files.push(p);
  }
  return files;
}

async function main() {
  if (process.argv.includes('--help')) {
    console.log('Usage: node validate-all.js [--help]\nRuns all validation checks on the codebase.');
    process.exit(0);
  }
  const logger = new LogOrchestrator();
  const telemetry = new TelemetryManager();
  logger.info('Validation started');
  logger.emit('task:event', { type: 'validation_started' });
  const files = walk('.', null);
  let allPassed = true;
  files.forEach(file => {
    const results = validateFile(file);
    if (results.length) {
      allPassed = false;
      logger.error('Validation failed', { file, issues: results });
      telemetry.recordMetric('validation_error', 1, { file, issues: results });
      logger.emit('task:event', { type: 'validation_error', file, issues: results });
    }
  });
  if (allPassed) {
    logger.info('All validations passed');
    logger.emit('task:event', { type: 'validation_passed' });
    process.exit(0);
  } else {
    logger.error('Validation failed');
    logger.emit('task:event', { type: 'validation_failed' });
    process.exit(1);
  }
}

if (require.main === module) main();
// Documentation: All logging and error handling is via orchestrator/telemetry injection. Task events are emitted for traceability.

// TODO: Integrate with orchestrators, add dependency/cycle checks, and CI support 