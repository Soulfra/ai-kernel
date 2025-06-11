---
title: Logging & Telemetry Examples
description: Living examples for canonical logging and telemetry usage in Clarity Engine.
lastUpdated: 2025-06-03T04:00:00Z
version: 1.0.0
---

# Logging & Telemetry Examples

## Orchestrator Logging Example
```js
const LogOrchestrator = require('../core/log-orchestrator');
const logger = new LogOrchestrator({ logDir: './logs/debug' });

logger.info('Orchestrator initialized', { orchestrator: 'MetaOrchestrator', options });
logger.error('Initialization failed', { orchestrator: 'MetaOrchestrator', error: err.message });
```

## Handler Telemetry Example
```js
const TelemetryManager = require('../core/telemetry-manager');
const telemetry = new TelemetryManager();
await telemetry.initialize();
await telemetry.startSpan('TaskHandler.process', { taskId: task.id });
try {
  // ...
  await telemetry.recordMetric('task_processed', 1, { taskId: task.id });
} finally {
  await telemetry.endSpan('TaskHandler.process', { taskId: task.id });
}
```

## CLI Script Logging Example
```js
const LogOrchestrator = require('../core/log-orchestrator');
const logger = new LogOrchestrator({ logDir: './logs/debug' });

async function main() {
  logger.info('CLI started', { script: 'run-tasks.js' });
  // ...
  logger.info('CLI completed', { script: 'run-tasks.js', status: 'success' });
}
```

## Linking Logs and Metrics
```js
logger.info('Task started', { taskId: 'task_001', traceId: 'trace_abc123' });
await telemetry.startSpan('TaskHandler.process', { taskId: 'task_001', traceId: 'trace_abc123' });
```

## Exporting Logs
```sh
zip -r debug_logs.zip logs/debug/
```

---
*Update this file as new patterns and features are added.* 