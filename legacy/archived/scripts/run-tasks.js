const path = require('path');
const TaskOrchestrator = require('./core/task-orchestrator');
const TelemetryManager = require('./core/telemetry-manager');
const DataFlowValidator = require('./core/data-flow-validator');

async function main() {
  // Initialize components
  const taskOrchestrator = new TaskOrchestrator({
    taskLogPath: path.join(__dirname, '../project_meta/task_logs/main_task_log.json'),
    finalizationPlanPath: path.join(__dirname, '../project_meta/plans/FINALIZATION_PLAN.md')
  });

  const telemetryManager = new TelemetryManager({
    metricsDir: path.join(__dirname, '../logs/metrics')
  });

  const dataFlowValidator = new DataFlowValidator({
    logDir: path.join(__dirname, '../logs/data-flow')
  });

  // Initialize all components
  await Promise.all([
    taskOrchestrator.initialize(),
    telemetryManager.initialize(),
    dataFlowValidator.initialize()
  ]);

  // Set up event listeners
  taskOrchestrator.on('taskStarted', async (task) => {
    await telemetryManager.recordMetric('task_started', 1, {
      taskId: task.taskId,
      priority: task.priority
    });
  });

  taskOrchestrator.on('taskCompleted', async ({ task, result }) => {
    await telemetryManager.recordMetric('task_completed', 1, {
      taskId: task.taskId,
      priority: task.priority
    });
  });

  taskOrchestrator.on('taskFailed', async ({ task, error }) => {
    await telemetryManager.recordMetric('task_failed', 1, {
      taskId: task.taskId,
      priority: task.priority,
      error: error.message
    });
  });

  // Get high priority tasks
  const highPriorityTasks = await taskOrchestrator.getTasks({
    status: ['planned', 'in-progress'],
    priority: 'high'
  });

  console.log(`Found ${highPriorityTasks.length} high priority tasks`);

  // Execute tasks
  for (const task of highPriorityTasks) {
    try {
      console.log(`Executing task: ${task.taskId} - ${task.description}`);
      await taskOrchestrator.executeTask(task.taskId);
    } catch (error) {
      console.error(`Error executing task ${task.taskId}:`, error);
    }
  }

  // Generate reports
  const [telemetryReport, dataFlowReport] = await Promise.all([
    telemetryManager.generateReport(),
    dataFlowValidator.generateReport()
  ]);

  console.log('Telemetry report generated:', telemetryReport);
  console.log('Data flow report generated:', dataFlowReport);

  // Cleanup
  await Promise.all([
    taskOrchestrator.cleanup(),
    telemetryManager.cleanup()
  ]);
}

main().catch(console.error); 