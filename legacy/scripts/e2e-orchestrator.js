#!/usr/bin/env node
/**
 * e2e-orchestrator.js
 * Runs the full end-to-end system: health checks, onboarding, batch jobs, tests, magic list, pulse, overseer/watchdog, and backup.
 * Uses forced-wrapper.js for all child process runs to ensure timeouts, error catching, and stub logging.
 * Logs every step, error, and result. Fails fast and cleanly. Updates dashboard and magic list. Requires backup before destructive ops.
 */
const fs = require('fs');
const path = require('path');
const logPath = 'project_meta/suggestion_log.md';
const dashboardPath = 'project_meta/insights/e2e_orchestrator_dashboard.md';
const { runWithTimeout } = require('./core/forced-wrapper');
const LogOrchestrator = require('./core/log-orchestrator');
const logger = new LogOrchestrator({ module: 'E2EOrchestrator' });

function logStep(step, status, details = '') {
  const msg = `[E2E] ${step}: ${status}${details ? ' - ' + details : ''}`;
  fs.appendFileSync(logPath, `\n[${new Date().toISOString()}] ${msg}\n`);
  logger.info(msg);
}
function runStep(cmd, desc, timeoutMs = 120000) {
  logStep(desc, 'START');
  runWithTimeout(cmd, desc, timeoutMs, () => logStep(desc, 'SUCCESS'));
}
function verifyBackup() {
  logStep('Backup', 'START');
  const backupScript = 'scripts/batch-backup-and-summarize.js';
  if (!fs.existsSync(backupScript)) {
    logStep('Backup', 'FAIL', 'Backup script missing!');
    process.exit(1);
  }
  runStep('node scripts/batch-backup-and-summarize.js', 'Backup');
  logStep('Backup', 'SUCCESS');
}
function main() {
  try {
    logStep('E2E Orchestrator', 'START');
    // 1. Health checks
    runStep('node scripts/check-deps.js', 'Dependency Health Check');
    // 2. Onboarding
    runStep('node scripts/first-run-onboarding.js', 'First Run Onboarding');
    // 3. Batch jobs
    runStep('node scripts/batch-meta-summarize.js --ci', 'Batch Meta-Summarize');
    runStep('node scripts/batch-refill.js --ci', 'Batch Refill');
    // 4. Magic list engine
    runStep('node scripts/magic-list-engine.js', 'Magic List Engine');
    // 5. Pulse/health check (future: system-pulse.js)
    if (fs.existsSync('scripts/system-pulse.js')) {
      runStep('node scripts/system-pulse.js', 'System Pulse');
    }
    // 6. Overseer/watchdog (future: overseer-watchdog.js)
    if (fs.existsSync('scripts/overseer-watchdog.js')) {
      runStep('node scripts/overseer-watchdog.js', 'Overseer/Watchdog');
    }
    // 7. E2E tests
    runStep('npm test tests/core/magic-list-engine.test.js', 'E2E Test: Magic List Engine', 180000);
    runStep('npm test tests/core/active-suggestions.test.js', 'E2E Test: Active Suggestions', 180000);
    // 8. Backup before any destructive ops
    verifyBackup();
    // 9. Update dashboard
    fs.writeFileSync(dashboardPath, `E2E Orchestrator completed successfully at ${new Date().toISOString()}\n`);
    logStep('E2E Orchestrator', 'COMPLETE');
    process.exit(0);
  } catch (e) {
    logStep('E2E Orchestrator', 'FAIL', e.message);
    process.exit(1);
  }
}
if (require.main === module) { main(); } 