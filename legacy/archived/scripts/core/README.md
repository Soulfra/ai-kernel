# Rule-of-Three Orchestrator Pattern: Mesh Integration Example

## Overview
This directory demonstrates the "rule of three" pattern for robust, modular, and self-healing orchestration:

- **MeshFeatureScaffoldOrchestrator**: Scaffolds new mesh integration tasks, creates YAML docs, and logs them.
- **OverseerOrchestrator**: Processes scaffolded tasks, manages state, and updates logs. Uses safe-io to ensure directories exist.
- **WatchdogOrchestrator**: Monitors for blocked tasks, surfaces suggestions, and (future) triggers healing/reset.

## Forced-Wrapper / Diagnostics Runner

All scripts and tests should be run through the forced-wrapper for robust diagnostics and error handling.

### How to Use
From the project root, run:
```sh
node scripts/core/forced-wrapper.js e2e-mesh-integration.test.js
```
- The wrapper checks if the script exists before running.
- If not, it logs an error and suggests next steps.
- If the script fails, it logs the error and appends it to the suggestion log.

### Why Use It?
- Prevents MODULE_NOT_FOUND and path errors from blocking your workflow.
- Surfaces actionable diagnostics and suggestions in the CLI and suggestion log.
- Ensures all entrypoints are robust and self-healing, not just the orchestrators.

## Backup/Restore Integration

The forced-wrapper now automatically:
- Creates a backup before running any script or test (using the backup orchestrator)
- On any error, logs the error, attempts to restore from the backup, and logs the restore result

This ensures:
- All critical flows are protected by backup/restore logic
- The system is self-healing and can recover from most errors automatically
- All errors and recovery attempts are logged in the suggestion log for traceability

## How to Run the E2E Test Locally (with Backup/Restore)

1. From the project root:
   ```sh
   node scripts/core/forced-wrapper.js e2e-mesh-integration.test.js
   ```
   - The wrapper will create a backup, run the test, and if any error occurs, attempt to restore and log the result.

2. Check the output and the suggestion log for any errors or recovery actions.

## Launch Checklist
- [ ] E2E test passes locally with backup/restore protection
- [ ] All errors and recovery attempts are logged
- [ ] Documentation is up to date
- [ ] Ready to commit, branch, and push to GitHub

## Troubleshooting
- If you see ENOENT or directory errors, ensure the `temp/mesh-tasks/` directory exists. All orchestrators now use a safe-io/forced-wrapper pattern to create directories as needed.
- If you see MODULE_NOT_FOUND, check your working directory and file names for typos or case issues.

## Safe-IO/Forced-Wrapper Pattern
All orchestrators use an `ensureDirExists` utility before any file operation. This prevents ENOENT errors and ensures idempotent, robust operation—mirroring the backup kernel's approach.

## Next Steps
- Once the E2E test passes locally, update documentation and commit your changes.
- Create a feature branch and push to GitHub for review or handoff.
- Use this pattern as a template for new modules (mesh, PWA, backup, etc.).

## Universal Error Tracing & Telemetry

- All orchestrators and entrypoints use telemetry spans for every major operation (script run, backup, restore, etc.).
- On any error (ENOENT, MODULE_NOT_FOUND, etc.):
  - The error, context, and stack trace are logged to the suggestion log (`project_meta/suggestion_log.md`).
  - Actionable next steps are surfaced for the operator or AI.
  - The system attempts self-healing (e.g., backup restore) if possible.
- All errors and recovery actions are visible in the dashboard and logs, not just the CLI.

**To debug or trace any issue:**
- Open `project_meta/suggestion_log.md` and look for the latest [ERROR] entry.
- Review the context, stack, and suggested next steps.
- Use the telemetry spans to trace the flow of operations and pinpoint failures. 