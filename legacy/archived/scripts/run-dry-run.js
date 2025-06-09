const DryRunManager = require('./core/dry-run-manager');
const path = require('path');
const fs = require('fs').promises;

async function main() {
  const dryRunManager = new DryRunManager({
    outputDir: path.join(__dirname, '../dry-run-output'),
    saveResults: true,
    verbose: true
  });

  // Set up event listeners
  dryRunManager.on('initialized', () => {
    console.log('Dry run manager initialized');
  });

  dryRunManager.on('reportGenerated', ({ path }) => {
    console.log(`Dry run report generated at: ${path}`);
  });

  dryRunManager.on('error', (error) => {
    console.error('Dry run error:', error);
    process.exit(1);
  });

  try {
    // Initialize the dry run manager
    await dryRunManager.initialize();

    // Load configuration
    const configPath = path.join(__dirname, '../config/meta-orchestrator.json');
    const config = JSON.parse(await fs.readFile(configPath, 'utf8'));

    // Simulate each orchestrator
    for (const [name, orchestratorConfig] of Object.entries(config.orchestrators)) {
      console.log(`Simulating orchestrator: ${name}`);
      await dryRunManager.simulateOrchestrator(name, orchestratorConfig);
    }

    // Simulate workflows
    for (const [name, workflowConfig] of Object.entries(config.workflows)) {
      console.log(`Simulating workflow: ${name}`);
      await dryRunManager.simulateWorkflow(name, workflowConfig);
    }

    // Generate and display report
    const report = await dryRunManager.generateReport();
    console.log('\nDry Run Summary:');
    console.log('----------------');
    console.log(`Total Orchestrators: ${report.summary.totalOrchestrators}`);
    console.log(`Total Operations: ${report.summary.totalOperations}`);
    console.log(`Estimated Total Time: ${report.summary.estimatedTotalTime}ms`);
    
    if (report.summary.potentialIssues.length > 0) {
      console.log('\nPotential Issues:');
      report.summary.potentialIssues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
    }

  } catch (error) {
    console.error('Failed to complete dry run:', error);
    process.exit(1);
  } finally {
    await dryRunManager.cleanup();
  }
}

// Run the main function
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 