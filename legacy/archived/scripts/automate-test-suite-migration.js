/**
 * @file Automate Test Suite Migration
 * @version 1.1.0
 * @title Automate Test Suite Migration
 * @description Canonical automation script for orchestrated, auditable, and modular test suite migration in CLARITY_ENGINE. Handles backup, validation, migration, logging, and documentation updates in snowball batches. All actions are logged and traceable. Lessons learned are incorporated from prior migrations and validations.
 * @lastUpdated 2025-06-03
 *
 * Usage:
 *   node scripts/automate-test-suite-migration.js [--yes] [--batch <name>] [--report <file>] [--dry-run]
 *
 * See docs/testing/TEST_SUITE_ORCHESTRATION.md for process details.
 */

const path = require('path');
const fs = require('fs').promises;
const { runBackup, verifyBackup, restoreBackup, getBackupPaths, runValidation, moveFiles, archiveFiles, runTests, updateDocs, logResults } = require('./unified-migration/helpers/file-operations-helper');
const readline = require('readline');
const LogOrchestrator = require('../core/log-orchestrator');
const TaskLogger = require('../core/task-logger');
const os = require('os');

// Canonical loggers (DI)
const logger = new LogOrchestrator();
const taskLogger = new TaskLogger();

// Utility: Parse CLI args
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { yes: false, batch: null, report: null, dryRun: true };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--yes') opts.yes = true;
    if (args[i] === '--batch' && args[i + 1]) opts.batch = args[++i];
    if (args[i] === '--report' && args[i + 1]) opts.report = args[++i];
    if (args[i] === '--dry-run') opts.dryRun = true;
    if (args[i] === '--live') opts.dryRun = false;
  }
  return opts;
}

// Utility: Load batches from external config if present
async function loadBatches() {
  const configPath = path.resolve(__dirname, 'batches.json');
  try {
    const content = await fs.readFile(configPath, 'utf8');
    return JSON.parse(content);
  } catch {
    // Fallback to hardcoded batches
    return [
      {
        name: 'Orchestrator/Core Tests',
        moves: [
          { from: 'scripts/core/tests/meta-orchestrator.test.js', to: 'tests/unit/meta-orchestrator.test.js' },
          { from: 'scripts/core/tests/task-orchestrator.test.js', to: 'tests/unit/task-orchestrator.test.js' },
          { from: 'scripts/core/tests/documentation-orchestrator.test.js', to: 'tests/unit/documentation-orchestrator.test.js' },
          { from: 'scripts/core/tests/quality-orchestrator.test.js', to: 'tests/unit/quality-orchestrator.test.js' },
          { from: 'scripts/core/tests/log-orchestrator.test.js', to: 'tests/unit/log-orchestrator.test.js' },
          { from: 'scripts/core/tests/debug-orchestrator.test.js', to: 'tests/unit/debug-orchestrator.test.js' },
          { from: 'scripts/core/tests/task-system.test.js', to: 'tests/unit/task-system.test.js' },
          { from: 'scripts/core/tests/orchestration.test.js', to: 'tests/unit/orchestration.test.js' },
          { from: 'tests/core/debug-orchestrator.test.js', to: 'tests/unit/debug-orchestrator-2.test.js' },
          { from: 'tests/core/task-deduplicator.test.js', to: 'tests/unit/task-deduplicator.test.js' },
          { from: 'tests/core/log-orchestrator.test.js', to: 'tests/unit/log-orchestrator-2.test.js' },
          { from: 'tests/core/quality-orchestrator.test.js', to: 'tests/unit/quality-orchestrator-2.test.js' },
          { from: 'tests/core/documentation-orchestrator.test.js', to: 'tests/unit/documentation-orchestrator-2.test.js' }
        ],
        archives: [
          { file: 'core/components/memory/tests/unit/memory-operations.test.ts.bak', reason: 'Legacy TypeScript test, superseded by JS tests' }
        ]
      },
      {
        name: 'Migration/CLI/Component Tests',
        moves: [
          // ...add migration, CLI, and component test moves here
        ],
        archives: [
          // ...add any additional legacy files here
        ]
      }
    ];
  }
}

/**
 * Print a summary of planned actions for a batch (dry-run output)
 * @param {object} batch
 */
function printBatchSummary(batch) {
  logger.info(`[DRY RUN] Batch: ${batch.name}`);
  if (batch.moves.length) {
    logger.info('  Files to move:', { files: batch.moves });
  }
  if (batch.archives.length) {
    logger.info('  Files to archive:', { files: batch.archives });
  }
}

/**
 * Prompt user for explicit confirmation (unless --yes is passed)
 * @param {string} question
 * @returns {Promise<boolean>}
 */
function askConfirmation(question) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'yes');
    });
  });
}

/**
 * Prompt for lessons learned and batch notes interactively.
 * @returns {Promise<string>}
 */
