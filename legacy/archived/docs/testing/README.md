---
title: README
description: Documentation for the README component of the Clarity Engine system.
lastUpdated: 2025-06-03T00:07:33.500Z
version: 1.0.0
tags: []
status: draft
---

# CLARITY_ENGINE Test Suite

This test suite is fully modular, orchestrated, and telemetry-driven. All tests are grouped by type (unit, integration, E2E, CLI, migration, synthetic, legacy/archive) and use dependency injection for logging and telemetry.

## Quickstart

- To run all tests: `npm test` or `./run-test-cycle.sh`
- To run a specific test type: see the orchestration doc for commands.
- To add or extend tests: see [TEST_SUITE_ORCHESTRATION.md](./TEST_SUITE_ORCHESTRATION.md)

## Structure

- `/tests/unit/` — Unit tests
- `/tests/integration/` — Integration tests
- `/tests/e2e/` — End-to-end tests
- `/tests/cli/` — CLI tests
- `/tests/migration/` — Migration pipeline tests
- `/tests/fixtures/` — Test data
- `/tests/legacy/` — Archived/legacy tests

## Standards

- All tests must use orchestrator/telemetry injection
- No ad-hoc logging or side effects
- <250 lines per file/function
- Fully documented and auditable

For full details, see [TEST_SUITE_ORCHESTRATION.md](./TEST_SUITE_ORCHESTRATION.md)

## Test Run Reporting

After each test cycle, document the results using the [Test Run Report template](../test-run-report.md). Archive completed reports for auditability and continuous improvement.

## Automation & Migration

All test suite migrations and refactors are performed using the canonical automation script:

- **Script:** `scripts/automate-test-suite-migration.js`
- **Process:**
  - Backup, validate, and migrate in small, auditable batches (snowball approach)
  - Dry-run is default; live migration only on explicit confirmation
  - All actions are logged via canonical orchestrators
  - After each batch, update the orchestration doc and [Test Run Report](../test-run-report.md)
  - Lessons learned are incorporated into validation rules, documentation, and automation logic

For full details, see [TEST_SUITE_ORCHESTRATION.md](./TEST_SUITE_ORCHESTRATION.md)

---
*Last Updated: 2025-06-02T23:42:45.880Z*
*Version: 1.0.0* 