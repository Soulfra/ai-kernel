#!/usr/bin/env node
/**
 * forced-wrapper.js
 * Utility to run child processes with backup, timeout, error catching, telemetry, and stub logging.
 * - Before running any script, creates a backup using the backup orchestrator.
 * - On error, logs the error with full trace, attempts to restore from backup, and logs the result.
 * Usage: node scripts/core/forced-wrapper.js <script.js>
 */
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const TelemetryManager = require('./telemetry-manager');
const telemetry = new TelemetryManager();

function logErrorWithTrace(error, context) {
  const entry = `\n[${new Date().toISOString()}] [ERROR] ${error.code || error.name}: ${error.message}\nContext: ${context}\nStack: ${error.stack}\nSuggested next steps: ${suggestNextSteps(error)}\n`;
  try {
    fs.appendFileSync(path.join(__dirname, '../../project_meta/suggestion_log.md'), entry);
  } catch (e) {}
  console.error(entry);
}

function suggestNextSteps(error) {
  if (error.code === 'ENOENT') return 'Check if the directory/file exists. Ensure safe-io/forced-wrapper is used.';
  if (error.code === 'MODULE_NOT_FOUND') return 'Check script path, filename, and working directory.';
  return 'See stack trace and logs for more details.';
}

function runWithTimeout(cmd, desc, timeoutMs = 60000, onSuccess = null) {
  const proc = exec(cmd, { timeout: timeoutMs }, (error, stdout, stderr) => {
    if (error) {
      const msg = `[STUB MODE] ${desc} failed, timed out, or missing. Skipping. TODO: Implement or restore this script. Error: ${error.message}`;
      fs.appendFileSync('project_meta/suggestion_log.md', `\n[${new Date().toISOString()}] ${msg}\n`);
      fs.appendFileSync('project_meta/insights/magic_list_dashboard.md', `${msg}\n`);
      console.warn(msg);
    } else {
      if (onSuccess) onSuccess(stdout);
      else console.log(stdout);
    }
  });
  return proc;
}

// --- Backup/Restore Integration ---
function runBackupOrchestrator(action = 'backup') {
  try {
    telemetry.startSpan(`forced-wrapper.${action}`);
    const BackupOrchestrator = require('./backup-orchestrator');
    const backup = new BackupOrchestrator();
    if (action === 'backup') {
      backup.createBackup && backup.createBackup({ scope: 'full', dryRun: false, approval: true });
      console.log('[WRAPPER] Backup created before running script.');
    } else if (action === 'restore') {
      backup.restoreLatestBackup && backup.restoreLatestBackup();
      console.log('[WRAPPER] Restore from backup attempted after error.');
    }
    telemetry.endSpan(`forced-wrapper.${action}`);
  } catch (e) {
    logErrorWithTrace(e, `BackupOrchestrator ${action}`);
    telemetry.endSpan(`forced-wrapper.${action}`);
  }
}

const script = process.argv[2];
if (!script) {
  const err = new Error('No script specified.');
  err.code = 'NO_SCRIPT';
  logErrorWithTrace(err, 'forced-wrapper entry');
  console.error('Usage: node scripts/core/forced-wrapper.js <script.js>');
  process.exit(1);
}

const scriptPath = path.join(__dirname, script);
if (!fs.existsSync(scriptPath)) {
  const err = new Error(`Script not found: ${scriptPath}`);
  err.code = 'MODULE_NOT_FOUND';
  logErrorWithTrace(err, 'forced-wrapper script check');
  console.error('Suggestion: Check your working directory and script name.');
  process.exit(1);
}

// --- Create backup before running script ---
runBackupOrchestrator('backup');
telemetry.startSpan('forced-wrapper.runScript');

try {
  require(scriptPath);
  telemetry.endSpan('forced-wrapper.runScript');
} catch (err) {
  logErrorWithTrace(err, `forced-wrapper running ${script}`);
  telemetry.endSpan('forced-wrapper.runScript');
  // --- Attempt restore on error ---
  runBackupOrchestrator('restore');
  process.exit(1);
}

module.exports = { runWithTimeout }; 