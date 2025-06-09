---
title: System Lifecycle, Reset, and Revival
version: 1.0.0
description: Documentation for the CLARITY_ENGINE system lifecycle, including the immutable core/template layer, working layer, and reset/revival flows.
lastUpdated: 2025-06-04T00:00:00Z
---

# System Lifecycle, Reset, and Revival

## Overview
The CLARITY_ENGINE system is designed with a layered lifecycle for maximum safety, auditability, and onboarding ease. At its core is an immutable template layer, surrounded by a working layer for active development and operations, and a revival/reset flow for disaster recovery, onboarding, and upgrades.

## Layered Architecture
- **Immutable Core/Template Layer:** Canonical, read-only templates (README, onboarding docs, orchestrator templates, contracts).
- **Working/Mutable Layer:** All real work, orchestration, and user-facing operations. Versioned, auditable, and extensible.
- **Revival/Reset Layer:** System can be reset or revived from the immutable core or from backups. Used for onboarding, disaster recovery, or upgrades.

## Lifecycle Flow Diagram
```mermaid
graph TD
  A[Immutable Core (Templates)] -- Reset/Revive --> B[Working Layer (Active System)]
  B -- Snapshot/Backup --> C[Archive/Recovery]
  C -- Restore --> B
  B -- Generate Onboarding/Reset Docs --> D[Public/Users]
```

## Usage & Integration
- **PlannerOrchestrator:** Tracks state/version of each layer, logs lifecycle events.
- **BackupOrchestrator:** Enforces backup before reset/revival, manages archive/restore.
- **WriterOrchestrator:** Prevents overwriting immutable files, generates onboarding/reset docs.
- **LifecycleOrchestrator (optional):** Automates reset/revival operations.
- **API Layer:** Exposes endpoints for listing templates, resetting/reviving, and querying system health.

## Onboarding, Reset, and Revival Guide
1. **Onboarding:**
   - Use WriterOrchestrator to generate onboarding docs from immutable templates.
   - New users/teams start from a clean, canonical template.
2. **Reset/Revival:**
   - Use LifecycleOrchestrator or API to reset the working layer from the immutable core or from backups.
   - All actions are logged in PlannerOrchestrator.
3. **Disaster Recovery:**
   - Restore the working layer from the archive using BackupOrchestrator.
   - All events are auditable and versioned.

## Best Practices
- Never modify files in the immutable core/template layer.
- Always backup before reset/revival.
- Use PlannerOrchestrator to track all lifecycle events and state changes.
- Document all onboarding, reset, and revival operations for auditability.

## See Also
- [PlannerOrchestrator](../orchestration/PLANNER_ORCHESTRATOR.md)
- [WriterOrchestrator](../orchestration/WRITER_ORCHESTRATOR.md)
- [BackupOrchestrator](../orchestration/backup-orchestrator.md)
- [TestOrchestrator](../orchestration/TEST_ORCHESTRATOR.md)
- [API Reference](../api-reference.md) 