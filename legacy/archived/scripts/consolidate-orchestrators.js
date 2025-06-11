const fs = require('fs').promises;
const path = require('path');
const LogOrchestrator = require('./core/log-orchestrator');
const logOrchestrator = new LogOrchestrator();

async function consolidateOrchestrators() {
  const logger = new LogOrchestrator({
    logDir: path.join(__dirname, '../logs'),
    enableMetrics: true
  });
  
  try {
    await logger.initialize();
    logger.info('Starting orchestrator consolidation');
    
    // 1. Create unified directory structure
    const unifiedDir = path.join(__dirname, 'unified');
    await fs.mkdir(unifiedDir, { recursive: true });
    await fs.mkdir(path.join(unifiedDir, 'core'), { recursive: true });
    await fs.mkdir(path.join(unifiedDir, 'workflows'), { recursive: true });
    
    // 2. Create backup of old files
    const backupDir = path.join(__dirname, '../backups/orchestrator-consolidation');
    await fs.mkdir(backupDir, { recursive: true });
    
    const oldOrchestratorPaths = [
      path.join(__dirname, 'migration-orchestrator.js'),
      path.join(__dirname, 'generation/migration/migration-orchestrator.js'),
      path.join(__dirname, 'unified-migration/orchestrator.js'),
      path.join(__dirname, 'unified-migration/core/orchestrator.js'),
      path.join(__dirname, 'core/meta-orchestrator.js'),
      path.join(__dirname, 'generation/orchestration/system-orchestrator.js'),
      path.join(__dirname, 'generation/orchestration/document-orchestrator.js')
    ];
    
    for (const oldPath of oldOrchestratorPaths) {
      try {
        const backupPath = path.join(backupDir, path.basename(oldPath));
        await fs.copyFile(oldPath, backupPath);
        logger.info(`Backed up ${oldPath} to ${backupPath}`);
      } catch (error) {
        logger.warn(`Could not backup ${oldPath}: ${error.message}`);
      }
    }
    
    // 3. Create README explaining the consolidation
    const readmeContent = `# Unified Orchestration System

This directory contains the unified orchestration system that combines functionality from multiple orchestrators:

## Core Components
- MetaOrchestrator: Central orchestration and workflow management
- LogOrchestrator: Unified logging system
- DebugOrchestrator: Error handling and debugging
- TaskOrchestrator: Task execution and scheduling
- DocumentationOrchestrator: Documentation generation and management
- QualityOrchestrator: Quality assurance and validation
- AgentOrchestrator: Agent coordination and management

## Workflows
- Documentation: Generate and validate documentation
- Testing: Run and validate tests
- Deployment: Deploy with quality checks
- Maintenance: System maintenance and debugging

## Features
- Event-driven architecture
- Task queue management
- Parallel processing
- Caching
- Metrics collection
- Comprehensive logging
- Error handling
- State management
- Workflow orchestration

## Usage
\`\`\`javascript
const MetaOrchestrator = require('./core/meta-orchestrator');

const orchestrator = new MetaOrchestrator({
  maxConcurrent: 5,
  batchSize: 10,
  cacheEnabled: true,
  llmOptimization: true
});

await orchestrator.initialize();
await orchestrator.executeWorkflow('documentation', {
  target: 'docs',
  format: 'markdown'
});
\`\`\`

## Migration Report
After execution, a migration report will be generated at \`../migration-report.json\` containing:
- Total tasks processed
- Success/failure counts
- Completed files
- Failed files
- Conflicts detected
- Recommendations
- Detailed results
`;
    
    await fs.writeFile(path.join(unifiedDir, 'README.md'), readmeContent);
    logger.info('Created README.md');
    
    // 4. Create migration plan
    const migrationPlan = {
      timestamp: new Date().toISOString(),
      steps: [
        {
          step: 1,
          action: 'Backup old orchestrators',
          status: 'completed',
          files: oldOrchestratorPaths.map(p => path.basename(p))
        },
        {
          step: 2,
          action: 'Create unified directory structure',
          status: 'completed',
          paths: [
            unifiedDir,
            path.join(unifiedDir, 'core'),
            path.join(unifiedDir, 'workflows')
          ]
        },
        {
          step: 3,
          action: 'Copy new orchestrators',
          status: 'pending',
          files: [
            'meta-orchestrator.js',
            'log-orchestrator.js',
            'debug-orchestrator.js',
            'task-orchestrator.js',
            'documentation-orchestrator.js',
            'quality-orchestrator.js',
            'agent-orchestrator.js'
          ]
        },
        {
          step: 4,
          action: 'Create workflow definitions',
          status: 'pending',
          workflows: [
            'documentation.js',
            'testing.js',
            'deployment.js',
            'maintenance.js'
          ]
        },
        {
          step: 5,
          action: 'Update references',
          status: 'pending',
          description: 'Update all references to use new orchestrator paths'
        },
        {
          step: 6,
          action: 'Remove old orchestrators',
          status: 'pending',
          files: oldOrchestratorPaths.map(p => path.basename(p))
        }
      ]
    };
    
    await fs.writeFile(
      path.join(unifiedDir, 'migration-plan.json'),
      JSON.stringify(migrationPlan, null, 2)
    );
    logger.info('Created migration plan');
    
    // 5. Create task log entry
    const taskLog = {
      taskId: 'orchestrator_consolidation_001',
      description: 'Consolidate all orchestrators into unified system',
      status: 'in_progress',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      steps: migrationPlan.steps,
      metrics: {
        totalSteps: migrationPlan.steps.length,
        completedSteps: migrationPlan.steps.filter(s => s.status === 'completed').length,
        pendingSteps: migrationPlan.steps.filter(s => s.status === 'pending').length
      }
    };
    
    await fs.writeFile(
      path.join(__dirname, '../project_meta/task_logs/orchestrator_consolidation_tasks.json'),
      JSON.stringify(taskLog, null, 2)
    );
    logger.info('Created task log entry');
    
    logger.info('Consolidation setup complete');
    logOrchestrator.info('Consolidation setup complete!');
    logOrchestrator.info('Next steps:');
    logOrchestrator.info('1. Review the migration plan in unified/migration-plan.json');
    logOrchestrator.info('2. Review the task log in project_meta/task_logs/orchestrator_consolidation_tasks.json');
    logOrchestrator.info('3. Execute the migration plan');
    logOrchestrator.info('\nTo execute the migration:');
    logOrchestrator.info('node unified/core/meta-orchestrator.js --migrate');
    
  } catch (error) {
    logger.error('Consolidation failed', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  } finally {
    await logger.cleanup();
  }
}

// Run consolidation
consolidateOrchestrators().catch(console.error); 