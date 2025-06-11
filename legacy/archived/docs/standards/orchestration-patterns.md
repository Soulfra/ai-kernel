# Orchestration Patterns: The Rule of Three

## Overview
For every major feature or workflow, use a three-orchestrator pattern:
1. **Template/Genesis (Scaffold):** Generates new, standards-compliant task/feature shells and documentation.
2. **Processor/Worker:** Executes the main logic, manages state, and dispatches sub-tasks.
3. **Healer/Suggester (Watchdog):** Monitors for failures, resets state, and surfaces suggestions for improvement.

## Example: Mesh Integration Spiral-Out

- **MeshFeatureScaffoldOrchestrator:** Creates a new mesh integration task and its doc.
- **OverseerOrchestrator:** Runs the mesh integration, manages progress, and dispatches sub-tasks.
- **WatchdogOrchestrator:** Monitors for stuck/failed tasks, resets state, and logs suggestions.

## Benefits
- Modular, self-healing, and standards-driven development
- Clear separation of concerns and responsibilities
- Easier onboarding, debugging, and continuous improvement

## See Also
- [Finalization Plan Section 12](../../project_meta/plans/FINALIZATION_PLAN.md#12-overseerbatch-processor-orchestrator)
- [docs/standards/documentation-system.md](./documentation-system.md)

## Safe-IO / Forced-Wrapper Pattern

All orchestrators and E2E tests must use a safe-io or forced-wrapper pattern before any file or directory operation. This means:
- Always check if the target directory exists before reading or writing files
- If not, create it recursively (idempotent)
- Only then proceed with file operations

This pattern prevents ENOENT errors, ensures robust first-run and repeated execution, and is a core part of the backup kernel and mesh integration examples.

**Reference implementation:** See `ensureDirExists` in the mesh integration orchestrators and the backup system kernel. 