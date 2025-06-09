---
title: WriterOrchestrator
description: Centralized output, documentation, and audit orchestrator for CLARITY_ENGINE. Handles logs, docs, summaries, onboarding/reset docs, and enforces immutability.
version: 1.0.0
lastUpdated: 2025-06-04T00:00:00Z
---

# WriterOrchestrator

## Overview
WriterOrchestrator is the central orchestrator for all output in CLARITY_ENGINE. It manages logs, documentation, summaries, onboarding/reset docs, dashboards, and audit trails. It enforces immutability for core/template files and supports modular handler registration, output queues, and batch writing.

## Event Flow
- Receives events/outputs from all orchestrators (Task, Debug, Planner, Summarizer, etc.)
- Queues outputs for batch writing
- Writes to disk, dashboards, or external systems
- Emits audit events for every write
- Prevents modification of immutable/template files
- Generates onboarding and reset documentation on demand

## Usage
- Register output handlers for different output types (docs, logs, dashboards)
- Use `queueOutput()` to add to the output queue
- Call `flushQueue()` to batch write outputs
- Use `generateOnboardingDocs()` to create onboarding/reset docs from templates
- All actions are logged and auditable

## Integration Points
- **PlannerOrchestrator:** Receives output events and audit logs
- **BackupOrchestrator:** Ensures backup before destructive writes
- **LifecycleOrchestrator:** Calls onboarding/reset doc generation
- **API Layer:** Exposes endpoints for output retrieval and onboarding doc generation

## Immutability Enforcement
- WriterOrchestrator checks file paths before writing
- Prevents overwriting files in the immutable core/template layer
- Logs and audits all attempts to modify immutable files

## Audit Trail
- Every output is logged with timestamp, source, and action
- Audit logs are available for review and compliance

## See Also
- [PlannerOrchestrator](PLANNER_ORCHESTRATOR.md)
- [BackupOrchestrator](backup-orchestrator.md)
- [LifecycleOrchestrator](../architecture/SYSTEM_LIFECYCLE.md)
- [API Reference](../api-reference.md) 