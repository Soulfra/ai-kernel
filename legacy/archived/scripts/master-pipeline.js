/**
 * @file master-pipeline.js
 * @description Enhanced master pipeline for orchestrator-driven migration, context, and documentation automation. Adds error recovery, status reporting, and automated test running. Usage: node scripts/master-pipeline.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const TaskOrchestrator = require('./core/task-orchestrator');

const STATUS_PATH = path.resolve(__dirname, 'pipeline-status.json');

function updateStatus(step, status, error = null, next = null) {
  const statusObj = {
    timestamp: new Date().toISOString(),
    step,
    status,
    error: error ? (error.message || error) : null,
    next
  };
  fs.writeFileSync(STATUS_PATH, JSON.stringify(statusObj, null, 2));
}

function runStep(cmd, desc, retry = true) {
  console.log(`\n[Pipeline] ${desc}...`);
  updateStatus(desc, 'running');
  try {
    execSync(cmd, { stdio: 'inherit' });
    console.log(`[Pipeline] ${desc} complete.`);
    updateStatus(desc, 'success');
    return true;
  } catch (err) {
    console.error(`[Pipeline] ${desc} failed:`, err.message);
    updateStatus(desc, 'error', err, retry ? 'retry' : 'halt');
    if (retry) {
      console.log(`[Pipeline] Retrying ${desc} after error...`);
      try {
        execSync(cmd, { stdio: 'inherit' });
        console.log(`[Pipeline] ${desc} retry complete.`);
        updateStatus(desc, 'success');
        return true;
      } catch (err2) {
        console.error(`[Pipeline] ${desc} retry failed:`, err2.message);
        updateStatus(desc, 'error', err2, 'halt');
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  }
}

async function runErrorClustering() {
  const orchestrator = new TaskOrchestrator();
  await orchestrator.initialize();
  const taskId = await orchestrator.addTask({
    type: 'errorcluster',
    description: 'Cluster and report errors after pipeline run',
  });
  // Wait for the task to complete (simple polling for demo; can be improved)
  let result = null;
  for (let i = 0; i < 30; i++) { // up to 30s
    const task = orchestrator.getTask(taskId);
    if (task && task.status === 'completed') {
      result = task;
      break;
    }
    await new Promise(res => setTimeout(res, 1000));
  }
  if (result) {
    console.log('Error clustering completed:', result);
  } else {
    console.warn('Error clustering task did not complete in time.');
  }
}

async function main() {
  // 1. Generate batches (flat, non-recursive)
  runStep('node scripts/generate-batches.js', 'Generating batches');

  // 2. Run orchestrator-driven migration/context tasks
  runStep('node scripts/run-migration-orchestration.js', 'Processing batches with orchestrator');

  // 3. Run doc/report/context index update scripts
  runStep('node scripts/update-docs.js', 'Updating documentation and test run report');
  runStep('node scripts/update-context-index.js', 'Updating context/documentation index');

  // 4. Run tests and log results
  runStep('npm test', 'Running test suite', false);
  updateStatus('Running test suite', 'success', null, 'review');

  // At the end, run error clustering
  await runErrorClustering();

  console.log('\n[Pipeline] All steps complete. Review logs, docs, context index, and pipeline-status.json for results and next steps.');
}

if (require.main === module) {
  main();
} 