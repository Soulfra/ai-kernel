// Intake Daemon: Watches /drop/ or /input/agency/ for new files, moves to /ready/, logs actions via orchestrator
const fs = require('fs');
const path = require('path');
const { LogOrchestrator } = require('./core/log-orchestrator');
const { TelemetryManager } = require('./core/telemetry-manager');

const WATCH_DIR = process.env.INTAKE_DIR || './drop';
const READY_DIR = process.env.READY_DIR || './ready';

function moveFile(file, logger, telemetry) {
  const src = path.join(WATCH_DIR, file);
  const dest = path.join(READY_DIR, file);
  try {
    fs.renameSync(src, dest);
    logger.info('Moved file', { file });
    telemetry.recordMetric('file_moved', 1, { file });
    logger.emit('task:event', { type: 'file_moved', file });
  } catch (e) {
    logger.error('Error moving file', { file, error: e.message });
    telemetry.recordMetric('intake_error', 1, { file, error: e.message });
    logger.emit('task:event', { type: 'intake_error', file, error: e.message });
  }
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function main() {
  if (process.argv.includes('--help')) {
    console.log('Usage: node intake-daemon.js [--help]\nWatches /drop/ or /input/agency/ for new files, moves to /ready/.');
    process.exit(0);
  }
  const logger = new LogOrchestrator();
  const telemetry = new TelemetryManager();
  ensureDir(WATCH_DIR);
  ensureDir(READY_DIR);
  logger.info('Intake daemon started');
  logger.emit('task:event', { type: 'intake_started' });
  fs.watch(WATCH_DIR, (event, file) => {
    if (event === 'rename' && file && fs.existsSync(path.join(WATCH_DIR, file))) {
      moveFile(file, logger, telemetry);
    }
  });
}

if (require.main === module) main();
// Documentation: All logging and error handling is via orchestrator/telemetry injection. Task events are emitted for traceability. 