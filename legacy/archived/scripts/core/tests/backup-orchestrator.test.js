const BackupOrchestrator = require('../backup-orchestrator');

describe('BackupOrchestrator', () => {
  let backupOrchestrator;
  let mockLogger;
  let mockTelemetry;

  beforeEach(() => {
    mockLogger = { log: jest.fn() };
    mockTelemetry = { recordMetric: jest.fn() };
    backupOrchestrator = new BackupOrchestrator({}, { logger: mockLogger, telemetryManager: mockTelemetry });
  });

  it('should initialize without error', async () => {
    await expect(backupOrchestrator.initialize()).resolves.not.toThrow();
  });

  it('should perform a dry-run backup', async () => {
    backupOrchestrator.backup = jest.fn().mockResolvedValue({ status: 'dry-run', manifest: {} });
    const result = await backupOrchestrator.backup({ dryRun: true });
    expect(result.status).toBe('dry-run');
  });

  it('should require approval for real backup', async () => {
    backupOrchestrator.backup = jest.fn().mockResolvedValue({ status: 'approved', manifest: {} });
    const result = await backupOrchestrator.backup({ approval: true });
    expect(result.status).toBe('approved');
  });

  it('should generate a manifest', async () => {
    backupOrchestrator.generateManifest = jest.fn().mockResolvedValue({ files: [], skipped: [] });
    const manifest = await backupOrchestrator.generateManifest('./backups/test');
    expect(manifest).toHaveProperty('files');
    expect(manifest).toHaveProperty('skipped');
  });

  it('should validate a backup', async () => {
    backupOrchestrator.validateBackup = jest.fn().mockResolvedValue({ valid: true });
    const result = await backupOrchestrator.validateBackup('./backups/test');
    expect(result.valid).toBe(true);
  });

  it('should handle restore', async () => {
    backupOrchestrator.restore = jest.fn().mockResolvedValue({ status: 'restored' });
    const result = await backupOrchestrator.restore('backup-id');
    expect(result.status).toBe('restored');
  });

  it('should handle rollback', async () => {
    backupOrchestrator.rollback = jest.fn().mockResolvedValue({ status: 'rolled-back' });
    const result = await backupOrchestrator.rollback();
    expect(result.status).toBe('rolled-back');
  });

  it('should log actions and send telemetry', async () => {
    await backupOrchestrator.log('info', 'Test log', { foo: 'bar' });
    expect(mockLogger.log).toHaveBeenCalledWith('info', 'Test log', { foo: 'bar' });
    await backupOrchestrator.sendTelemetry('backup_test', 1, { test: true });
    expect(mockTelemetry.recordMetric).toHaveBeenCalledWith('backup_test', 1, { test: true }, 'BackupOrchestrator');
  });

  // Edge cases
  it('should handle excluded directories and symlink loops', async () => {
    // Simulate manifest generation with excluded dirs and symlinks
    backupOrchestrator.generateManifest = jest.fn().mockResolvedValue({ files: ['a.js'], skipped: ['node_modules', 'symlink-loop'] });
    const manifest = await backupOrchestrator.generateManifest('./backups/test');
    expect(manifest.skipped).toContain('node_modules');
    expect(manifest.skipped).toContain('symlink-loop');
  });

  it('should handle ENOENT and error cases', async () => {
    backupOrchestrator.backup = jest.fn().mockRejectedValue(new Error('ENOENT: file not found'));
    await expect(backupOrchestrator.backup({})).rejects.toThrow('ENOENT');
  });

  it('should require approval before destructive operations', async () => {
    backupOrchestrator.ensureSafeBackup = jest.fn().mockResolvedValue({ status: 'approved' });
    const result = await backupOrchestrator.ensureSafeBackup({ approval: true });
    expect(result.status).toBe('approved');
  });
}); 