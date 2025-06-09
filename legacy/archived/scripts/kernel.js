/**
 * CLARITY_ENGINE Kernel Automation System
 *
 * - Initializes all orchestrators (Log, Writer, Backup, Lifecycle, Watcher) in dependency order.
 * - Runs a main event loop (kernel loop) for health, drift, and event handling.
 * - Handles CLI and file-based triggers for reset/onboarding.
 * - Prompts for approval only when all checks pass.
 * - Logs all actions, errors, and audit events centrally.
 * - Cleans up all resources and exits cleanly.
 * - Main entry point for local automation, CI/CD, and scaling.
 */
const LogOrchestrator = require('./core/log-orchestrator');
const WriterOrchestrator = require('./core/writer-orchestrator');
const BackupOrchestrator = require('./core/backup-orchestrator');
const LifecycleOrchestrator = require('./core/lifecycle-orchestrator');
const WatcherOrchestrator = require('./core/watcher-orchestrator');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('--- CLARITY_ENGINE Kernel Start ---');
  // Parse CLI args
  const args = process.argv.slice(2);
  const forceReset = args.includes('--force-reset');
  // 1. Initialize orchestrators in dependency order
  const logger = new LogOrchestrator();
  await logger.initialize();
  const backupOrchestrator = new BackupOrchestrator({}, { logger });
  await backupOrchestrator.initialize();
  const writerOrchestrator = new WriterOrchestrator({}, { fs, path, logger });
  await writerOrchestrator.initialize();
  const lifecycleOrchestrator = new LifecycleOrchestrator({}, {
    plannerOrchestrator: { logLifecycleEvent: (...args) => console.log('Planner log:', ...args) },
    backupOrchestrator,
    writerOrchestrator,
    telemetryManager: { recordEvent: (...args) => console.log('Telemetry:', ...args) }
  });
  await lifecycleOrchestrator.initialize();
  const watcher = new WatcherOrchestrator({
    lifecycleOrchestrator,
    backupOrchestrator,
    logger,
    auditLogger: { log: (...args) => console.log('AUDIT:', ...args) },
    checkInterval: 15000, // 15s for demo
    forceReset
  });

  // 2. Start watcher/daemon (main event loop)
  await watcher.start();

  // 3. Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n--- CLARITY_ENGINE Kernel Cleanup ---');
    await watcher.cleanup();
    await lifecycleOrchestrator.cleanup && await lifecycleOrchestrator.cleanup();
    await writerOrchestrator.cleanup && await writerOrchestrator.cleanup();
    await backupOrchestrator.cleanup && await backupOrchestrator.cleanup();
    await logger.cleanup && await logger.cleanup();
    console.log('--- Kernel exited cleanly ---');
    process.exit(0);
  });
}

if (require.main === module) {
  main().catch(err => {
    console.error('Kernel error:', err);
    process.exit(1);
  });
} 