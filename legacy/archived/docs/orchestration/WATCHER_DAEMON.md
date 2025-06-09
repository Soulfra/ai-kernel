---
title: WatcherOrchestrator & Daemon
description: Background orchestrator/daemon for monitoring, drift detection, and autonomous resets in CLARITY_ENGINE. Integrates with triangle pattern and lock/seal safety.
version: 1.0.0
lastUpdated: 2025-06-04T00:00:00Z
---

# WatcherOrchestrator & Daemon

## Overview
WatcherOrchestrator is a background orchestrator/daemon that autonomously monitors system health, detects drift or orchestrator failure, and triggers onboarding/reset as needed. It is a key part of the Echo/Drift/Loop triangle pattern for self-healing and auditability.

## How It Works
- Runs as a daemon (background process or scheduled job)
- Periodically checks orchestrator health, backup status, and system drift
- Triggers onboarding/reset if drift, failure, or recursion is detected
- Checks for lock/seal file before any destructive action
- Logs all actions and emits audit/alert events

## Lock/Seal Mechanism
- Before any destructive action (reset, onboarding, backup overwrite), WatcherOrchestrator checks for a lock/seal file (e.g., `system.lock`)
- If the lock is present, no destructive actions are taken
- Lock/seal can be set manually or by other orchestrators during critical operations

## Integration with Triangle Pattern
- **Echo:** Logs and audit events for all actions
- **Drift:** Detects drift and triggers resets
- **Loop:** Periodic health checks and backup enforcement

## Usage
- Start the watcher/daemon as a background process or scheduled job
- Configure check interval and lock file as needed
- Integrate with router and all orchestrators for full coverage

## Troubleshooting
- **Watcher not triggering resets:** Ensure lock file is not present and health/drift checks are implemented
- **Destructive actions during lock:** Confirm lock/seal file is checked before resets
- **Audit logs missing:** Ensure auditLogger is injected and used

## See Also
- [Triangle Pattern](../architecture/TRIANGLE_PATTERN.md)
- [E2E Onboarding/Reset Test](../testing/E2E_ONBOARDING_RESET.md)
- [System Lifecycle](../architecture/SYSTEM_LIFECYCLE.md) 