function promptLessonsLearned() {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('Enter lessons learned or issues for this batch (or leave blank): ', answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Append batch results to orchestration doc and test run report.
 * @param {object} batch
 * @param {object} batchResult
 * @param {string} lessons
 */
async function updateOrchestrationDocAndReport(batch, batchResult, lessons) {
  const orchestrationDoc = path.resolve(__dirname, '../../docs/testing/TEST_SUITE_ORCHESTRATION.md');
  const testRunReport = path.resolve(__dirname, '../../docs/test-run-report.md');
  const now = new Date().toISOString();
  const user = os.userInfo().username;
  const summary = `| ${now} | ${batch.name} | ${batchResult.actions} | ${batchResult.issues} | ${batchResult.fixes} | ${batchResult.telemetry} | ${lessons} | ${batchResult.nextSteps} |\n`;
  // Append to orchestration doc
  let docContent = await fs.readFile(orchestrationDoc, 'utf8');
  const tableIdx = docContent.lastIndexOf('|------|');
  if (tableIdx !== -1) {
    const insertIdx = docContent.indexOf('\n', tableIdx) + 1;
    docContent = docContent.slice(0, insertIdx) + summary + docContent.slice(insertIdx);
    await fs.writeFile(orchestrationDoc, docContent);
  }
  // Append to test run report
  let reportContent = await fs.readFile(testRunReport, 'utf8');
  reportContent += `\n## Batch: ${batch.name} (${now})\n- User: ${user}\n- Actions: ${batchResult.actions}\n- Issues: ${batchResult.issues}\n- Fixes: ${batchResult.fixes}\n- Telemetry: ${batchResult.telemetry}\n- Lessons Learned: ${lessons}\n- Next Steps: ${batchResult.nextSteps}\n`;
  await fs.writeFile(testRunReport, reportContent);
}

/**
 * Append to machine-readable migration log.
 * @param {object} batch
 * @param {object} batchResult
 * @param {string} lessons
 */
async function appendMigrationLog(batch, batchResult, lessons) {
  const logPath = path.resolve(__dirname, '../../project_meta/task_logs/main_task_log.json');
  let logArr = [];
  try {
    const content = await fs.readFile(logPath, 'utf8');
    logArr = JSON.parse(content);
  } catch {}
  logArr.push({
    timestamp: new Date().toISOString(),
    batch: batch.name,
    actions: batchResult.actions,
    issues: batchResult.issues,
    fixes: batchResult.fixes,
    telemetry: batchResult.telemetry,
    lessons,
    nextSteps: batchResult.nextSteps,
    user: os.userInfo().username
  });
  await fs.writeFile(logPath, JSON.stringify(logArr, null, 2));
}

/**
 * Main automation function: orchestrates backup, validation, migration, and documentation for all batches.
 */
async function automateMigration() {
  await logger.initialize();
  await taskLogger.initialize();
  const opts = parseArgs();
  logger.info('Starting test suite migration automation...', { opts });
  const batches = await loadBatches();
  const selectedBatches = opts.batch ? batches.filter(b => b.name === opts.batch) : batches;

  const backupResult = await runBackup();
  if (!verifyBackup(backupResult.archiveFile)) {
    logger.error('Backup verification failed! Aborting migration.');
    process.exit(1);
  }
  logger.info(`Backup created at: ${backupResult.archiveFile}`);
  logger.info(`Backup manifest: ${backupResult.backupPath}/manifest.json`);

  // Run validation and only proceed if it passes
  const validationPassed = await runValidation('dry-run');
  if (!validationPassed) {
    logger.error('Validation failed! Please fix the reported issues (ENOENT, file errors, etc.) before retrying.');
    process.exit(1);
  }

  // DRY RUN: Print all planned actions
  for (const batch of selectedBatches) {
    printBatchSummary(batch);
  }

  // Require explicit confirmation
  let proceed = opts.yes;
  if (!opts.yes) {
    proceed = await askConfirmation('\nProceed with these changes? Type "yes" to continue: ');
  }
  if (!proceed) {
    logger.info('Aborting migration. No changes made.');
    process.exit(0);
  }

  // Execute real migration
  for (const batch of selectedBatches) {
    logger.info(`Processing batch: ${batch.name}`);
    await moveFiles(batch.moves);
    await archiveFiles(batch.archives);
    const testResults = await runTests();
    await logResults(batch);
    await updateDocs(batch);
    // Gather batch-level telemetry and error summaries
    const batchResult = {
      actions: `Moved ${batch.moves.length} files, archived ${batch.archives.length} files`,
      issues: testResults && testResults.failed ? testResults.failed : 'None',
      fixes: 'N/A',
      telemetry: testResults ? JSON.stringify(testResults) : 'N/A',
      nextSteps: 'Review logs and validate results.'
    };
    // Prompt for lessons learned
    const lessons = await promptLessonsLearned();
    await updateOrchestrationDocAndReport(batch, batchResult, lessons);
    await appendMigrationLog(batch, batchResult, lessons);
  }
  await runValidation('final');
  await runTests('full-backtest');
  await logResults('final');
  logger.info('Test suite migration and backtesting complete.');
}

if (require.main === module) {
  automateMigration().catch(err => {
    logger.error('Automation failed:', { error: err.message });
    process.exit(1);
  });
} 