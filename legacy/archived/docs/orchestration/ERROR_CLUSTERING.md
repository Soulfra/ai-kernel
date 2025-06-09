---
title: Orchestrator-Driven Error Clustering
description: Top-level documentation for orchestrator-driven error clustering in CLARITY_ENGINE, powered by ErrorClusterHandler and TaskOrchestrator.
version: 1.0.0
lastUpdated: 2025-06-04
---

# Orchestrator-Driven Error Clustering

## Overview

Error clustering is a core, orchestrator-driven workflow in CLARITY_ENGINE. It enables automated, auditable aggregation and triage of errors from all logs, batches, and pipeline reports, using the `ErrorClusterHandler` and `TaskOrchestrator`.

## How It Works

- **Task Creation:** Add a task of type `errorcluster` to the orchestrator
- **Handler Execution:** `ErrorClusterHandler` aggregates and clusters errors, outputs reports
- **Outputs:**
  - `error-clusters.json` (machine-readable)
  - `error-clusters.md` (markdown summary)
- **Integration:** Can be run after any batch, migration, or test suite
- **Auditability:** All actions are logged and tracked via orchestrator logs and telemetry

## Example

```js
await orchestrator.addTask({
  type: 'errorcluster',
  description: 'Cluster and report errors after migration',
});
```

## Standards Compliance

- No ad-hoc scripts: all error clustering is orchestrator-driven
- Outputs are append-only and auditable
- Documentation follows required YAML frontmatter and metadata

## Related Docs
- [Task Orchestrator](./task-orchestrator.md)
- [Task Handlers](../components/task-handlers.md)
- [Log Orchestrator](./log-orchestrator.md)
- [Debug Orchestrator](./debug-orchestrator.md) 