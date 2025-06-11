const path = require('path');
const fs = require('fs').promises;
const EventEmitter = require('events');
const LogOrchestrator = require('./log-orchestrator');
const DebugOrchestrator = require('./debug-orchestrator');

class ProjectReorganization extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      backupDir: options.backupDir || path.join(__dirname, '../../backups/project-reorganization'),
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

    this.migrationMap = new Map();
    this.validationResults = new Map();
    this.analysisResults = new Map();
  }

  async initialize() {
    try {
      await this.logger.initialize();
      await this.debugger.initialize();
      await this.logger.info('Initializing ProjectReorganization');

      // Create backup directory
      await this.ensureBackupDirectory();

      // Initialize migration map
      await this.initializeMigrationMap();

      await this.logger.info('ProjectReorganization initialized');
      this.emit('initialized');
    } catch (error) {
      await this.logger.error('Failed to initialize ProjectReorganization', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async ensureBackupDirectory() {
    try {
      await fs.mkdir(this.options.backupDir, { recursive: true });
      await this.logger.info('Backup directory ensured', { path: this.options.backupDir });
    } catch (error) {
      await this.logger.error('Failed to create backup directory', {
        error: error.message,
        path: this.options.backupDir
      });
      throw error;
    }
  }

  async initializeMigrationMap() {
    const directories = [
      { name: 'docs', paths: ['docs', 'CLARITY_ENGINE_DOCS/docs'] },
      { name: 'tests', paths: ['tests', 'CLARITY_ENGINE_DOCS/tests'] },
      { name: 'scripts', paths: ['scripts', 'CLARITY_ENGINE_DOCS/scripts'] }
    ];

    for (const dir of directories) {
      this.migrationMap.set(dir.name, {
        status: 'pending',
        paths: dir.paths,
        backupPath: path.join(this.options.backupDir, `${dir.name}-${Date.now()}`),
        validationResults: [],
        dependencies: [],
        references: []
      });
    }
  }

  async analyzeStructure() {
    await this.logger.info('Starting structure analysis');

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

        if (!sourcePath) {
          await this.logger.warn(`No existing directory found for ${name}`);
          continue;
        }

        const analysis = await this.analyzeDirectory(sourcePath);
        this.analysisResults.set(name, analysis);

        await this.logger.info(`Analyzed structure for ${name}`, {
          files: analysis.files.length,
          directories: analysis.directories.length,
          dependencies: analysis.dependencies.length
        });
      } catch (error) {
        await this.logger.error(`Failed to analyze structure for ${name}`, {
          error: error.message
        });
      }
    }
  }

  async analyzeDirectory(dirPath) {
    const analysis = {
      files: [],
      directories: [],
      dependencies: new Set()
    };

    async function scanDirectory(currentPath) {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        
        if (entry.isDirectory()) {
          analysis.directories.push(fullPath);
          await scanDirectory(fullPath);
        } else if (entry.isFile()) {
          analysis.files.push(fullPath);
          
          if (entry.name.endsWith('.js')) {
            const content = await fs.readFile(fullPath, 'utf8');
            const requires = content.match(/require\(['"](.+?)['"]\)/g) || [];
            const imports = content.match(/import.+from\s+['"](.+?)['"]/g) || [];
            
            [...requires, ...imports].forEach(dep => {
              const match = dep.match(/['"](.+?)['"]/);
              if (match) analysis.dependencies.add(match[1]);
            });
          }
        }
      }
    }

    await scanDirectory(dirPath);
    return {
      ...analysis,
      dependencies: Array.from(analysis.dependencies)
    };
  }

  async validateStructure() {
    await this.logger.info('Starting structure validation');

    for (const [name, info] of this.migrationMap) {
      const analysis = this.analysisResults.get(name);
      if (!analysis) continue;

      const validation = {
        status: 'pending',
        checks: {
          hasFiles: analysis.files.length > 0,
          hasDependencies: analysis.dependencies.length > 0,
          hasValidStructure: this.validateDirectoryStructure(analysis)
        }
      };

      validation.status = this.determineValidationStatus(validation.checks);
      info.validationResults.push(validation);

      await this.logger.info(`Validated structure for ${name}`, {
        status: validation.status,
        checks: validation.checks
      });
    }
  }

  validateDirectoryStructure(analysis) {
    // Add specific validation rules for each directory type
    const rules = {
      docs: {
        requiredDirs: ['architecture', 'api', 'guides'],
        requiredFiles: ['README.md']
      },
      tests: {
        requiredDirs: ['unit', 'integration', 'e2e'],
        requiredFiles: ['jest.config.js']
      },
      scripts: {
        requiredDirs: ['core', 'analysis', 'validation'],
        requiredFiles: ['package.json']
      }
    };

    // Implement validation logic
    return true; // Placeholder
  }

  determineValidationStatus(checks) {
    if (Object.values(checks).every(check => check === true)) {
      return 'valid';
    } else if (Object.values(checks).some(check => check === true)) {
      return 'partial';
    }
    return 'invalid';
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      analysis: Object.fromEntries(this.analysisResults),
      validation: Object.fromEntries(this.migrationMap),
      recommendations: this.generateRecommendations()
    };

    const reportPath = path.join(
      this.options.logDir,
      `reorganization-report-${Date.now()}.json`
    );

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    return report;
  }

  generateRecommendations() {
    const recommendations = {
      keep: [],
      archive: [],
      merge: [],
      refactor: []
    };

    for (const [name, info] of this.migrationMap) {
      const analysis = this.analysisResults.get(name);
      if (!analysis) continue;

      if (info.validationResults.some(v => v.status === 'valid')) {
        recommendations.keep.push({
          name,
          reason: 'Valid structure and content'
        });
      } else if (analysis.files.length === 0) {
        recommendations.archive.push({
          name,
          reason: 'Empty directory'
        });
      } else {
        recommendations.refactor.push({
          name,
          reason: 'Needs restructuring',
          issues: info.validationResults
            .filter(v => v.status !== 'valid')
            .map(v => v.checks)
        });
      }
    }

    return recommendations;
  }

  async cleanup() {
    try {
      await this.logger.info('Cleaning up ProjectReorganization');
      // Add cleanup logic here
      this.emit('cleanup');
    } catch (error) {
      await this.logger.error('Failed to cleanup ProjectReorganization', {
        error: error.message
      });
      throw error;
    }
  }
}

// Main execution
async function main() {
  const reorganization = new ProjectReorganization();
  
  reorganization.on('initialized', async () => {
    await reorganization.logger.info('Project Reorganization initialized');
  });

  reorganization.on('cleanup', async () => {
    await reorganization.logger.info('Project Reorganization cleaned up');
  });

  try {
    await reorganization.initialize();
    await reorganization.analyzeStructure();
    await reorganization.validateStructure();
    const report = await reorganization.generateReport();
    
    await reorganization.logger.info('\nReorganization Report:');
    await reorganization.logger.info('=====================');
    await reorganization.logger.info(JSON.stringify(report.recommendations, null, 2));
    
    await reorganization.cleanup();
  } catch (error) {
    await reorganization.logger.error('Error during reorganization', { error });
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = ProjectReorganization; 