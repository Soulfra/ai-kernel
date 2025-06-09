---
title: BackupOrchestrator
version: 1.0.0
description: Canonical orchestrator for backup, restore, and validation in CLARITY_ENGINE.
lastUpdated: 2025-06-04
---

# BackupOrchestrator (CLARITY_ENGINE)

## Overview
BackupOrchestrator is the canonical orchestrator for all backup, restore, and validation operations. It ensures system safety, auditability, and compliance with backup standards.

## Responsibilities
- Perform full and partial backups (configurable scope)
- Generate and validate manifests
- Support dry-run and approval workflows
- Integrate with LogOrchestrator and TelemetryManager
- Support restore and rollback
- Enforce exclusion and recursion safety
- Expose APIs for orchestrator integration

## API
- `initialize()`
- `backup({ scope, dryRun, approval })`
- `ensureSafeBackup({ scope, dryRun, approval })`
- `generateManifest(backupPath)`
- `validateBackup(backupPath)`
- `restore(backupId, options)`
- `rollback()`
- `getLastBackupStatus()`

## Integration
- All orchestrators (Task, Meta, Migration, etc.) must call `ensureSafeBackup()` before critical operations.
- If backup fails or is not approved, the orchestrator must abort and escalate.

## Manifest & Validation
- Every backup generates a manifest (JSON) listing all files, skipped items, and errors.
- Validation compares the manifest to the source and logs discrepancies.

## Error Handling & Logging
- All actions, errors, and skipped files are logged via LogOrchestrator.
- Telemetry is sent to TelemetryManager for audit and monitoring.

## Usage Example
```js
const BackupOrchestrator = require('scripts/core/backup-orchestrator');
const backupOrchestrator = new BackupOrchestrator(options, { logger, telemetryManager });
await backupOrchestrator.ensureSafeBackup({ scope: 'full', dryRun: false, approval: true });
```

## Compliance
- BackupOrchestrator enforces all standards in `/docs/standards/backup-standards.md`.
- No destructive operation may proceed without a valid, recent, and verified backup. 