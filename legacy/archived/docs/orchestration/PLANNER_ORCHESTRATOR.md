---
title: PlannerOrchestrator
description: Living checklist, goal tracker, and lifecycle event logger for CLARITY_ENGINE. Tracks orchestrator docs, onboarding, reset, and revival events.
version: 1.0.0
lastUpdated: 2025-06-04T00:00:00Z
---

# PlannerOrchestrator

## Overview
PlannerOrchestrator is the living checklist, goal tracker, and lifecycle event logger for CLARITY_ENGINE. It tracks the documentation, health, and test status of all orchestrators, as well as onboarding, reset, and revival events. It integrates with WriterOrchestrator, BackupOrchestrator, and LifecycleOrchestrator to provide a complete audit trail and progress log.

## Event Flow
- Receives events from all orchestrators (init, workflow, error, backup, onboarding, reset, revival)
- Logs lifecycle events and state changes
- Updates living checklist and goal tracker
- Emits events for checklist updates and goal completions

## Usage
- Use `logLifecycleEvent(event, details)` to log onboarding, reset, revival, and other lifecycle events
- Use `updateChecklist(item, status)` to track orchestrator docs, health, and test status
- Query current goals, checklist, and event history via API or CLI

## Integration Points
- **WriterOrchestrator:** Receives output and audit logs
- **BackupOrchestrator:** Logs backup/restore events
- **LifecycleOrchestrator:** Logs onboarding, reset, and revival events
- **API Layer:** Exposes endpoints for checklist, goals, and event history

## Checklist Tracking
- Tracks status of orchestrator docs, onboarding, reset, and revival
- Living checklist is append-only and auditable
- Used for onboarding, disaster recovery, and continuous improvement

## See Also
- [WriterOrchestrator](WRITER_ORCHESTRATOR.md)
- [BackupOrchestrator](backup-orchestrator.md)
- [LifecycleOrchestrator](../architecture/SYSTEM_LIFECYCLE.md)
- [API Reference](../api-reference.md) 