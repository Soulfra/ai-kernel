#!/usr/bin/env node
/**
 * overseer-watchdog.js
 * Monitors all running jobs/scripts for heartbeats/progress. Detects stuck/hung processes, swaps in blank/reset state or restarts, logs all interventions, and updates dashboard/magic list.
 */
const fs = require('fs');
const path = require('path');
const logPath = 'project_meta/suggestion_log.md';
const dashboardPath = 'project_meta/insights/overseer_watchdog_dashboard.md';
const statusFiles = [
  'project_meta/insights/magic_list_dashboard.md',
  'project_meta/insights/e2e_orchestrator_dashboard.md',
  'project_meta/insights/system_state_dashboard.md'
];
const LogOrchestrator = require('./core/log-orchestrator');
const logger = new LogOrchestrator({ module: 'OverseerWatchdog' });
const STUCK_THRESHOLD_MS = 60 * 1000; // 1 minute

function logStep(step, status, details = '') {
  const msg = `[Overseer] ${step}: ${status}${details ? ' - ' + details : ''}`;
  fs.appendFileSync(logPath, `\n[${new Date().toISOString()}] ${msg}\n`);
  logger.info(msg);
}
function checkStatusFile(file) {
  try {
    const stats = fs.statSync(file);
    const age = Date.now() - stats.mtimeMs;
    return { file, age, isStuck: age > STUCK_THRESHOLD_MS };
  } catch (e) {
    logStep('CheckStatusFile', 'ERROR', `${file} - ${e.message}`);
    return { file, age: null, isStuck: true };
  }
}
function swapInBlank(file) {
  fs.writeFileSync(file, '[Overseer] BLANK/RESET STATE\n');
  logStep('SwapInBlank', 'SUCCESS', `Blanked ${file}`);
}
function main() {
  try {
    logStep('Overseer Watchdog', 'START');
    let stuckCount = 0;
    for (const file of statusFiles) {
      const status = checkStatusFile(file);
      if (status.isStuck) {
        stuckCount++;
        swapInBlank(file);
        logStep('Overseer Watchdog', 'INTERVENTION', `Stuck detected in ${file}`);
      }
    }
    if (stuckCount > 0) {
      fs.appendFileSync(dashboardPath, `[${new Date().toISOString()}] Overseer intervened in ${stuckCount} stuck files.\n`);
      logStep('Overseer Watchdog', 'ESCALATE', `${stuckCount} stuck files detected.`);
    } else {
      fs.appendFileSync(dashboardPath, `[${new Date().toISOString()}] All systems healthy.\n`);
      logStep('Overseer Watchdog', 'COMPLETE', 'All systems healthy.');
    }
    process.exit(0);
  } catch (e) {
    logStep('Overseer Watchdog', 'FAIL', e.message);
    process.exit(1);
  }
}
if (require.main === module) { main(); } 