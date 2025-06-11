---
title: Troubleshooting & FAQ
description: Common issues, error messages, and resolutions for orchestrator-driven automation in CLARITY_ENGINE. Includes bugs found and fixes.
version: 1.0.0
lastUpdated: 2025-06-04T00:00:00Z
---

# Troubleshooting & FAQ

## Common Issues & Fixes

### Logger Not Initialized
- **Error:** `Log stream for level 'info' is not initialized. Did you call await logger.initialize()?`
- **Fix:** Always call `await logger.initialize()` before passing to WriterOrchestrator or any orchestrator that uses logging.

### Node Process Hangs After E2E Test
- **Symptom:** E2E test completes but Node process does not exit.
- **Fix:** Ensure all orchestrators have a `cleanup()` method and call them before exit. This closes all open streams and intervals.

### Missing Onboarding Doc
- **Symptom:** `README_TEMPLATE.md` or onboarding doc not generated after onboarding/reset.
- **Fix:** Check that `generateOnboardingDocs()` is called and the immutable template exists in the correct location.

### Audit Logs Missing
- **Symptom:** No audit logs for onboarding/reset or output actions.
- **Fix:** Ensure `auditLogger` is injected and used in WriterOrchestrator and other orchestrators.

### Destructive Actions During Lock
- **Symptom:** System performs reset/onboarding/backup overwrite even when locked.
- **Fix:** Confirm lock/seal file is checked before any destructive action. Only proceed if lock is released or user confirms.

### Watcher/Daemon Not Triggering Resets
- **Symptom:** System drift or orchestrator failure does not trigger onboarding/reset.
- **Fix:** Ensure watcher/daemon is running, lock file is not present, and health/drift checks are implemented.

## Bugs Found & How to Fix Them
- See [E2E Onboarding/Reset Test](./testing/E2E_ONBOARDING_RESET.md) for a list of bugs found and their resolutions.

## See Also
- [WatcherOrchestrator & Daemon](./orchestration/WATCHER_DAEMON.md)
- [Triangle Pattern](./architecture/TRIANGLE_PATTERN.md)
- [E2E Onboarding/Reset Test](./testing/E2E_ONBOARDING_RESET.md) 