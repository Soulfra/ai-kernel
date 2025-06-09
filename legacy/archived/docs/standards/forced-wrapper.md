---
title: Forced Wrapper Utility
description: Documentation for forced-wrapper.js, a utility for running child processes with timeout, error catching, and stub logging. Part of the Soulfra Standard for modular, resilient, and spiral-out automation.
lastUpdated: 2025-07-27T06:00:00Z
version: 1.0.0
---

# Forced Wrapper Utility

## Overview

The `forced-wrapper.js` utility provides a safe, modular way to run child processes (scripts, jobs, tests) with:
- Timeout (prevents hangs)
- Error catching (prevents crashes)
- Stub logging (logs all failures as actionable TODOs)

## How to Use

```js
const { runWithTimeout } = require('./core/forced-wrapper');
runWithTimeout('node some-script.js', 'Some Script', 60000);
```
- `cmd`: The command to run
- `desc`: Description for logging
- `timeoutMs`: Timeout in milliseconds (default: 60,000)

## Why It's Important
- Ensures no process can hang or crash the system
- All errors, timeouts, and missing scripts are logged as stubs/TODOs
- Enables true modularity and spiral-out development
- Integrates with stub mode and the magic list for full traceability

## Integration
- Used by all orchestrators, dashboards, and batch jobs
- All critical child process runs are wrapped for safety and traceability
- Works with the overseer/watchdog for meta-resilience
- Cross-linked with stub mode (`docs/standards/stub-mode.md`) and E2E orchestrator (`docs/standards/e2e-orchestrator.md`)

## Spiral-Out
- Every stubbed or failed process is logged as a TODO
- Use the logs and dashboards to spiral out and implement missing pieces

## References
- [Stub Mode and TODO Tracking](./stub-mode.md)
- [E2E Orchestrator](./e2e-orchestrator.md)
- [Overseer Watchdog](./overseer-watchdog.md)

---
*The forced wrapper is a core part of the Soulfra Standard for safe, modular, and continuously improving automation.* 