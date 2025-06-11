---
title: Task Handlers
version: 1.1.0
description: Documentation for all orchestrator task handlers, including ErrorClusterHandler for error clustering.
lastUpdated: 2025-06-04
---

# Task Handlers

## Overview

Task handlers are modular classes that implement the logic for each orchestrator-driven workflow in the CLARITY_ENGINE system. All handlers ending with `Handler` in `task-handlers.js` are auto-registered by `TaskOrchestrator` for their respective task types.

## Handler Auto-Registration

- All `*Handler` classes are discovered and registered automatically
- The handler type is the lowercased class name without `Handler` (e.g., `ErrorClusterHandler` → `errorcluster`)
- This enables plug-and-play extensibility for new workflows

## ErrorClusterHandler

- **Purpose:** Aggregates, clusters, and reports errors from all logs, batches, and pipeline reports
- **Outputs:**
  - `error-clusters.json` (machine-readable)
  - `error-clusters.md` (markdown summary)
- **Integration:** Can be run as a task via orchestrator, logged and tracked like any other handler

## Example Usage

```js
await orchestrator.addTask({
  type: 'errorcluster',
  description: 'Cluster and report errors after migration',
});
```

## Other Handlers

- `DocumentationHandler`: Generates and processes documentation
- `TestHandler`: Generates and manages test files
- `MigrationHandler`: Handles migration tasks (file moves, merges, etc.)
- `ContextHandler`: Manages context-related tasks

## Standards Compliance

- All handlers are auditable, logged, and orchestrator-driven
- No ad-hoc logic: all workflows are routed through handlers
- Documentation follows required YAML frontmatter and metadata

## See Also
- [Task Orchestrator](./orchestration/task-orchestrator.md)
- [Error Clustering](./orchestration/error-clustering.md) 