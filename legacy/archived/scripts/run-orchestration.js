const path = require('path');
const { TaskRouter, handlers, middleware } = require('./core/task-router');
const TaskOrchestrator = require('./core/task-orchestrator');
const TaskLifecycleManager = require('./core/task-lifecycle-manager');
const TelemetryManager = require('./core/telemetry-manager');
const DataFlowValidator = require('./core/data-flow-validator');
const LogOrchestrator = require('./core/log-orchestrator');

async function main() {
  // Initialize components
  const taskRouter = new TaskRouter();
  const taskOrchestrator = new TaskOrchestrator({
    taskLogPath: path.join(__dirname, '../project_meta/task_logs/main_task_log.json'),
    finalizationPlanPath: path.join(__dirname, '../project_meta/plans/FINALIZATION_PLAN.md')
  });
  const lifecycleManager = new TaskLifecycleManager({
    archiveDir: path.join(__dirname, '../project_meta/archives'),
    contextDir: path.join(__dirname, '../project_meta/context')
  });
  const telemetryManager = new TelemetryManager({
    metricsDir: path.join(__dirname, '../logs/metrics')
  });
  const dataFlowValidator = new DataFlowValidator({
    logDir: path.join(__dirname, '../logs/data-flow')
  });
  const logOrchestrator = new LogOrchestrator();

  // Register task handlers
  Object.entries(handlers).forEach(([type, handler]) => {
    taskRouter.registerHandler(type, handler);
  });

  // Register middleware
  Object.values(middleware).forEach(middleware => {
    taskRouter.registerMiddleware(middleware);
  });

  // Initialize all components
  await Promise.all([
    taskOrchestrator.initialize(),
    lifecycleManager.initialize(),
    telemetryManager.initialize(),
    dataFlowValidator.initialize()
  ]);

  // Set up event listeners
  taskOrchestrator.on('taskCompleted', async ({ task, result }) => {
    // Archive completed tasks
    await lifecycleManager.archiveTask(task, 'completed');
    
    // Add context
    await lifecycleManager.addContext({
      type: 'task_completion',
      taskId: task.taskId,
      result,
      phase: task.relatedPlanSection
    });

    // Record telemetry
    await telemetryManager.recordMetric('task_completed', 1, {
      taskId: task.taskId,
      type: task.type,
      phase: task.relatedPlanSection
    });
  });

  // Get tasks to process
  const tasks = await taskOrchestrator.getTasks({
    status: ['planned', 'in-progress']
  });

  logOrchestrator.info(`Found ${tasks.length} tasks to process`);

  // Process tasks
  for (const task of tasks) {
    try {
      // Validate task
      await taskRouter.validateTask(task);

      // Route and execute task
      const result = await taskRouter.routeTask(task);

      // Update task status
      await taskOrchestrator.updateTask(task.taskId, {
        status: 'completed',
        result
      });

      // Validate data flow
      await dataFlowValidator.validateSource(task.taskId, result, task.type);
    } catch (error) {
      logOrchestrator.error(`Error processing task ${task.taskId}:`, error);
      
      // Archive failed task
      await lifecycleManager.archiveTask(task, `failed: ${error.message}`);
      
      // Record failure
      await telemetryManager.recordMetric('task_failed', 1, {
        taskId: task.taskId,
        error: error.message
      });
    }
  }

  // Generate reports
  const [telemetryReport, dataFlowReport] = await Promise.all([
    telemetryManager.generateReport(),
    dataFlowValidator.generateReport()
  ]);

  // Add report context
  await lifecycleManager.addContext({
    type: 'execution_report',
    telemetryReport,
    dataFlowReport,
    timestamp: new Date().toISOString()
  });

  // Cleanup
  await Promise.all([
    taskOrchestrator.cleanup(),
    lifecycleManager.cleanup(),
    telemetryManager.cleanup()
  ]);
}

main().catch(console.error); 