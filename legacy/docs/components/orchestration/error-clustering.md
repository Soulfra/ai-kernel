---
title: Error Clustering
version: 1.0.0
description: Documentation for orchestrator-driven error clustering using ErrorClusterHandler in the CLARITY_ENGINE system.
lastUpdated: 2025-06-04
---

# Error Clustering (Orchestrator-Driven)

## Overview

Error clustering is now a first-class, orchestrator-driven workflow in the CLARITY_ENGINE system. The `ErrorClusterHandler` enables automated aggregation, clustering, and reporting of errors from all logs, batches, and pipeline reports.

## Key Features

- **Aggregates errors** from batches, pipeline status, all logs, and consolidation reports
- **Clusters by error code** (e.g., ENOENT, EACCES) and message
- **Outputs:**
  - `error-clusters.json` (machine-readable)
  - `error-clusters.md` (markdown summary for CI/human review)
- **Actionable recommendations** for each error cluster
- **Auditable and logged** as part of orchestrator workflows

## Workflow

1. **Task Creation:** Add a task of type `errorcluster` to the orchestrator
2. **Handler Execution:** `ErrorClusterHandler` runs, aggregates and clusters errors, and writes outputs
3. **Review:** Outputs are available for CI, dashboards, and human triage

## Example Task

```js
await orchestrator.addTask({
  type: 'errorcluster',
  description: 'Cluster and report errors after migration',
});
```

## Integration

- Fully integrated with `TaskOrchestrator` and handler auto-registration
- Can be run after any batch, migration, or test suite
- All actions are logged and tracked via orchestrator logs and telemetry

## Standards Compliance

- No ad-hoc scripts: all error clustering is orchestrator-driven
- Outputs are append-only and auditable
- Documentation follows required YAML frontmatter and metadata

## See Also
- [Task Orchestrator](./task-orchestrator.md)
- [Log Orchestrator](./log-orchestrator.md)
- [Debug Orchestrator](./debug-orchestrator.md) 