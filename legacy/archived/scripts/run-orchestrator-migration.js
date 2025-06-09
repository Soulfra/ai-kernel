const path = require('path');
const OrchestratorMigration = require('./core/orchestrator-migration');
const LogOrchestrator = require('./core/log-orchestrator');
const DebugOrchestrator = require('./core/debug-orchestrator');

async function runMigration(options = {}) {
  const logger = new LogOrchestrator({
    logDir: path.join(__dirname, '../logs'),
    enableMetrics: true
  });

  const debugOrchestrator = new DebugOrchestrator({
    debugDir: path.join(__dirname, '../debug'),
    enableAutoResolution: true
  });

  try {
    await logger.initialize();
    await debugOrchestrator.initialize();

    logger.info('Starting orchestrator migration process');

    // Create migration instance
    const migration = new OrchestratorMigration({
      backupDir: path.join(__dirname, '../backups/orchestrator-migration'),
      dryRun: options.dryRun || true,
      validateOnly: options.validateOnly || false
    });

    // Initialize migration
    await migration.initialize();
    logger.info('Migration initialized');

    // Run backup
    await migration.backupOrchestrators();
    logger.info('Orchestrators backed up');

    // Analyze dependencies
    await migration.analyzeDependencies();
    logger.info('Dependencies analyzed');

    // Validate migration
    await migration.validateMigration();
    logger.info('Migration validated');

    // Generate report
    const report = await migration.generateMigrationReport();
    logger.info('Migration report generated', { reportPath: report.path });

    // Check for validation failures
    const failedValidations = report.orchestrators.filter(orch => 
      orch.validation.status === 'failed'
    );

    if (failedValidations.length > 0) {
      logger.error('Migration validation failed', { failedValidations });
      throw new Error('Migration validation failed');
    }

    // Check for warnings
    const warnings = report.orchestrators.filter(orch => 
      orch.validation.status === 'warning'
    );

    if (warnings.length > 0) {
      logger.warn('Migration has warnings', { warnings });
    }

    // If not in dry run mode, proceed with actual migration
    if (!options.dryRun) {
      logger.info('Proceeding with actual migration');
      // TODO: Implement actual migration steps
    } else {
      logger.info('Dry run completed successfully');
    }

    // Cleanup
    await migration.cleanup();
    logger.info('Migration process completed');

    return {
      success: true,
      report,
      warnings: warnings.length > 0 ? warnings : null
    };

  } catch (error) {
    logger.error('Migration process failed', {
      error: error.message,
      stack: error.stack
    });

    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  } finally {
    await logger.cleanup();
    await debugOrchestrator.cleanup();
  }
}

// If running directly
if (require.main === module) {
  const options = {
    dryRun: process.argv.includes('--dry-run'),
    validateOnly: process.argv.includes('--validate-only')
  };

  runMigration(options)
    .then(result => {
      if (result.success) {
        logger.info('Migration completed successfully');
        if (result.warnings) {
          logger.info('Warnings:', result.warnings);
        }
        process.exit(0);
      } else {
        logger.error('Migration failed:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      logger.error('Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = runMigration; 