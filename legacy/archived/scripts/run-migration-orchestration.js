/**
 * @file Run Migration Orchestration
 * @description Submits migration/validation/doc-update tasks to the TaskOrchestrator for execution, logging, and reporting. Loads batches from config if present. Listens for orchestrator events and auto-updates docs/reports after each batch.
 * @usage node scripts/run-migration-orchestration.js
 */

const TaskOrchestrator = require('./core/task-orchestrator');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

/**
 * Loads migration batches as task objects from batches.json if present, else fallback.
 * @returns {Promise<Array>} Array of migration task objects
 */
async function loadMigrationBatches() {
  const configPath = path.resolve(__dirname, 'batches.json');
  try {
    const content = await fs.readFile(configPath, 'utf8');
    return JSON.parse(content);
  } catch {
    return [
      {
        id: 'migration-batch-1',
        type: 'migration',
        batch: 'Orchestrator/Core Tests',
        actions: [
          { from: 'scripts/core/tests/meta-orchestrator.test.js', to: 'tests/unit/meta-orchestrator.test.js' },
          // ...more moves
        ],
        user: os.userInfo().username,
        status: 'pending'
      },
      // ...more batches
    ];
  }
}

/**
 * Updates orchestration doc and test run report from orchestrator logs after each batch.
 * @param {object} batch
 * @param {object} result
 */
async function updateDocsAndReports(batch, result) {
  // TODO: Parse orchestrator logs and append summary/results to docs/testing/TEST_SUITE_ORCHESTRATION.md and docs/test-run-report.md
  // This can be extended to update a context/documentation index as well.
}

/**
 * Main entry point: initializes orchestrator, submits tasks, processes queue, and listens for events.
 */
async function main() {
  const orchestrator = new TaskOrchestrator();
  await orchestrator.initialize();

  orchestrator.on('taskStarted', (task) => {
    console.log(`[Orchestrator] Task started: ${task.id}`);
  });
  orchestrator.on('taskCompleted', async (task, result) => {
    console.log(`[Orchestrator] Task completed: ${task.id}`);
    await updateDocsAndReports(task, result);
  });
  orchestrator.on('taskError', (task, error) => {
    console.error(`[Orchestrator] Task error: ${task.id} - ${error.message}`);
  });
  orchestrator.on('progress', (info) => {
    console.log(`[Orchestrator] Progress:`, info);
  });

  const batches = await loadMigrationBatches();
  for (const batch of batches) {
    await orchestrator.addTask(batch);
  }

  // Wait for all tasks to complete (up to 60s)
  let allDone = false;
  for (let i = 0; i < 60; i++) { // up to 60s
    const pending = Array.from(orchestrator.tasks.values()).filter(t => t.status !== 'completed' && t.status !== 'skipped' && t.status !== 'error');
    if (pending.length === 0) {
      allDone = true;
      break;
    }
    await new Promise(res => setTimeout(res, 1000));
  }
  if (!allDone) {
    console.warn('Not all migration tasks completed in time.');
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('Migration orchestration failed:', err);
    process.exit(1);
  });
} 