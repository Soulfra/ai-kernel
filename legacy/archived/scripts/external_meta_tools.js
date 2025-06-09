#!/usr/bin/env node
/**
 * external_meta_tools.js
 * CLI tool for managing external/agency copies of project_meta.
 *
 * Standards:
 *   - All logging via LogOrchestrator (no direct console.log)
 *   - All metrics/spans via TelemetryManager
 *   - Validation scripts run after copy/merge
 *   - Modular, non-recursive, testable
 *
 * Usage:
 *   node scripts/external_meta_tools.js create-external-copy
 *   node scripts/external_meta_tools.js zip-external-copy
 *   node scripts/external_meta_tools.js diff-external-copy
 *   node scripts/external_meta_tools.js merge-external-copy (stub)
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const LogOrchestrator = require('./core/log-orchestrator');
const TelemetryManager = require('./core/telemetry-manager');

const META_DIR = 'project_meta';
const EXTERNAL_DIR = 'project_meta_external';
const EXTERNAL_ZIP = 'project_meta_external.zip';
const LOG_DIR = './logs/debug';
const METRICS_DIR = './logs/metrics';

const logger = new LogOrchestrator({ logDir: LOG_DIR });
const telemetry = new TelemetryManager({ metricsDir: METRICS_DIR });

async function runValidationScripts(context) {
  const scripts = [
    'scripts/validate-logging.js',
    'scripts/validate-telemetry.js',
    'scripts/validate-docs.js'
  ];
  for (const script of scripts) {
    try {
      const span = await telemetry.startSpan(`validation:${path.basename(script)}`, context);
      execSync(`node ${script}`, { stdio: 'pipe' });
      await telemetry.recordMetric('validation_success', 1, { script, ...context });
      await logger.info('Validation passed', { script, ...context });
      await telemetry.endSpan(`validation:${path.basename(script)}`, context);
    } catch (e) {
      await telemetry.recordMetric('validation_failure', 1, { script, error: e.message, ...context });
      await logger.error('Validation failed', { script, error: e.message, ...context });
      await telemetry.endSpan(`validation:${path.basename(script)}`, context);
    }
  }
}

async function createExternalCopy() {
  const span = await telemetry.startSpan('createExternalCopy');
  try {
    if (fs.existsSync(EXTERNAL_DIR)) {
      fs.rmSync(EXTERNAL_DIR, { recursive: true, force: true });
      await logger.info('Removed old external copy', { dir: EXTERNAL_DIR });
    }
    execSync(`cp -R ${META_DIR} ${EXTERNAL_DIR}`);
    const readmeExternal = path.join(EXTERNAL_DIR, 'README_EXTERNAL.md');
    const readme = path.join(EXTERNAL_DIR, 'README.md');
    if (fs.existsSync(readmeExternal)) {
      fs.copyFileSync(readmeExternal, readme);
    }
    await logger.info('External copy created', { dir: EXTERNAL_DIR });
    await telemetry.recordMetric('external_copy_created', 1, { dir: EXTERNAL_DIR });
    await runValidationScripts({ operation: 'createExternalCopy' });
    await telemetry.endSpan('createExternalCopy');
  } catch (e) {
    await logger.error('Error creating external copy', { error: e.message });
    await telemetry.recordMetric('external_copy_error', 1, { error: e.message });
    await telemetry.endSpan('createExternalCopy');
    process.exit(1);
  }
}

async function zipExternalCopy() {
  const span = await telemetry.startSpan('zipExternalCopy');
  try {
    if (!fs.existsSync(EXTERNAL_DIR)) {
      await logger.error('External directory does not exist', { dir: EXTERNAL_DIR });
      await telemetry.endSpan('zipExternalCopy');
      process.exit(1);
    }
    if (fs.existsSync(EXTERNAL_ZIP)) {
      fs.rmSync(EXTERNAL_ZIP);
      await logger.info('Removed old zip', { zip: EXTERNAL_ZIP });
    }
    execSync(`zip -r ${EXTERNAL_ZIP} ${EXTERNAL_DIR}`);
    await logger.info('External copy zipped', { zip: EXTERNAL_ZIP });
    await telemetry.recordMetric('external_copy_zipped', 1, { zip: EXTERNAL_ZIP });
    await telemetry.endSpan('zipExternalCopy');
  } catch (e) {
    await logger.error('Error zipping external copy', { error: e.message });
    await telemetry.recordMetric('external_zip_error', 1, { error: e.message });
    await telemetry.endSpan('zipExternalCopy');
    process.exit(1);
  }
}

async function diffExternalCopy() {
  const span = await telemetry.startSpan('diffExternalCopy');
  try {
    if (!fs.existsSync(EXTERNAL_DIR)) {
      await logger.error('External directory does not exist', { dir: EXTERNAL_DIR });
      await telemetry.endSpan('diffExternalCopy');
      process.exit(1);
    }
    let result = '';
    try {
      result = execSync(`diff -qr ${META_DIR} ${EXTERNAL_DIR}`, { encoding: 'utf8' });
    } catch (e) {
      // diff returns nonzero exit code if differences found
      result = e.stdout || '';
    }
    await logger.info('Diff completed', { result });
    await telemetry.recordMetric('external_copy_diff', 1, { diffLines: result.split('\n').length });
    await telemetry.endSpan('diffExternalCopy');
    // Print summary to user
    process.stdout.write(result || 'No differences found.\n');
  } catch (e) {
    await logger.error('Error diffing external copy', { error: e.message });
    await telemetry.recordMetric('external_diff_error', 1, { error: e.message });
    await telemetry.endSpan('diffExternalCopy');
    process.exit(1);
  }
}

async function mergeExternalCopy() {
  const span = await telemetry.startSpan('mergeExternalCopy');
  // TODO: Implement merge logic (manual review, selective copy, etc.)
  await logger.info('Merge functionality not yet implemented.');
  await telemetry.endSpan('mergeExternalCopy');
}

function printUsage() {
  process.stdout.write(`Usage: node scripts/external_meta_tools.js <command>\n` +
    'Commands:\n' +
    '  create-external-copy   Create a fresh external/agency copy of project_meta\n' +
    '  zip-external-copy      Zip the external copy for sharing\n' +
    '  diff-external-copy     Show differences between main and external copy\n' +
    '  merge-external-copy    (Stub) Merge changes from external copy back\n');
}

// CLI parsing
(async () => {
  await logger.initialize();
  await telemetry.initialize();
  const cmd = process.argv[2];
  switch (cmd) {
    case 'create-external-copy':
      await createExternalCopy();
      break;
    case 'zip-external-copy':
      await zipExternalCopy();
      break;
    case 'diff-external-copy':
      await diffExternalCopy();
      break;
    case 'merge-external-copy':
      await mergeExternalCopy();
      break;
    default:
      printUsage();
      process.exit(1);
  }
  await logger.cleanup();
  await telemetry.cleanup();
})();

// TODO: Add unit tests for each function (use Jest or similar)
// TODO: Modularize further if needed for >250 lines per function
// TODO: Add config-driven pruning, integrity checks, and smart diff/merge
// Example usage of orchestrator logging:
//   await logger.info('Action', { context: 'example' }); 