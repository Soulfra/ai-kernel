---
title: TELEMETRY_MANAGER
version: 1.0.0
description: Canonical telemetry and metrics manager for the Clarity Engine system. Provides modular, context-aware, machine-readable metrics and span tracking for all orchestrators, agents, and scripts.
lastUpdated: 2025-06-03T04:00:00Z
---

# TelemetryManager Documentation

## Overview
TelemetryManager is the canonical telemetry and metrics system for the Clarity Engine. It provides modular, context-rich, JSON-based metrics and span tracking for all orchestrators, agents, and scripts. All metrics are machine-readable, linkable, and validated for consistency and non-recursive design.

## API Reference
- `constructor(options)`: Initialize with options (metricsDir, reportInterval, etc.)
- `initialize()`: Prepare metrics directory and start reporting
- `startSpan(name, context)`: Start a telemetry span
- `endSpan(name, context)`: End a telemetry span
- `recordMetric(name, value, context)`: Record a metric
- `getMetrics(options)`: Query metrics
- `generateReport()`: Generate a metrics report
- `cleanup()`: Finalize and clean up

## Usage Examples
```js
const TelemetryManager = require('./core/telemetry-manager');
const telemetry = new TelemetryManager();
await telemetry.initialize();
await telemetry.startSpan('TaskHandler.process', { taskId: task.id });
// ...
await telemetry.recordMetric('task_processed', 1, { taskId: task.id });
await telemetry.endSpan('TaskHandler.process', { taskId: task.id });
```

## Best Practices
- Always use TelemetryManager for all metrics and span tracking
- Include context (taskId, orchestrator, file, etc.) in every metric/span
- Use JSON for all metrics (machine-readable)
- Rotate and archive metrics regularly
- Never create circular dependencies in telemetry modules

## Validation
- Run `scripts/validate-telemetry.js` to enforce canonical usage
- CI and pre-commit hooks should block violations

## Exporting & Archiving Metrics
- Use CLI or scripts to zip and export metrics:
  ```sh
  zip -r metrics_logs.zip logs/metrics/
  ```
- Metrics can be emailed or uploaded for audit/compliance

## Feature Summary Table
| Feature         | How Achieved                                      |
|-----------------|---------------------------------------------------|
| Modular         | Canonical manager, no circular deps               |
| Dynamic         | Context objects, runtime config                   |
| Expandable      | Plugin/config-based outputs, new metric types     |
| Linkable        | taskId, traceId, parentId in every metric/span    |
| Properly logged | JSON, validated, context-rich, machine-readable   |
| Non-recursive   | No self-imports, enforced by validation           |
| Documented      | Examples, API docs, best practices in `/docs/`    |

## Extensibility
- Add new metric types, outputs, or formats via config/plugins
- Integrate with dashboards, RAG, or external systems

---
*For more, see `LOG_ORCHESTRATOR.md` and `validate-telemetry.js`.* 