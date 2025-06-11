// snowball.test.js
// Soulfra Standard: Unit/integration/negative tests for the Soulfra Snowball script

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SNOWBALL_PATH = path.join(__dirname, '../soulfra-snowball.js');
const BACKUP_ORCHESTRATOR_PATH = path.join(__dirname, '../backup-orchestrator.js');
const RUN_LOG_PATH = path.join(__dirname, '../../../logs/snowball-run.log');
const SUGGESTION_LOG_PATH = path.join(__dirname, '../../../project_meta/suggestion_log.md');

// Helper to clean up logs after each test
function cleanLogs() {
  if (fs.existsSync(RUN_LOG_PATH)) fs.unlinkSync(RUN_LOG_PATH);
}

describe('Soulfra Snowball Script', () => {
  beforeEach(() => {
    cleanLogs();
  });

  afterAll(() => {
    cleanLogs();
  });

  test('Dry run logs all steps and makes no changes', () => {
    const output = execSync(`node ${SNOWBALL_PATH} --dry-run`).toString();
    expect(output).toMatch(/DRY RUN/);
    expect(fs.readFileSync(RUN_LOG_PATH, 'utf8')).toMatch(/DRY RUN/);
  });

  test('Live run with all steps mocked logs success', () => {
    // Mock backup orchestrator to always succeed
    fs.writeFileSync(BACKUP_ORCHESTRATOR_PATH, 'console.log("[MOCK] Backup complete.");');
    const output = execSync(`node ${SNOWBALL_PATH}`).toString();
    expect(output).toMatch(/Backup Orchestrator/);
    expect(fs.readFileSync(RUN_LOG_PATH, 'utf8')).toMatch(/SUCCESS/);
  });

  test('Failure-path: missing backup orchestrator logs error', () => {
    if (fs.existsSync(BACKUP_ORCHESTRATOR_PATH)) fs.renameSync(BACKUP_ORCHESTRATOR_PATH, BACKUP_ORCHESTRATOR_PATH + '.bak');
    const output = execSync(`node ${SNOWBALL_PATH} --dry-run`).toString();
    // Should log ENOENT or similar error
    expect(output).toMatch(/backup-orchestrator/);
    // Restore file
    if (fs.existsSync(BACKUP_ORCHESTRATOR_PATH + '.bak')) fs.renameSync(BACKUP_ORCHESTRATOR_PATH + '.bak', BACKUP_ORCHESTRATOR_PATH);
  });

  test('Preflight health check: fails if required script is missing', () => {
    // Simulate missing backup orchestrator
    if (fs.existsSync(BACKUP_ORCHESTRATOR_PATH)) fs.renameSync(BACKUP_ORCHESTRATOR_PATH, BACKUP_ORCHESTRATOR_PATH + '.bak');
    try {
      execSync(`node ${SNOWBALL_PATH}`);
    } catch (err) {
      expect(err.message).toMatch(/ENOENT/);
    } finally {
      if (fs.existsSync(BACKUP_ORCHESTRATOR_PATH + '.bak')) fs.renameSync(BACKUP_ORCHESTRATOR_PATH + '.bak', BACKUP_ORCHESTRATOR_PATH);
    }
  });
}); 