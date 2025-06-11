// @agent: diagnostics
// @orchestrator: recovery
// @origin: legacy-rescue
const path = require('path');
const fs = require('fs').promises;
const EventEmitter = require('events');
const LogOrchestrator = require('./log-orchestrator');
const DebugOrchestrator = require('./debug-orchestrator');
const TelemetryManager = require('./telemetry-manager');
const logOrchestrator = new LogOrchestrator();
const telemetryManager = new TelemetryManager();

class OrchestratorMigration extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      backupDir: options.backupDir || path.join(__dirname, '../../backups/orchestrator-migration'),
      dryRun: options.dryRun || true,
      validateOnly: options.validateOnly || false,
      ...options
    };

    this.logger = new LogOrchestrator({
      logDir: path.join(__dirname, '../../logs'),
      enableMetrics: true
    });

    this.debugger = new DebugOrchestrator({
      debugDir: path.join(__dirname, '../../debug'),
      enableAutoResolution: true
    });

    this.legacyOrchestrators = [
      {
        name: 'log-orchestrator',
        paths: [
          'scripts/core/log-orchestrator.js',
          'CLARITY_ENGINE_DOCS/scripts/core/log-orchestrator.js'
        ]
      },
      {
        name: 'run-orchestrator',
        paths: [
          'scripts/run-orchestrator.js',
          'CLARITY_ENGINE_DOCS/scripts/run-orchestrator.js'
        ]
      },
      {
        name: 'consolidate-orchestrators',
        paths: [
          'scripts/consolidate-orchestrators.js',
          'CLARITY_ENGINE_DOCS/scripts/consolidate-orchestrators.js'
        ]
      },
      {
        name: 'migration-orchestrator',
        paths: [
          'scripts/migration-orchestrator.js',
          'CLARITY_ENGINE_DOCS/scripts/migration-orchestrator.js'
        ]
      },
      {
        name: 'meta-orchestrator',
        paths: [
          'scripts/core/meta-orchestrator.js',
          'CLARITY_ENGINE_DOCS/scripts/core/meta-orchestrator.js'
        ]
      }
    ];

    this.migrationMap = new Map();
    this.validationResults = new Map();
  }

  async initialize() {
    try {
      await telemetryManager.startSpan('OrchestratorMigration.initialize');
      await this.logger.initialize();
      await this.debugger.initialize();
      logOrchestrator.info('Initializing OrchestratorMigration');

      // Create backup directory
      await this.ensureBackupDirectory();

      // Initialize migration map
      await this.initializeMigrationMap();

      logOrchestrator.info('OrchestratorMigration initialized');
      this.emit('initialized');
      await telemetryManager.endSpan('OrchestratorMigration.initialize');
    } catch (error) {
      logOrchestrator.error('Failed to initialize OrchestratorMigration', {
        error: error.message,
        stack: error.stack
      });
      await telemetryManager.recordMetric('orchestrator_migration_error', 1, { name: 'OrchestratorMigration' });
      throw error;
    }
  }

  async ensureBackupDirectory() {
    try {
      await fs.mkdir(this.options.backupDir, { recursive: true });
      logOrchestrator.info('Backup directory ensured', { path: this.options.backupDir });
    } catch (error) {
      logOrchestrator.error('Failed to create backup directory', {
        error: error.message,
        path: this.options.backupDir
      });
      await telemetryManager.recordMetric('orchestrator_migration_error', 1, { name: 'OrchestratorMigration' });
      throw error;
    }
  }

  async initializeMigrationMap() {
    for (const orchestrator of this.legacyOrchestrators) {
      this.migrationMap.set(orchestrator.name, {
        status: 'pending',
        paths: orchestrator.paths,
        backupPath: path.join(this.options.backupDir, `${orchestrator.name}-${Date.now()}.js`),
        validationResults: [],
        dependencies: [],
        references: []
      });
    }
  }

  async backupOrchestrators() {
    await telemetryManager.startSpan('OrchestratorMigration.backupOrchestrators');
    logOrchestrator.info('Starting orchestrator backup');
    
    for (const [name, info] of this.migrationMap) {
      try {
        // Find the first existing path
        const sourcePath = info.paths.find(async (p) => {
          try {
            await fs.access(p);
            return true;
          } catch {
            return false;
          }
        });

        if (!sourcePath) {
          logOrchestrator.warn(`No existing file found for ${name}`);
          continue;
        }

        if (!this.options.dryRun) {
          const content = await fs.readFile(sourcePath, 'utf8');
          await fs.writeFile(info.backupPath, content);
          logOrchestrator.info(`Backed up ${name}`, { from: sourcePath, to: info.backupPath });
        } else {
          logOrchestrator.info(`[DRY RUN] Would backup ${name}`, { from: sourcePath, to: info.backupPath });
        }

        info.status = 'backed_up';
      } catch (error) {
        logOrchestrator.error(`Failed to backup ${name}`, {
          error: error.message,
          paths: info.paths
        });
        info.status = 'backup_failed';
        await telemetryManager.recordMetric('orchestrator_migration_error', 1, { name });
      }
    }
    await telemetryManager.endSpan('OrchestratorMigration.backupOrchestrators');
  }

  async analyzeDependencies() {
    logOrchestrator.info('Starting dependency analysis');

    for (const [name, info] of this.migrationMap) {
      try {
        const sourcePath = info.paths.find(async (p) => {
          try {
            await fs.access(p);
            return true;
          } catch {
            return false;
          }
        });

        if (!sourcePath) continue;

        const content = await fs.readFile(sourcePath, 'utf8');
        
        // Analyze require/import statements
        const requires = content.match(/require\(['"](.+?)['"]\)/g) || [];
        const imports = content.match(/import.+from\s+['"](.+?)['"]/g) || [];

        info.dependencies = [...requires, ...imports].map(dep => {
          const match = dep.match(/['"](.+?)['"]/);
          return match ? match[1] : null;
        }).filter(Boolean);

        logOrchestrator.info(`Analyzed dependencies for ${name}`, {
          dependencies: info.dependencies
        });
      } catch (error) {
        logOrchestrator.error(`Failed to analyze dependencies for ${name}`, {
          error: error.message
        });
      }
    }
  }

  async validateMigration() {
    logOrchestrator.info('Starting migration validation');

    for (const [name, info] of this.migrationMap) {
      const validation = {
        status: 'pending',
        checks: []
      };

      // Check if backup exists
      if (info.status === 'backed_up') {
        validation.checks.push({
          name: 'backup',
          status: 'passed',
          message: 'Backup created successfully'
        });
      } else {
        validation.checks.push({
          name: 'backup',
          status: 'failed',
          message: 'Backup failed or not created'
        });
      }

      // Check dependencies
      if (info.dependencies.length > 0) {
        validation.checks.push({
          name: 'dependencies',
          status: 'warning',
          message: `Found ${info.dependencies.length} dependencies that need to be verified`
        });
      }

      // Check for circular dependencies
      const circularDeps = this.checkCircularDependencies(name);
      if (circularDeps.length > 0) {
        validation.checks.push({
          name: 'circular_dependencies',
          status: 'error',
          message: `Found circular dependencies: ${circularDeps.join(', ')}`
        });
      }

      validation.status = this.determineValidationStatus(validation.checks);
      this.validationResults.set(name, validation);

      logOrchestrator.info(`Validated ${name}`, { validation });
    }
  }

  checkCircularDependencies(name, visited = new Set(), path = []) {
    const info = this.migrationMap.get(name);
    if (!info) return [];

    if (visited.has(name)) {
      return [path.join(' -> ') + ' -> ' + name];
    }

    visited.add(name);
    path.push(name);

    const circular = [];
    for (const dep of info.dependencies) {
      const depName = this.getOrchestratorNameFromDependency(dep);
      if (depName && this.migrationMap.has(depName)) {
        circular.push(...this.checkCircularDependencies(depName, visited, [...path]));
      }
    }

    visited.delete(name);
    return circular;
  }

  getOrchestratorNameFromDependency(dep) {
    for (const [name, info] of this.migrationMap) {
      if (info.paths.some(p => dep.includes(p))) {
        return name;
      }
    }
    return null;
  }

  determineValidationStatus(checks) {
    if (checks.some(c => c.status === 'error')) return 'failed';
    if (checks.some(c => c.status === 'warning')) return 'warning';
    return 'passed';
  }

  async generateMigrationReport() {
    const report = {
      timestamp: new Date().toISOString(),
      dryRun: this.options.dryRun,
      orchestrators: Array.from(this.migrationMap.entries()).map(([name, info]) => ({
        name,
        status: info.status,
        validation: this.validationResults.get(name),
        dependencies: info.dependencies,
        backupPath: info.backupPath
      }))
    };

    const reportPath = path.join(this.options.backupDir, `migration-report-${Date.now()}.json`);
    
    if (!this.options.dryRun) {
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      logOrchestrator.info('Generated migration report', { path: reportPath });
    } else {
      logOrchestrator.info('[DRY RUN] Would generate migration report', { path: reportPath });
    }

    return report;
  }

  async cleanup() {
    logOrchestrator.info('Cleaning up OrchestratorMigration');
    await this.logger.cleanup();
    await this.debugger.cleanup();
    this.removeAllListeners();
  }
}

module.exports = OrchestratorMigration; 
