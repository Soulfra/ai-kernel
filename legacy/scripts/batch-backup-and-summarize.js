#!/usr/bin/env node
require('./load-secrets');
const BackupOrchestrator = require('./core/backup-orchestrator');
const LogOrchestrator = require('./core/log-orchestrator');
const batchMetaSummarize = require('./batch-meta-summarize');

(async () => {
  const logger = new LogOrchestrator();
  await logger.initialize();
  await logger.info('Batch backup and meta-summarization started.');
  try {
    await batchMetaSummarize();
    await logger.info('Batch meta-summarization complete.');
    const backupOrchestrator = new BackupOrchestrator({}, { logger });
    await backupOrchestrator.initialize();
    await backupOrchestrator.backup({ scope: 'full', dryRun: false, approval: true });
    await logger.info('Backup complete.');
    process.exit(0);
  } catch (err) {
    await logger.error('Batch backup/meta-summarization failed.', { error: err.message });
    process.exit(1);
  }
})(); 