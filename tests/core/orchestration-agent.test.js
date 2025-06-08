const fs = require('fs');
const path = require('path');
const os = require('os');
const OrchestrationAgent = require('../../scripts/core/orchestration-agent');

/**
 * Kernel Slate: Orchestration Agent Test
 * Verifies workflow execution and self-healing log creation.
 */
describe('Orchestration Agent', () => {
  let tempDir;
  const origCwd = process.cwd();

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orchestrator-'));
    process.chdir(tempDir);
  });

  afterAll(() => {
    process.chdir(origCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('runs workflow and writes log entries', async () => {
    const logPath = path.join(tempDir, 'logs', 'orchestrator.log');
    const agent = new OrchestrationAgent({ logPath });

    const steps = [
      () => Promise.resolve('step1'),
      () => Promise.resolve('step2')
    ];

    const results = await agent.runWorkflow(steps);
    expect(results).toHaveLength(2);
    expect(fs.existsSync(logPath)).toBe(true);
    const lines = fs.readFileSync(logPath, 'utf-8').trim().split('\n');
    expect(lines).toHaveLength(2);
    const first = JSON.parse(lines[0]);
    expect(first.status).toBe('success');
  });
});
