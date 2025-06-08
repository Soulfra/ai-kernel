---
title: MetaOrchestrator
description: Central coordinator for all orchestrators in the Clarity Engine system, now supporting dependency-injected logging and telemetry.
version: 1.1.0
lastUpdated: 2025-06-03T12:00:00Z
tags: [orchestration, core, coordination, logging, telemetry]
---

# MetaOrchestrator (v1.1.0)

## Overview
The MetaOrchestrator serves as the central coordination point for all other orchestrators in the Clarity Engine system. It now supports dependency injection (DI) for logging and telemetry, ensuring all actions are context-rich, machine-readable, and fully traceable.

## Dependency Injection Pattern

MetaOrchestrator accepts a `logger` and `telemetryManager` in its constructor. If not provided, it defaults to the canonical `LogOrchestrator` and `TelemetryManager`.

### Example Usage
```js
const LogOrchestrator = require('./log-orchestrator');
const TelemetryManager = require('./telemetry-manager');
const MetaOrchestrator = require('./meta-orchestrator');

const logger = new LogOrchestrator({ logDir: './logs/meta' });
const telemetry = new TelemetryManager();

const metaOrchestrator = new MetaOrchestrator({}, { logger, telemetryManager: telemetry });
await metaOrchestrator.initialize();
```

## Logging & Telemetry Standards
- All logging must use the injected or canonical logger (`this.logger`).
- All metrics and spans must use the injected or canonical telemetry manager (`this.telemetryManager`).
- No direct use of `console.log` or ad-hoc logging is allowed.
- All actions, errors, and state changes are logged for traceability.

## Testing
- Tests should inject mock logger/telemetry and assert log/metric calls for all major actions and errors.

## Version History
- **1.1.0 (2025-06-03):** Added dependency injection for logger/telemetry, updated tests and docs.
- **1.0.0:** Initial implementation. 