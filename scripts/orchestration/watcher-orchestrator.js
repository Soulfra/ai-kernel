// @agent: diagnostics
// @orchestrator: recovery
// @origin: legacy-rescue
/**
 * WatcherOrchestrator (Drift/Loop)
 *
 * - Runs as a daemon/background process.
 * - Monitors orchestrator health, backup status, and system drift.
 * - Triggers onboarding/reset if drift, failure, or recursion is detected.
 * - Checks for lock/seal before destructive actions.
 * - Logs all actions and emits audit/alert events.
 * - Integrates with Echo/Drift/Loop triangle pattern.
 */
const EventEmitter = require('events');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

async function requestApproval(action) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`Approve action: ${action}? (y/n): `, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

function fileExists(p) { try { return fs.existsSync(p); } catch { return false; } }
function fileAgeMinutes(p) {
  try {
    const stat = fs.statSync(p);
    return (Date.now() - stat.mtimeMs) / 60000;
  } catch { return Infinity; }
}

class WatcherOrchestrator extends EventEmitter {
  constructor({ router, lifecycleOrchestrator, backupOrchestrator, logger, auditLogger, lockFile = './system.lock', checkInterval = 60000, resetFlag = './reset.flag', backupDir = './backups', forceReset = false } = {}) {
    super();
    this.router = router;
    this.lifecycleOrchestrator = lifecycleOrchestrator;
    this.backupOrchestrator = backupOrchestrator;
    this.logger = logger;
    this.auditLogger = auditLogger;
    this.lockFile = lockFile;
    this.checkInterval = checkInterval;
    this.resetFlag = resetFlag;
    this.backupDir = backupDir;
    this.forceReset = forceReset;
    this.timer = null;
    this.isRunning = false;
  }

  async start() {
    this.isRunning = true;
    this.logger && this.logger.info('WatcherOrchestrator started');
    this.timer = setInterval(() => this.checkSystem(), this.checkInterval);
    // Run immediately on start
    await this.checkSystem();
  }

  async stop() {
    this.isRunning = false;
    if (this.timer) clearInterval(this.timer);
    this.logger && this.logger.info('WatcherOrchestrator stopped');
    this.emit('stopped');
  }

  async checkSystem() {
    try {
      // Check for lock/seal
      if (fileExists(this.lockFile)) {
        this.logger && this.logger.warn('System is locked. No destructive actions will be taken.');
        return;
      }
      // Health checks
      const onboardingDoc = path.resolve(process.cwd(), 'README_TEMPLATE.md');
      const chatLog = path.resolve(process.cwd(), 'logs', 'conversation_log.md');
      const backupDir = path.resolve(process.cwd(), this.backupDir);
      let latestBackupAge = Infinity;
      if (fileExists(backupDir)) {
        const backups = fs.readdirSync(backupDir).filter(f => f.startsWith('backup-'));
        if (backups.length > 0) {
          const latest = backups.map(f => path.join(backupDir, f)).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
          latestBackupAge = fileAgeMinutes(latest);
        }
      }
      const unhealthy = !fileExists(onboardingDoc) || !fileExists(chatLog);
      const driftDetected = latestBackupAge > 60; // e.g., backup older than 60 min
      // File/flag or CLI-based reset trigger
      const scheduledReset = this.forceReset || fileExists(this.resetFlag);
      if (unhealthy) {
        this.logger && this.logger.warn('Health check failed: onboarding doc or chat log missing. Logging and skipping reset.');
        this.auditLogger && this.auditLogger.log('health-failed', { onboardingDoc, chatLog });
        return;
      }
      if (driftDetected) {
        this.logger && this.logger.warn('Drift detected: backup is too old. Logging and skipping reset.');
        this.auditLogger && this.auditLogger.log('drift-detected', { latestBackupAge });
        return;
      }
      if (scheduledReset) {
        this.logger && this.logger.info('Scheduled reset/onboarding ready. Requesting approval.');
        const approved = await requestApproval('reset system');
        if (!approved) {
          this.logger && this.logger.info('Reset denied by user.');
          this.auditLogger && this.auditLogger.log('reset-denied', {});
          return;
        }
        await this.lifecycleOrchestrator.resetSystem({ from: 'immutable', dryRun: false, approval: true });
        this.emit('resetTriggered');
        // Remove reset flag if present
        if (fileExists(this.resetFlag)) fs.unlinkSync(this.resetFlag);
      } else {
        this.logger && this.logger.info('System healthy. No action needed.');
      }
    } catch (err) {
      this.logger && this.logger.error('WatcherOrchestrator error', { error: err.message });
      this.auditLogger && this.auditLogger.log('watcher-error', { error: err.message });
    }
  }

  async cleanup() {
    await this.stop();
    this.removeAllListeners();
  }
}

module.exports = WatcherOrchestrator;

// CLI runner for local/CLI use
if (require.main === module) {
  // Parse CLI args
  const args = process.argv.slice(2);
  const forceReset = args.includes('--force-reset');
  // Minimal mock dependencies for demo
  const LogOrchestrator = require('./log-orchestrator');
  const LifecycleOrchestrator = require('./lifecycle-orchestrator');
  const logger = new LogOrchestrator();
  const lifecycleOrchestrator = new LifecycleOrchestrator({}, {
    plannerOrchestrator: { logLifecycleEvent: (...args) => console.log('Planner log:', ...args) },
    backupOrchestrator: {},
    writerOrchestrator: {},
    telemetryManager: { recordEvent: (...args) => console.log('Telemetry:', ...args) }
  });
  const watcher = new WatcherOrchestrator({
    lifecycleOrchestrator,
    logger,
    auditLogger: { log: (...args) => console.log('AUDIT:', ...args) },
    checkInterval: 15000, // 15s for demo
    forceReset
  });
  logger.initialize().then(() => {
    watcher.start();
    process.on('SIGINT', async () => {
      await watcher.cleanup();
      await logger.cleanup();
      process.exit(0);
    });
  });
} 
