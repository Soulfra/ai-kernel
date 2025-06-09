const OrchestrationRouter = require('./core/orchestration-router');
const path = require('path');

async function main() {
  const router = new OrchestrationRouter({
    configPath: path.join(__dirname, '../config/meta-orchestrator.json'),
    enableParallel: true,
    maxConcurrent: 5,
    timeout: 30000,
    retryAttempts: 3
  });

  // Set up event listeners
  router.on('initialized', ({ orchestrators, status }) => {
    console.log('Orchestration system initialized:', {
      orchestrators,
      status
    });
  });

  router.on('orchestratorInitialized', ({ name, status }) => {
    console.log(`Orchestrator ${name} initialized with status: ${status}`);
  });

  router.on('orchestratorError', ({ name, error }) => {
    console.error(`Error in orchestrator ${name}:`, error);
  });

  router.on('orchestratorComplete', ({ name, result }) => {
    console.log(`Orchestrator ${name} completed:`, result);
  });

  router.on('error', (error) => {
    console.error('Fatal error in orchestration system:', error);
    process.exit(1);
  });

  try {
    // Initialize the orchestration system
    await router.initialize();

    // Example: Execute a workflow
    const result = await router.executeWorkflow('documentation', {
      target: 'docs',
      format: 'markdown'
    });

    console.log('Workflow completed:', result);
  } catch (error) {
    console.error('Failed to initialize orchestration system:', error);
    process.exit(1);
  } finally {
    // Clean up resources
    await router.cleanup();
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\nGracefully shutting down...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nReceived SIGTERM. Shutting down...');
  process.exit(0);
});

// Run the main function
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 