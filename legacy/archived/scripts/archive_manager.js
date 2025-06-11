#!/usr/bin/env node
/**
 * archive_manager.js
 * Modular CLI for archiving, restoring, and listing archived files (task plans, etc).
 *
 * Standards:
 *   - Modular, non-recursive, <250 lines per function
 *   - All logging via LogOrchestrator
 *   - All metrics via TelemetryManager
 *   - Archive ledger for all actions
 *   - Usage: node scripts/archive_manager.js <archive|restore|list-archive> <taskId|file> [--dry-run]
 */
const fs = require('fs');
const path = require('path');
const LogOrchestrator = require('./core/log-orchestrator');
const TelemetryManager = require('./core/telemetry-manager');

const PLANS_DIR = 'project_meta/plans';
const ARCHIVE_DIR = 'project_meta/plans/archive';
const LEDGER_FILE = 'project_meta/plans/archive_ledger.json';
const LOG_DIR = './logs/debug';
const METRICS_DIR = './logs/metrics';

const logger = new LogOrchestrator({ logDir: LOG_DIR });
const telemetry = new TelemetryManager({ metricsDir: METRICS_DIR });

function loadLedger() {
  if (!fs.existsSync(LEDGER_FILE)) return [];
  return JSON.parse(fs.readFileSync(LEDGER_FILE, 'utf8'));
}
function saveLedger(entries) {
  fs.writeFileSync(LEDGER_FILE, JSON.stringify(entries, null, 2));
}
function getPlanFile(taskIdOrFile) {
  if (taskIdOrFile.endsWith('.json')) return path.join(PLANS_DIR, taskIdOrFile);
  return path.join(PLANS_DIR, `TASK_PLAN_${taskIdOrFile}.json`);
}
function getArchiveFile(taskIdOrFile) {
  if (taskIdOrFile.endsWith('.json')) return path.join(ARCHIVE_DIR, taskIdOrFile);
  return path.join(ARCHIVE_DIR, `TASK_PLAN_${taskIdOrFile}.json`);
}
async function archiveFile(taskIdOrFile, dryRun) {
  await logger.initialize();
  await telemetry.initialize();
  const span = await telemetry.startSpan('archiveFile');
  if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  const src = getPlanFile(taskIdOrFile);
  const dest = getArchiveFile(taskIdOrFile);
  if (!fs.existsSync(src)) {
    await logger.error('File to archive not found', { src });
    await telemetry.endSpan('archiveFile');
    process.exit(1);
  }
  if (dryRun) {
    await logger.info('Dry run: would archive file', { src, dest });
    await telemetry.endSpan('archiveFile');
    return;
  }
  fs.renameSync(src, dest);
  const ledger = loadLedger();
  const entry = {
    action: 'archive',
    file: path.basename(src),
    from: src,
    to: dest,
    timestamp: new Date().toISOString(),
    user: process.env.USER || 'unknown',
  };
  ledger.push(entry);
  saveLedger(ledger);
  await logger.info('Archived file', entry);
  await telemetry.recordMetric('file_archived', 1, entry);
  await telemetry.endSpan('archiveFile');
  await logger.cleanup();
  await telemetry.cleanup();
}
async function restoreFile(taskIdOrFile, dryRun) {
  await logger.initialize();
  await telemetry.initialize();
  const span = await telemetry.startSpan('restoreFile');
  const src = getArchiveFile(taskIdOrFile);
  const dest = getPlanFile(taskIdOrFile);
  if (!fs.existsSync(src)) {
    await logger.error('File to restore not found', { src });
    await telemetry.endSpan('restoreFile');
    process.exit(1);
  }
  if (dryRun) {
    await logger.info('Dry run: would restore file', { src, dest });
    await telemetry.endSpan('restoreFile');
    return;
  }
  fs.renameSync(src, dest);
  const ledger = loadLedger();
  const entry = {
    action: 'restore',
    file: path.basename(src),
    from: src,
    to: dest,
    timestamp: new Date().toISOString(),
    user: process.env.USER || 'unknown',
  };
  ledger.push(entry);
  saveLedger(ledger);
  await logger.info('Restored file', entry);
  await telemetry.recordMetric('file_restored', 1, entry);
  await telemetry.endSpan('restoreFile');
  await logger.cleanup();
  await telemetry.cleanup();
}
async function listArchive() {
  await logger.initialize();
  const ledger = loadLedger();
  const archived = ledger.filter(e => e.action === 'archive');
  process.stdout.write('Archived files:\n');
  for (const entry of archived) {
    process.stdout.write(`- ${entry.file} (archived at ${entry.timestamp})\n`);
  }
  await logger.info('Listed archive', { count: archived.length });
  await logger.cleanup();
}
function printUsage() {
  process.stdout.write(`Usage: node scripts/archive_manager.js <archive|restore|list-archive> <taskId|file> [--dry-run]\n`);
}
(async () => {
  const cmd = process.argv[2];
  const arg = process.argv[3];
  const dryRun = process.argv.includes('--dry-run');
  if (cmd === 'archive' && arg) await archiveFile(arg, dryRun);
  else if (cmd === 'restore' && arg) await restoreFile(arg, dryRun);
  else if (cmd === 'list-archive') await listArchive();
  else printUsage();
})();
// TODO: Add unit tests for each function
// TODO: Add validation after archive/restore
// TODO: Add support for archiving/restoring multiple files or by status
// TODO: Add more metadata (reason, related task, etc) to ledger entries 