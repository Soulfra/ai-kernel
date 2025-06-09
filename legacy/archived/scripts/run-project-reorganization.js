#!/usr/bin/env node

const path = require('path');
const ProjectReorganization = require('./core/project-reorganization');
const LogOrchestrator = require('./core/log-orchestrator');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run'),
  validateOnly: args.includes('--validate-only'),
  backupDir: args.find(arg => arg.startsWith('--backup-dir='))?.split('=')[1] || path.join(__dirname, '../backups/project-reorganization'),
  logDir: args.find(arg => arg.startsWith('--log-dir='))?.split('=')[1] || path.join(__dirname, '../logs'),
  debugDir: args.find(arg => arg.startsWith('--debug-dir='))?.split('=')[1] || path.join(__dirname, '../debug')
};

// Create reorganization instance
const reorganization = new ProjectReorganization(options);
const logOrchestrator = new LogOrchestrator();

// Set up event listeners
reorganization.on('initialized', () => {
  logOrchestrator.info('Project Reorganization initialized');
});

reorganization.on('cleanup', () => {
  logOrchestrator.info('Project Reorganization cleaned up');
});

// Main execution function
async function main() {
  try {
    logOrchestrator.info('Starting Project Reorganization...');
    logOrchestrator.info('Options:', {
      dryRun: options.dryRun,
      validateOnly: options.validateOnly,
      backupDir: options.backupDir,
      logDir: options.logDir,
      debugDir: options.debugDir
    });

    // Initialize
    await reorganization.initialize();
    logOrchestrator.info('Initialization complete');

    // Run analysis
    logOrchestrator.info('\nAnalyzing project structure...');
    await reorganization.analyzeStructure();
    logOrchestrator.info('Analysis complete');

    // Run validation
    logOrchestrator.info('\nValidating structure...');
    await reorganization.validateStructure();
    logOrchestrator.info('Validation complete');

    // Generate report
    await logOrchestrator.info('\nGenerating report...');
    const report = await reorganization.generateReport();
    await logOrchestrator.info('Report generated');

    // Display recommendations
    await logOrchestrator.info('\nReorganization Recommendations:');
    await logOrchestrator.info('=============================');
    await logOrchestrator.info(JSON.stringify(report.recommendations, null, 2));

    // Cleanup
    await reorganization.cleanup();
    await logOrchestrator.info('\nProject Reorganization completed successfully');

  } catch (error) {
    await logOrchestrator.error('\nError during Project Reorganization:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = main; 