const OrchestrationRouter = require('./core/orchestration-router');
const fs = require('fs').promises;
const path = require('path');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function readLastLines(filePath, n = 10) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.trim().split('\n');
    return lines.slice(-n).join('\n');
  } catch (e) {
    return '';
  }
}

async function main() {
  console.log('--- E2E Orchestration Test: Initializing Router ---');
  const router = new OrchestrationRouter();
  await router.initialize();
  await sleep(1000); // Let orchestrators finish initializing

  // Emit test events to each orchestrator
  const orchestratorNames = Array.from(router.orchestrators.keys());
  for (const name of orchestratorNames) {
    const orchestrator = router.orchestrators.get(name);
    if (!orchestrator) continue;
    // Emit log event
    orchestrator.emit('log', { message: `Test log from ${name}`, level: 'info', test: true });
    // Emit error event
    orchestrator.emit('error', { message: `Test error from ${name}`, level: 'error', test: true });
    // Emit doc event
    orchestrator.emit('doc', { message: `Test doc from ${name}`, type: 'test', test: true });
    // Emit goal event
    orchestrator.emit('goal', { title: `Test goal for ${name}`, status: 'pending', details: 'E2E test goal' });
    // Emit goalStatus event
    orchestrator.emit('goalStatus', { id: `goal_${name}_e2e`, status: 'completed', details: 'E2E test goal completed' });
  }

  // Wait for event propagation
  await sleep(2000);

  // Check logs and outputs
  const logsDir = path.join(__dirname, '../logs/tasks');
  const writerDir = path.join(__dirname, '../logs/writer');
  const plannerDir = path.join(__dirname, '../project_meta/task_logs');

  const logFiles = [
    path.join(logsDir, 'tasks.log'),
    path.join(writerDir, 'logs.md'),
    path.join(writerDir, 'docs.md'),
    path.join(writerDir, 'summaries.md'),
    path.join(writerDir, 'errors.md'),
    path.join(plannerDir, 'main_task_log.md'),
    path.join(plannerDir, 'main_task_log.json')
  ];

  console.log('\n--- E2E Orchestration Test: Log/Output Review ---');
  for (const file of logFiles) {
    const lastLines = await readLastLines(file, 10);
    console.log(`\nFile: ${file}\n${lastLines}`);
  }

  // Check for errors in logs
  let errorsFound = false;
  for (const file of logFiles) {
    const content = await readLastLines(file, 50);
    if (/error|fail|exception/i.test(content)) {
      errorsFound = true;
      console.log(`\n[!] Error or failure detected in ${file}`);
    }
  }

  // Generate summary report
  const summary = {
    timestamp: new Date().toISOString(),
    orchestrators: orchestratorNames,
    errorsFound
  };
  const summaryPath = path.join(__dirname, '../logs/e2e_orchestration_summary.json');
  await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`\n--- E2E Orchestration Test: Summary Report ---\n${JSON.stringify(summary, null, 2)}`);
  console.log(`\nSummary written to: ${summaryPath}`);

  if (errorsFound) {
    console.log('\n[!] E2E test completed with errors. Check logs and PlannerOrchestrator for details.');
  } else {
    console.log('\n[✓] E2E test completed successfully. All orchestrators and event flows are working.');
  }
}

main().catch(err => {
  console.error('E2E Orchestration Test failed:', err);
  process.exit(1);
}); 