---
title: Developer Onboarding
description: Step-by-step guide for new contributors to CLARITY_ENGINE. Covers setup, E2E, watcher/daemon, and adding orchestrators.
version: 1.0.0
lastUpdated: 2025-06-04T00:00:00Z
---

# Developer Onboarding

## Welcome!
This guide will help you get started as a contributor to CLARITY_ENGINE's orchestrator-driven automation system.

## Step 1: Setup
- Clone the repository and install dependencies (`npm install`)
- Review the [System Lifecycle](./architecture/SYSTEM_LIFECYCLE.md) and [Triangle Pattern](./architecture/TRIANGLE_PATTERN.md)

## Step 2: Run E2E Onboarding/Reset Test
- Run `node scripts/e2e-onboarding-reset.js`
- This will initialize all orchestrators, trigger onboarding/reset, and verify system health
- See [E2E Onboarding/Reset Test](./testing/E2E_ONBOARDING_RESET.md) for details

## Step 3: Run Watcher/Daemon
- Start the watcher/daemon with your desired interval and lock file config
- The watcher will autonomously monitor system health and trigger resets as needed
- See [WatcherOrchestrator & Daemon](./orchestration/WATCHER_DAEMON.md)

## Step 4: Add a New Orchestrator
- Create a new orchestrator class in `scripts/core/`
- Ensure it supports dependency injection for logger, telemetry, etc.
- Add `initialize()` and `cleanup()` methods
- Register it with the router and document its usage
- Follow the [Triangle Pattern](./architecture/TRIANGLE_PATTERN.md) for integration

## Step 5: Run and Expand Tests
- Run all unit and E2E tests (`npm test` or `npx jest`)
- Add new tests for your orchestrator and update documentation as needed

## Step 6: Troubleshooting
- See [Troubleshooting & FAQ](./TROUBLESHOOTING.md) for common issues and fixes

## See Also
- [System Lifecycle](./architecture/SYSTEM_LIFECYCLE.md)
- [Triangle Pattern](./architecture/TRIANGLE_PATTERN.md)
- [E2E Onboarding/Reset Test](./testing/E2E_ONBOARDING_RESET.md)
- [WatcherOrchestrator & Daemon](./orchestration/WATCHER_DAEMON.md)
- [Troubleshooting & FAQ](./TROUBLESHOOTING.md) 