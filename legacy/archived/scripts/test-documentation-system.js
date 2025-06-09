const path = require('path');
const fs = require('fs').promises;
const DocumentationOrchestrator = require('./core/documentation-orchestrator');
const TelemetryManager = require('./core/telemetry-manager');
const DataFlowValidator = require('./core/data-flow-validator');

async function runSystemTest() {
  console.log('Starting Documentation System Test\n');
  
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
  
  try {
    // Test 1: Component Initialization
    console.log('Test 1: Component Initialization');
    await telemetryManager.initialize();
    await dataFlowValidator.initialize();
    await documentationOrchestrator.initialize();
    console.log('✓ All components initialized successfully\n');
    
    // Test 2: Documentation Processing
    console.log('Test 2: Documentation Processing');
    const results = await documentationOrchestrator.processAllTasks();
    console.log(`✓ Processed ${results.completed} tasks successfully`);
    if (results.failed > 0) {
      console.log(`⚠ ${results.failed} tasks failed`);
    }
    console.log();
    
    // Test 3: Validation
    console.log('Test 3: Documentation Validation');
    const validation = await documentationOrchestrator.validateDocumentation();
    if (validation.errors.length === 0) {
      console.log('✓ All documentation validated successfully\n');
    } else {
      console.log(`⚠ Found ${validation.errors.length} validation errors:`);
      validation.errors.forEach(error => {
        console.log(`  - ${error.type}: ${error.section || error.taskId}`);
      });
      console.log();
    }
    
    // Test 4: Report Generation
    console.log('Test 4: Report Generation');
    const reports = {
      telemetry: await telemetryManager.generateReport(),
      dataFlow: await dataFlowValidator.generateReport(),
      documentation: await documentationOrchestrator.generateReport()
    };
    
    const reportsDir = path.join(__dirname, '../project_meta/reports');
    await fs.mkdir(reportsDir, { recursive: true });
    
    for (const [name, report] of Object.entries(reports)) {
      await fs.writeFile(
        path.join(reportsDir, `${name}_test_report.json`),
        JSON.stringify(report, null, 2)
      );
    }
    console.log('✓ All reports generated successfully\n');
    
    // Test 5: Finalization Plan Update
    console.log('Test 5: Finalization Plan Update');
    const planPath = path.join(__dirname, '../project_meta/plans/FINALIZATION_PLAN.md');
    const planContent = await fs.readFile(planPath, 'utf8');
    
    if (planContent.includes('## Documentation Progress')) {
      console.log('✓ Documentation Progress section found in Finalization Plan\n');
    } else {
      console.log('⚠ Documentation Progress section missing from Finalization Plan\n');
    }
    
    // Summary
    console.log('Test Summary');
    console.log('============');
    console.log(`Total Tasks: ${results.completed + results.failed}`);
    console.log(`Completed: ${results.completed}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Validation Errors: ${validation.errors.length}`);
    console.log('\nAll tests completed');
    
  } catch (error) {
    console.error('\nTest Failed:', error);
    process.exit(1);
  } finally {
    // Cleanup
    await telemetryManager.cleanup();
    await dataFlowValidator.cleanup();
  }
}

runSystemTest().catch(console.error); 