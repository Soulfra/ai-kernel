const path = require('path');
const DocumentationOrchestrator = require('./core/documentation-orchestrator');
const TelemetryManager = require('./core/telemetry-manager');
const DataFlowValidator = require('./core/data-flow-validator');

async function main() {
  // Initialize components
  const telemetryManager = new TelemetryManager({
    metricsPath: path.join(__dirname, '../project_meta/metrics')
  });
  
  const dataFlowValidator = new DataFlowValidator({
    logPath: path.join(__dirname, '../project_meta/logs')
  });
  
  const documentationOrchestrator = new DocumentationOrchestrator({
    docsRoot: path.join(__dirname, '../docs'),
    structurePath: path.join(__dirname, '../CLARITY_ENGINE_DOCS/DOCUMENTATION_STRUCTURE.md')
  });
  
  // Set up event listeners
  documentationOrchestrator.on('initialized', ({ totalTasks, structure }) => {
    console.log(`Initialized documentation orchestration with ${totalTasks} tasks`);
    telemetryManager.recordMetric('documentation_tasks_initialized', totalTasks);
  });
  
  documentationOrchestrator.on('task:complete', ({ task, result }) => {
    console.log(`Completed task: ${task.description}`);
    telemetryManager.recordMetric('documentation_task_completed', 1, {
      taskType: task.type,
      priority: task.priority
    });
  });
  
  documentationOrchestrator.on('task:error', ({ task, error }) => {
    console.error(`Task failed: ${task.description}`, error);
    telemetryManager.recordMetric('documentation_task_failed', 1, {
      taskType: task.type,
      priority: task.priority,
      error: error.message
    });
  });
  
  try {
    // Initialize components
    await telemetryManager.initialize();
    await dataFlowValidator.initialize();
    await documentationOrchestrator.initialize();
    
    // Process all documentation tasks
    console.log('Starting documentation processing...');
    const results = await documentationOrchestrator.processAllTasks();
    
    // Generate reports
    const telemetryReport = await telemetryManager.generateReport();
    const dataFlowReport = await dataFlowValidator.generateReport();
    const documentationReport = await documentationOrchestrator.generateReport();
    
    console.log('\nDocumentation Processing Complete');
    console.log('===============================');
    console.log(`Total Tasks: ${results.completed + results.failed}`);
    console.log(`Completed: ${results.completed}`);
    console.log(`Failed: ${results.failed}`);
    
    if (results.errors.length > 0) {
      console.log('\nErrors:');
      results.errors.forEach(error => console.error(error));
    }
    
    // Save reports
    const reportsDir = path.join(__dirname, '../project_meta/reports');
    await fs.mkdir(reportsDir, { recursive: true });
    
    await fs.writeFile(
      path.join(reportsDir, 'documentation_report.json'),
      JSON.stringify(documentationReport, null, 2)
    );
    
    await fs.writeFile(
      path.join(reportsDir, 'telemetry_report.json'),
      JSON.stringify(telemetryReport, null, 2)
    );
    
    await fs.writeFile(
      path.join(reportsDir, 'data_flow_report.json'),
      JSON.stringify(dataFlowReport, null, 2)
    );
    
  } catch (error) {
    console.error('Error during documentation processing:', error);
    process.exit(1);
  } finally {
    // Cleanup
    await telemetryManager.cleanup();
    await dataFlowValidator.cleanup();
  }
}

main().catch(console.error); 