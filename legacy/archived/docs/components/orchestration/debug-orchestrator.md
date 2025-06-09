---
title: DebugOrchestrator
description: System error and debug event orchestrator for Clarity Engine, now supporting dependency-injected logging and telemetry.
version: 1.1.0
lastUpdated: 2025-06-03T12:00:00Z
tags: [orchestration, debug, logging, telemetry]
---

# DebugOrchestrator (v1.1.0)

## Overview
DebugOrchestrator manages error states, debugging, and system health reporting. It now supports dependency injection (DI) for logging and telemetry, ensuring all debug and error events are context-rich, machine-readable, and fully traceable.

## Dependency Injection Pattern

DebugOrchestrator accepts a `logger` and `telemetryManager` in its constructor. If not provided, it defaults to the canonical `LogOrchestrator` and `TelemetryManager`.

### Example Usage
```js
const LogOrchestrator = require('./log-orchestrator');
const TelemetryManager = require('./telemetry-manager');
const DebugOrchestrator = require('./debug-orchestrator');

const logger = new LogOrchestrator({ logDir: './logs/debug' });
const telemetry = new TelemetryManager();

const debugOrchestrator = new DebugOrchestrator({}, { logger, telemetryManager: telemetry });
await debugOrchestrator.initialize();
```

## Logging & Telemetry Standards
- All logging must use the injected or canonical logger (`this.logger`).
- All metrics and spans must use the injected or canonical telemetry manager (`this.telemetryManager`).
- No direct use of `console.log` or ad-hoc logging is allowed.
- All errors, issues, and resolutions are logged for traceability.

## Testing
- Tests should inject mock logger/telemetry and assert log/metric calls for all major actions and errors.

## Version History
- **1.1.0 (2025-06-03):** Added dependency injection for logger/telemetry, updated tests and docs.
- **1.0.0:** Initial implementation. 