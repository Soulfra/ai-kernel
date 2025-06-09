---
title: E2E Onboarding/Reset Test
description: End-to-end test for onboarding, reset, backup, and audit flows in CLARITY_ENGINE. Documents bugs, fixes, and troubleshooting.
version: 1.0.0
lastUpdated: 2025-06-04T00:00:00Z
---

# E2E Onboarding/Reset Test

## Overview
This E2E test validates the full onboarding, reset, backup, and audit flow for CLARITY_ENGINE. It ensures all orchestrators are initialized, all actions are auditable, and the system can recover from resets and watcher/daemon events.

## Step-by-Step Flow
1. **Initialize LogOrchestrator (Echo)**
2. **Initialize BackupOrchestrator (Loop)**
3. **Initialize WriterOrchestrator (Echo, with logger injected)**
4. **Initialize LifecycleOrchestrator (Drift, with dependencies injected)**
5. **Trigger onboarding/reset via LifecycleOrchestrator**
6. **Verify backup and onboarding doc generation**
7. **Simulate watcher/daemon reset event**
8. **Check audit logs (simulated)**
9. **Cleanup all orchestrators and exit cleanly**

## Bugs Found & Fixes
- **Logger Not Initialized:**
  - *Bug:* WriterOrchestrator failed if LogOrchestrator was not initialized first.
  - *Fix:* Always call `await logger.initialize()` before passing to WriterOrchestrator.
- **Node Process Hanging:**
  - *Bug:* E2E test would hang if orchestrators left open streams or intervals.
  - *Fix:* Added `cleanup()` to all orchestrators and call them at the end of the E2E script.
- **Dependency Injection for Testability:**
  - *Bug:* fs and logger were not injectable, making tests brittle.
  - *Fix:* All orchestrators now accept dependencies for robust testing and orchestration.

## Troubleshooting
- **E2E test hangs:** Ensure all orchestrators have a `cleanup()` method and call them before exit.
- **Logger errors:** Always initialize LogOrchestrator before use.
- **Missing onboarding doc:** Check that `generateOnboardingDocs()` is called and the immutable template exists.
- **Audit logs missing:** Ensure auditLogger is injected and used in WriterOrchestrator.

## See Also
- [Echo/Drift/Loop Triangle Pattern](../architecture/TRIANGLE_PATTERN.md)
- [System Lifecycle](../architecture/SYSTEM_LIFECYCLE.md)
- [WriterOrchestrator](../orchestration/WRITER_ORCHESTRATOR.md)
- [LifecycleOrchestrator](../orchestration/PLANNER_ORCHESTRATOR.md) 