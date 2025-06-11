const MeshFeatureScaffoldOrchestrator = require('./mesh-feature-scaffold-orchestrator');
const OverseerOrchestrator = require('./overseer-orchestrator');
const WatchdogOrchestrator = require('./watchdog-orchestrator');

(async () => {
  const scaffold = new MeshFeatureScaffoldOrchestrator();
  const overseer = new OverseerOrchestrator();
  const watchdog = new WatchdogOrchestrator();

  // Step 1: Scaffold a mesh integration task
  const taskName = 'mesh-integration-task-001';
  let docPath, logPath;
  await new Promise((resolve) => {
    scaffold.once('scaffolded', (data) => {
      console.log('[SCAFFOLD] Task created:', data);
      docPath = data.docPath;
      logPath = data.logPath;
      resolve();
    });
    scaffold.scaffoldTask(taskName);
  });

  // Step 2: Process the task with Overseer
  let processStatus;
  await new Promise((resolve) => {
    overseer.once('processed', (data) => {
      console.log('[OVERSEER] Task processed:', data);
      processStatus = data.status;
      logPath = data.logPath;
      resolve();
    });
    overseer.processTask(taskName);
  });

  // Step 3: Watchdog monitors and suggests recovery if blocked
  if (processStatus === 'blocked') {
    await new Promise((resolve) => {
      watchdog.once('suggestion', (data) => {
        console.log('[WATCHDOG] Suggestion:', data);
        resolve();
      });
      watchdog.monitorTasks([taskName]);
    });
  }

  // Output final status and file paths
  console.log('[FINAL STATUS]', {
    inProgress: Array.from(overseer.inProgress),
    completed: Array.from(overseer.completed),
    blocked: Array.from(overseer.blocked),
    docPath,
    logPath
  });

  // Basic assertion for E2E: task should be completed or blocked
  if (processStatus === 'completed') {
    console.log('[E2E PASS] Task completed successfully.');
  } else if (processStatus === 'blocked') {
    console.log('[E2E PASS] Task blocked and suggestion surfaced.');
  } else {
    console.error('[E2E FAIL] Task did not complete or block as expected.');
    process.exit(1);
  }
})(); 