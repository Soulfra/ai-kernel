const { OrchestrationRouter } = require('../orchestration-router');
const { TaskLogger } = require('../task-logger');
const { TelemetryManager } = require('../telemetry-manager');
const path = require('path');

describe('Orchestration System', () => {
  let router;
  let taskLogger;
  let telemetryManager;

  beforeEach(async () => {
    taskLogger = new TaskLogger({
      logDir: path.join(__dirname, '../../../logs/tasks'),
      enableTelemetry: true
    });

    telemetryManager = new TelemetryManager({
      metricsDir: path.join(__dirname, '../../../logs/metrics')
    });

    router = new OrchestrationRouter({
      configPath: path.join(__dirname, '../../../config/meta-orchestrator.json'),
      taskLogger,
      telemetryManager
    });

    await router.initialize();
  });

  afterEach(async () => {
    await router.cleanup();
  });

  test('should create spans for workflow execution', async () => {
    const workflow = await router.executeWorkflow('documentation', {
      target: 'test',
      format: 'markdown'
    });

    const spans = await taskLogger.getSpans();
    expect(spans.length).toBeGreaterThan(0);
    expect(spans[0].name).toBe('workflow:documentation');
  });

  test('should record telemetry metrics', async () => {
    await router.executeWorkflow('task', {
      taskId: 'test_task',
      description: 'Test task'
    });

    const metrics = await telemetryManager.getMetrics();
    expect(metrics.workflow_executions).toBeGreaterThan(0);
    expect(metrics.task_completions).toBeGreaterThan(0);
  });

  test('should maintain task history', async () => {
    const taskId = 'test_task_2';
    await router.executeWorkflow('task', {
      taskId,
      description: 'Test task 2'
    });

    const history = await taskLogger.getTaskHistory(taskId);
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].taskId).toBe(taskId);
  });
}); 