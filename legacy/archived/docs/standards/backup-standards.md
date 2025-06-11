---
title: Backup Standards
version: 1.0.0
description: Canonical standards for backup, restore, and validation in CLARITY_ENGINE, enforced by BackupOrchestrator.
lastUpdated: 2025-06-04
---

# Backup Standards (CLARITY_ENGINE)

## 1. Canonical Orchestrator
- All backup and restore operations must be managed by `BackupOrchestrator`.
- No destructive or system-altering operation may proceed without a valid, recent, and verified backup.
- All orchestrators (Task, Meta, Migration, etc.) must check with `BackupOrchestrator` before critical operations.

## 2. Scope & Manifest
- Backups must cover all code, documentation, configuration, logs, and meta/state files required for a full system restore.
- Explicitly exclude `node_modules`, `.git`, `cache`, and other non-essential artifacts.
- Every backup must generate a manifest (JSON) listing all files/directories included, skipped, and the reason for any exclusion.

## 3. Non-Recursive, Safe Traversal
- Directory traversal must be queue-based, with cycle/symlink detection and a max depth (configurable).
- Only follow symlinks that resolve within the project root; log and skip others.
- All ENOENT, permission, or IO errors must be logged and reported in the manifest.

## 4. Atomicity & Consistency
- Backups must be performed in a way that ensures consistency (e.g., quiesce writes, or snapshot if possible).
- If a backup fails, it must be flagged as incomplete and not replace the last good backup.

## 5. Validation & Auditability
- After backup, compare the manifest to the source; log and report any discrepancies.
- All backup actions (start, complete, error, skipped file, etc.) must be logged via LogOrchestrator.
- Telemetry: Backup duration, size, file counts, and error counts must be sent to TelemetryManager.
- Each backup must be uniquely identified (timestamp, hash) and auditable.

## 6. Integration & Compliance
- All orchestrators must call `BackupOrchestrator.ensureSafeBackup()` before critical operations.
- If backup cannot be performed or validation fails, the orchestrator must halt and require intervention.
- Restore and rollback must be orchestrator-driven, with the same standards for logging, validation, and auditability.

## 7. Documentation
- These standards must be referenced in all orchestrator and automation documentation.
- See `/docs/orchestration/backup-orchestrator.md` for implementation details. 