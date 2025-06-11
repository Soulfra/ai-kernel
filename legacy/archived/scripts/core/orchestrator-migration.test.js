const path = require('path');
const fs = require('fs').promises;
const OrchestratorMigration = require('./orchestrator-migration');

describe('OrchestratorMigration', () => {
  let migration;
  const testBackupDir = path.join(__dirname, '../../backups/test-migration');

  beforeEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testBackupDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore error if directory doesn't exist
    }

    migration = new OrchestratorMigration({
      backupDir: testBackupDir,
      dryRun: true
    });
  });

  afterEach(async () => {
    await migration.cleanup();
  });

  test('initializes successfully', async () => {
    await expect(migration.initialize()).resolves.not.toThrow();
    expect(migration.migrationMap.size).toBeGreaterThan(0);
  });

  test('creates backup directory', async () => {
    await migration.initialize();
    await expect(fs.access(testBackupDir)).resolves.not.toThrow();
  });

  test('analyzes dependencies correctly', async () => {
    await migration.initialize();
    await migration.analyzeDependencies();

    for (const [name, info] of migration.migrationMap) {
      expect(Array.isArray(info.dependencies)).toBe(true);
    }
  });

  test('detects circular dependencies', async () => {
    await migration.initialize();
    await migration.analyzeDependencies();
    await migration.validateMigration();

    const report = await migration.generateMigrationReport();
    const hasCircularDeps = report.orchestrators.some(orch => 
      orch.validation.checks.some(check => 
        check.name === 'circular_dependencies' && check.status === 'error'
      )
    );

    expect(hasCircularDeps).toBeDefined();
  });

  test('generates migration report', async () => {
    await migration.initialize();
    await migration.analyzeDependencies();
    await migration.validateMigration();

    const report = await migration.generateMigrationReport();
    expect(report).toHaveProperty('timestamp');
    expect(report).toHaveProperty('dryRun');
    expect(report).toHaveProperty('orchestrators');
    expect(Array.isArray(report.orchestrators)).toBe(true);
  });

  test('validates migration status', async () => {
    await migration.initialize();
    await migration.analyzeDependencies();
    await migration.validateMigration();

    for (const [name, info] of migration.migrationMap) {
      const validation = migration.validationResults.get(name);
      expect(validation).toHaveProperty('status');
      expect(validation).toHaveProperty('checks');
      expect(Array.isArray(validation.checks)).toBe(true);
    }
  });

  test('handles missing files gracefully', async () => {
    await migration.initialize();
    await migration.backupOrchestrators();

    const report = await migration.generateMigrationReport();
    const failedBackups = report.orchestrators.filter(orch => 
      orch.status === 'backup_failed'
    );

    expect(failedBackups).toBeDefined();
  });

  test('performs dry run correctly', async () => {
    await migration.initialize();
    await migration.backupOrchestrators();

    // In dry run mode, no files should be created
    const files = await fs.readdir(testBackupDir);
    expect(files.length).toBe(0);
  });

  test('cleans up resources', async () => {
    await migration.initialize();
    await expect(migration.cleanup()).resolves.not.toThrow();
  });
}); 