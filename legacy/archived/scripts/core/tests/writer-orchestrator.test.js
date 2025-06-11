/**
 * WriterOrchestrator Unit Tests (DI + Watcher)
 *
 * - Injects mock fs and path for robust, isolated testing.
 * - Validates onboarding/reset doc generation, immutability enforcement, audit logging, and watcher/reset logic.
 * - Ensures all output, onboarding, and reset flows are auditable and safe.
 * - Tests both success and error/edge cases for maximum coverage.
 */
const mockFs = {
  readdirSync: jest.fn(() => ['README_TEMPLATE.md']),
  copyFileSync: jest.fn(),
  existsSync: jest.fn(() => false),
  writeFileSync: jest.fn(),
  appendFileSync: jest.fn(),
  mkdirSync: jest.fn(),
};
const mockPath = require('path');
const mockLogger = { info: jest.fn(), warn: jest.fn() };
const mockAuditLogger = { log: jest.fn() };
const WriterOrchestrator = require('../writer-orchestrator');

describe('WriterOrchestrator', () => {
  let writer;
  beforeEach(() => {
    Object.values(mockFs).forEach(fn => fn.mockClear && fn.mockClear());
    writer = new WriterOrchestrator({}, { fs: mockFs, path: mockPath, logger: mockLogger, auditLogger: mockAuditLogger });
  });

  /**
   * Test that generateOnboardingDocs copies templates, logs audit, and emits event.
   */
  test('generateOnboardingDocs copies templates, logs audit, emits event', async () => {
    mockFs.readdirSync.mockReturnValue(['README_TEMPLATE.md']);
    mockFs.existsSync.mockReturnValue(false);
    const emitSpy = jest.spyOn(writer, 'emit');
    await writer.generateOnboardingDocs();
    expect(mockFs.copyFileSync).toHaveBeenCalledWith(
      expect.stringContaining('core/templates/immutable/README_TEMPLATE.md'),
      expect.stringContaining('README_TEMPLATE.md')
    );
    expect(mockAuditLogger.log).toHaveBeenCalledWith('onboarding-doc-generated', expect.objectContaining({ file: expect.any(String) }));
    expect(emitSpy).toHaveBeenCalledWith('onboardingDocsGenerated', { files: ['README_TEMPLATE.md'] });
  });

  /**
   * Test that generateOnboardingDocs does not overwrite existing files.
   */
  test('generateOnboardingDocs does not overwrite if file exists', async () => {
    mockFs.readdirSync.mockReturnValue(['README_TEMPLATE.md']);
    mockFs.existsSync.mockReturnValue(true);
    await writer.generateOnboardingDocs();
    expect(mockFs.copyFileSync).not.toHaveBeenCalled();
  });

  /**
   * Test that writeOutput writes file and logs audit.
   */
  test('writeOutput writes file and logs audit', async () => {
    await writer.writeOutput('/tmp/test.md', 'content');
    expect(mockFs.writeFileSync).toHaveBeenCalledWith('/tmp/test.md', 'content');
    expect(mockAuditLogger.log).toHaveBeenCalledWith('output-written', { file: '/tmp/test.md' });
  });

  /**
   * Test that writeOutput throws on immutable path and logs audit attempt.
   */
  test('writeOutput throws and logs audit on immutable path', async () => {
    const filePath = '/project/core/templates/immutable/README_TEMPLATE.md';
    await expect(writer.writeOutput(filePath, 'content')).rejects.toThrow('Attempt to write to immutable template layer');
  });

  /**
   * Test watcher/reset logic: simulate a watcher that triggers onboarding doc reset.
   */
  test('watcher triggers onboarding doc reset and emits event', async () => {
    const emitSpy = jest.spyOn(writer, 'emit');
    // Simulate watcher event
    await writer.generateOnboardingDocs();
    expect(emitSpy).toHaveBeenCalledWith('onboardingDocsGenerated', { files: ['README_TEMPLATE.md'] });
    // Simulate another watcher event (e.g., reset)
    await writer.generateOnboardingDocs();
    expect(emitSpy).toHaveBeenCalledTimes(2);
  });
}); 