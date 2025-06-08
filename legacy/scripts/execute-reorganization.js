#!/usr/bin/env node

const path = require('path');
const fs = require('fs').promises;
const LogOrchestrator = require('./core/log-orchestrator');
const DebugOrchestrator = require('./core/debug-orchestrator');
const DocumentationConsolidator = require('./consolidate-documentation');
const OrchestratorMigration = require('./core/orchestrator-migration');

class ReorganizationExecutor {
  constructor(options = {}) {
    this.options = {
      dryRun: options.dryRun || false,
      validateOnly: options.validateOnly || false,
      backupDir: options.backupDir || path.join(__dirname, '../backups'),
      logDir: options.logDir || path.join(__dirname, '../logs'),
      debugDir: options.debugDir || path.join(__dirname, '../debug'),
      ...options
    };

    this.logger = new LogOrchestrator({
      logDir: this.options.logDir,
      enableMetrics: true
    });

    this.debugger = new DebugOrchestrator({
      debugDir: this.options.debugDir,
      enableAutoResolution: true
    });

    this.documentationConsolidator = new DocumentationConsolidator({
      logDir: this.options.logDir,
      debugDir: this.options.debugDir
    });

    this.orchestratorMigration = new OrchestratorMigration({
      backupDir: this.options.backupDir,
      logDir: this.options.logDir,
      debugDir: this.options.debugDir
    });
  }

  async initialize() {
    try {
      await this.logger.initialize();
      await this.debugger.initialize();
      await this.documentationConsolidator.initialize();
      await this.orchestratorMigration.initialize();

      this.logger.info('ReorganizationExecutor initialized');
    } catch (error) {
      this.logger.error('Failed to initialize ReorganizationExecutor', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async execute() {
    try {
      this.logger.info('Starting project reorganization');

      // Step 1: Analyze current structure
      const analysis = await this.analyzeStructure();
      this.logger.info('Structure analysis complete', { analysis });

      // Step 2: Validate changes
      if (this.options.validateOnly) {
        const validation = await this.validateChanges(analysis);
        this.logger.info('Validation complete', { validation });
        return;
      }

      // Step 3: Create backup
      if (!this.options.dryRun) {
        await this.createBackup();
      }

      // Step 4: Consolidate documentation
      await this.consolidateDocumentation();

      // Step 5: Migrate orchestrators
      await this.migrateOrchestrators();

      // Step 6: Generate final report
      const report = await this.generateReport();
      this.logger.info('Reorganization complete', { report });

    } catch (error) {
      this.logger.error('Reorganization failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async analyzeStructure() {
    this.logger.info('Analyzing project structure');
    
    const analysis = {
      documentation: await this.documentationConsolidator.analyzeOrchestrators(),
      orchestrators: await this.orchestratorMigration.analyzeDependencies(),
      recommendations: await this.documentationConsolidator.generateRecommendations()
    };

    return analysis;
  }

  async validateChanges(analysis) {
    this.logger.info('Validating proposed changes');

    const validation = {
      documentation: await this.documentationConsolidator.validateStructure(),
      orchestrators: await this.orchestratorMigration.validateMigration(),
      recommendations: await this.documentationConsolidator.validateRecommendations()
    };

    return validation;
  }

  async createBackup() {
    this.logger.info('Creating backup');
    await this.orchestratorMigration.ensureBackupDirectories();
  }

  async consolidateDocumentation() {
    this.logger.info('Consolidating documentation');
    await this.documentationConsolidator.consolidate();
  }

  async migrateOrchestrators() {
    this.logger.info('Migrating orchestrators');
    await this.orchestratorMigration.migrate();
  }

  async generateReport() {
    this.logger.info('Generating final report');

    const report = {
      timestamp: new Date().toISOString(),
      analysis: await this.analyzeStructure(),
      validation: await this.validateChanges(await this.analyzeStructure()),
      metrics: {
        logs: this.logger.getMetrics(),
        debug: this.debugger.getMetrics()
      }
    };

    const reportPath = path.join(this.options.logDir, 'reorganization-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    return report;
  }

  async cleanup() {
    this.logger.info('Cleaning up ReorganizationExecutor');
    await this.logger.cleanup();
    await this.debugger.cleanup();
    await this.documentationConsolidator.cleanup();
    await this.orchestratorMigration.cleanup();
  }
}

// Command line interface
async function main() {
  const options = {
    dryRun: process.argv.includes('--dry-run'),
    validateOnly: process.argv.includes('--validate-only'),
    backupDir: process.argv.find(arg => arg.startsWith('--backup-dir='))?.split('=')[1],
    logDir: process.argv.find(arg => arg.startsWith('--log-dir='))?.split('=')[1],
    debugDir: process.argv.find(arg => arg.startsWith('--debug-dir='))?.split('=')[1]
  };

  const executor = new ReorganizationExecutor(options);

  try {
    await executor.initialize();
    await executor.execute();
  } catch (error) {
    console.error('Reorganization failed:', error);
    process.exit(1);
  } finally {
    await executor.cleanup();
  }
}

if (require.main === module) {
  main();
}

module.exports = ReorganizationExecutor; 