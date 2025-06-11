---
title: Task Orchestrator
version: 1.1.0
description: Documentation for the TaskOrchestrator component, including orchestrator-driven error clustering and handler auto-registration.
lastUpdated: 2025-06-04
---

# Task Orchestrator

## Overview

The `TaskOrchestrator` is the canonical orchestrator for all automation, migration, validation, and error clustering flows in the CLARITY_ENGINE system. It manages the lifecycle of all tasks, supports handler auto-registration, and ensures all workflows are auditable, logged, and standards-compliant.

## Key Features

- **Handler Auto-Registration:** All `*Handler` classes in `task-handlers.js` are auto-registered for their respective task types, enabling plug-and-play extensibility.
- **Error Clustering as a Task:** The orchestrator now supports error clustering/reporting as a first-class task via the `ErrorClusterHandler`. This enables automated, auditable error triage as part of any orchestrator-driven workflow.
- **Logging & Telemetry:** All actions are logged via `LogOrchestrator` and tracked with `TelemetryManager`.
- **Batch & Parallel Processing:** Supports batch task execution and parallel operation.

## Error Clustering Workflow

1. **Task Creation:** Add a task with `{ type: 'errorcluster', description: 'Cluster and report errors' }`.
2. **Handler Execution:** The orchestrator invokes `ErrorClusterHandler`, which aggregates errors from all logs, batches, and reports, clusters them, and outputs `error-clusters.json` and `error-clusters.md`.
3. **Audit & Review:** All outputs are logged, and the markdown summary can be integrated into CI or dashboards.

## Example: Adding an Error Clustering Task

```js
await orchestrator.addTask({
  type: 'errorcluster',
  description: 'Cluster and report errors after migration',
});
```

## Handler Auto-Registration

All handlers ending with `Handler` in `task-handlers.js` are auto-registered for their lowercased type (e.g., `ErrorClusterHandler` → `errorcluster`).

## Outputs

- `error-clusters.json`: Machine-readable error clusters
- `error-clusters.md`: Human-friendly markdown summary

## Standards Compliance

- All orchestrator flows are non-recursive, auditable, and logged
- No ad-hoc scripts: all automation is routed through orchestrators
- Documentation follows required YAML frontmatter and metadata

## See Also
- [Log Orchestrator](./log-orchestrator.md)
- [Debug Orchestrator](./debug-orchestrator.md)
- [Handler Pattern](../task-handlers.md)
- [Error Clustering](../../error-clustering.md) 