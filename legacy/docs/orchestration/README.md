## Canonical Logging & Telemetry Standards

All orchestrators, agents, and scripts must use the canonical LogOrchestrator and TelemetryManager for all logging and metrics. Direct use of console.log is prohibited except in allowed demo/test files. Logs and metrics must be JSON, context-rich, and validated for modularity, non-recursion, and linkability.

- See [LOG_ORCHESTRATOR.md](./LOG_ORCHESTRATOR.md) for logging API, usage, and best practices.
- See [TELEMETRY_MANAGER.md](./TELEMETRY_MANAGER.md) for telemetry/metrics API and usage.
- See [../examples/logging-examples.md](../examples/logging-examples.md) for living code examples.

Validation scripts (`validate-logging.js`, `validate-telemetry.js`) enforce these standards in CI and pre-commit.

## Error Clustering (New)

- Error clustering and triage is now a first-class orchestrator-driven workflow.
- The `ErrorClusterHandler` aggregates and clusters errors from all logs, batches, and reports.
- Outputs: `error-clusters.json` (machine), `error-clusters.md` (markdown summary for CI/human review)
- See [Orchestrator-Driven Error Clustering](./ERROR_CLUSTERING.md) for details.

## BackupOrchestrator Integration

- All backup and restore operations must be managed by the canonical `BackupOrchestrator`.
- No destructive or system-altering operation may proceed without a valid, recent, and verified backup.
- All orchestrators (Task, Meta, Migration, etc.) must check with `BackupOrchestrator` before critical operations.
- See [backup-orchestrator.md](./backup-orchestrator.md) and [backup-standards.md](../standards/backup-standards.md) for details and compliance requirements. 