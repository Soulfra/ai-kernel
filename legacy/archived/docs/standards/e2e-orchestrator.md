---
title: E2E Orchestrator CLI Utility
description: Documentation for the e2e-orchestrator.js script, which runs the full end-to-end system, logs every step, and ensures robust, safe, and auditable operation.
lastUpdated: 2025-07-27T06:00:00Z
version: 1.0.0
---

# E2E Orchestrator CLI Utility

## Overview

The `e2e-orchestrator.js` script runs the full end-to-end system, including health checks, onboarding, batch jobs, tests, magic list engine, pulse, overseer/watchdog, and backup. It logs every step, error, and result, fails fast and cleanly on any error, and updates the dashboard and magic list. It requires and verifies a backup before any destructive operation.

## How to Run

```sh
node scripts/e2e-orchestrator.js
```

## Steps Covered
- Dependency health check
- Onboarding
- Batch jobs (meta-summarize, refill)
- Magic list engine
- Pulse/health check (if available)
- Overseer/watchdog (if available)
- E2E tests (magic list, active suggestions)
- Backup (required before destructive ops)
- Dashboard update

## Logging
- Every step, error, and result is logged to `project_meta/suggestion_log.md` and via LogOrchestrator
- Dashboard file: `project_meta/insights/e2e_orchestrator_dashboard.md`

## Integration
- Integrates with all major scripts and utilities (batch jobs, magic list, pulse, overseer)
- All child processes are run via [forced-wrapper.js](./forced-wrapper.md) for safety and traceability
- Requires backup before any destructive operation
- Updates dashboard and magic list with every run

## Stub Mode and Spiral-Out
- The orchestrator logs all stubbed or missing steps as TODOs in the suggestion log and dashboard.
- This ensures that every gap is visible and actionable, never silent or lost.
- Use the logs and dashboards to track and implement each missing piece, spiraling out to a fully robust system.

## References
- [Forced Wrapper Utility](./forced-wrapper.md)
- [Stub Mode and TODO Tracking](./stub-mode.md)
- [Magic List Engine](./magic-list-engine.md)
- [Overseer Watchdog](./overseer-watchdog.md)

---
*This orchestrator is the backbone of the Soulfra Standard for robust, safe, and auditable end-to-end automation.* 