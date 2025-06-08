---
title: Echo/Drift/Loop Triangle Pattern
description: Architectural pattern for robust, self-healing orchestrator-driven systems. Maps to CLARITY_ENGINE orchestrators and E2E flows.
version: 1.0.0
lastUpdated: 2025-06-04T00:00:00Z
---

# Echo/Drift/Loop Triangle Pattern

## Overview
The Echo/Drift/Loop triangle pattern is a robust, non-recursive, and self-healing architecture for orchestrator-driven systems. It ensures that all actions are auditable, recoverable, and that the system can always be revived from a known-good state.

## The Three Sides
- **Echo:** Immediate feedback, logging, and audit trail (LogOrchestrator, WriterOrchestrator).
- **Drift:** Background watcher/daemon, triggers onboarding/reset/revival if the system drifts out of spec (LifecycleOrchestrator, watcher scripts).
- **Loop:** Main execution loop, periodic health checks, backup enforcement, and system liveness (TaskOrchestrator, QualityOrchestrator, BackupOrchestrator).

## Mapping to CLARITY_ENGINE
- **Echo:** LogOrchestrator, WriterOrchestrator, TelemetryManager
- **Drift:** LifecycleOrchestrator, watcher/daemon scripts, onboarding/reset flows
- **Loop:** TaskOrchestrator, QualityOrchestrator, BackupOrchestrator, E2E test runners

## Stability & Self-Healing
- Each side of the triangle checks and balances the others.
- If Drift detects system drift, it triggers onboarding/reset from the immutable core or backup.
- Echo logs all actions and errors for auditability.
- Loop ensures periodic health checks and can trigger Drift/Echo as needed.
- Recursion/circularity is avoided by always resetting from a known-good state.

## Best Practices
- Always require explicit confirmation before destructive actions (reset, onboarding, backup overwrite).
- Use lock/seal files to prevent accidental resets.
- All actions should be logged and auditable.
- Use the triangle pattern for all new orchestrator flows.

## See Also
- [E2E Onboarding/Reset Test](../testing/E2E_ONBOARDING_RESET.md)
- [System Lifecycle](SYSTEM_LIFECYCLE.md)
- [WriterOrchestrator](../orchestration/WRITER_ORCHESTRATOR.md)
- [LifecycleOrchestrator](../orchestration/PLANNER_ORCHESTRATOR.md) 