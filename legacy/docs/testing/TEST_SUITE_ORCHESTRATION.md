---
title: Test Suite Orchestration
version: 1.0.0
description: Living documentation for the modular, orchestrated, and telemetry-driven test suite of CLARITY_ENGINE.
lastUpdated: 2025-06-03
---

# Test Suite Orchestration (Living Doc)

## Purpose
- Why modular, orchestrated, and telemetry-driven testing is critical for CLARITY_ENGINE.
- Goals: reliability, modularity, auditability, onboarding, and future-proofing.

## Canonical Orchestration Layer: Mandatory Routing for All Automation

> **All automation, migration, validation, and documentation flows MUST be routed through the canonical orchestration layer.**

- **No ad-hoc scripts or direct logic are permitted.**
- All actions (migration, validation, doc updates, test runs, etc.) must be defined as tasks and submitted to the orchestrator for execution, logging, and telemetry.
- This ensures:
  - **Traceability:** Every action is logged, timestamped, and user-attributed in a single source of truth.
  - **Modularity:** New flows are just new task types or orchestrator workflows.
  - **Auditability:** All results, errors, and user prompts are captured in orchestrator logs and telemetry.
  - **Extensibility:** The system can be extended or refactored without breaking automation or documentation.

**Relevant orchestrator files:**
- `scripts/core/task-orchestrator.js`
- `scripts/core/meta-orchestrator.js`
- `scripts/core/log-orchestrator.js`
- `scripts/core/debug-orchestrator.js`
- `scripts/core/quality-orchestrator.js`

> **All automation scripts must submit tasks to the orchestrator and never execute migration/validation logic directly.**

## Canonical Structure (Expanded)

| Directory | Purpose | Naming Conventions | Example Files |
|-----------|---------|-------------------|---------------|
| /tests/unit/ | Unit tests for individual modules/functions. | <module>.test.js | log-orchestrator.test.js |
| /tests/integration/ | Integration tests for multiple modules working together. | <feature>-integration.test.js | migration-integration.test.js |
| /tests/e2e/ | End-to-end tests simulating real user flows. | <scenario>-e2e.test.js | full-migration-e2e.test.js |
| /tests/cli/ | CLI command and interface tests. | <command>.test.js | progress-bar.test.js |
| /tests/migration/ | Migration pipeline and data transformation tests. | <pipeline>.test.js | task-manager.test.js |
| /tests/fixtures/ | Test data and fixtures (JSON, text, audio, etc.). | <type>.<ext> | input.txt, input.wav |
| /tests/legacy/ | Archived or superseded tests, kept for reference. | <module>.test.legacy.js | memory-operations.test.ts.bak |
| /tests/viewer/components/ | Component/UI tests for the viewer. | <Component>.test.jsx | Button.test.jsx |
| /clarity-cli/__tests__/ | CLI-specific and snapshot tests. | <command>.snapshot.test.js | cli.snapshot.test.js |
| /scripts/core/tests/ | (To be merged) Orchestrator and core module tests. | <orchestrator>.test.js | meta-orchestrator.test.js |

**General Conventions:**
- All test files: lowercase, hyphens, no spaces, <250 lines.
- Use dependency injection for logging/telemetry.
- Place new tests in the appropriate canonical directory.
- Archive legacy/obsolete tests in `/tests/legacy/` with rationale.

## Orchestration, Telemetry, and Routing (Detailed)

### Test Discovery & Routing
- All test files are auto-discovered using glob patterns (e.g., `**/*.test.js`, `**/*.test.jsx`).
- Tests are grouped by directory (unit, integration, e2e, cli, migration, etc.).
- Dynamic test runners (e.g., Jest, Mocha, custom scripts) route tests to the appropriate orchestrator or handler.
- Each test type can be run independently or as part of a full-cycle test (see Quickstart in README).

### Orchestrator/Telemetry Injection
- All test modules and runners must use dependency injection for logging and telemetry.
- No ad-hoc logging: all logs/events/errors are routed through the canonical orchestrator (see `scripts/core/log-orchestrator.js`).
- Telemetry is collected for each test run, including:
  - Test start/end times
  - Pass/fail/skipped counts
  - Error and warning events
  - Resource usage (if applicable)
- Example (pseudo-code):
  ```js
  const logger = require('scripts/core/log-orchestrator');
  const telemetry = require('scripts/core/telemetry-manager');
  describe('MyModule', () => {
    beforeAll(() => logger.info('Starting MyModule tests'));
    afterAll(() => telemetry.recordMetric('tests_completed', 1));
    // ...
  });
  ```

### Dynamic Clustering & Modularity
- Tests are clustered by type and module for parallel execution and reporting.
- Test runners can dynamically discover new test files or clusters without manual updates.
- Modular test handlers allow for easy extension (e.g., adding new test types or clusters).

### Error Handling & Logging
- All errors, warnings, and notable events are logged centrally.
- ENOENT and other silent errors are explicitly checked and reported.
- Test failures trigger detailed telemetry events for traceability.
- Logs and telemetry are aggregated for each test run and included in the test run report.

### Standards Enforcement
- Pre-commit/test validation scripts ensure all tests:
  - Use DI for logging/telemetry
  - Follow naming and length conventions
  - Are placed in the correct canonical directory
- Validation failures block merges until resolved.

### Example Test Run Flow
1. Developer runs `./run-test-cycle.sh` or `npm test`.
2. Test runner discovers all test files by type.
3. Each test is executed with injected logger/telemetry.
4. All logs, errors, and metrics are routed to the orchestrator and telemetry manager.
5. Results are aggregated and output to the test run report template.
6. Any errors or anomalies are flagged for review.

## Lifecycle, Backtesting, and Maintenance (Detailed)

### Adding or Updating Tests
- Place new tests in the appropriate canonical directory (see structure above).
- Use dependency injection for logging and telemetry in all test files.
- Follow naming conventions: lowercase, hyphens, no spaces, <250 lines per file/function.
- Document the purpose and scope of each test at the top of the file.
- Update the mapping table and progress tracker in this doc after adding or updating tests.

### Archiving or Deprecating Tests
- Move legacy or obsolete tests to `/tests/legacy/`.
- Add a comment at the top of archived files explaining why they were archived and what superseded them.
- Update the mapping table and document the rationale in this doc.

### Backtesting Process
- Run the full test suite using `./run-test-cycle.sh` or `npm test` after any major change or migration.
- Use synthetic data and fixtures for dry runs to catch silent errors (ENOENT, etc.).
- Validate that all test types (unit, integration, E2E, CLI, migration) run without errors.
- Document each test run using the [Test Run Report template](../test-run-report.md).
- Archive completed test run reports for auditability.
- If errors or anomalies are found, document them in the "Lessons Learned & Backtesting Results" section and update tests as needed.

### Validation Checklist
- [ ] All new/updated tests use orchestrator/telemetry injection
- [ ] No ad-hoc logging or side effects
- [ ] File/function length <250 lines
- [ ] Correct canonical directory and naming
- [ ] Test is documented at the top of the file
- [ ] Test run passes with no silent errors (ENOENT, etc.)
- [ ] Test run is documented and archived

### Maintenance
- Regularly review and refactor tests for modularity and coverage.
- Periodically backtest the full suite, especially after major refactors or dependency updates.
- Keep this documentation up to date with all changes, migrations, and lessons learned.

## Clustering & Modularity
- How tests are grouped, clustered, and dynamically routed.
- Dynamic test discovery and routing.

## Onboarding and Extension (For New Contributors)

### Getting Started
- Read this orchestration document fully to understand the test suite's structure, standards, and workflow.
- Review the canonical directory structure and mapping table to see where your test should go.
- Familiarize yourself with orchestrator/telemetry injection by reviewing example test files and the logger/telemetry modules (`scripts/core/log-orchestrator.js`, `scripts/core/telemetry-manager.js`).

### Adding a New Test
1. Identify the correct canonical directory for your test (unit, integration, e2e, cli, migration, etc.).
2. Create your test file using the naming conventions (lowercase, hyphens, no spaces, <250 lines).
3. Use dependency injection for logging and telemetry in your test setup.
4. Document the purpose and scope of your test at the top of the file.
5. Run your test locally and ensure it passes with no silent errors.
6. Update the mapping table and progress tracker in this doc.
7. Document your test run using the [Test Run Report template](../test-run-report.md).

### Extending or Refactoring Tests
- When updating or refactoring tests, follow the same standards as for new tests.
- If merging or archiving tests, update the mapping table and add rationale in this doc.
- Refactor for modularity, DI, and logging as needed.

### Reporting and Documentation
- After each test run, fill out the [Test Run Report template](../test-run-report.md) and archive it for auditability.
- If you encounter errors or issues, document them in the "Lessons Learned & Backtesting Results" section.
- Keep this orchestration doc up to date with all changes, migrations, and lessons learned.

### Helpful Links
- [Test Run Report template](../test-run-report.md)
- [README for the test suite](./README.md)
- [Logger Orchestrator](../../scripts/core/log-orchestrator.js)
- [Telemetry Manager](../../scripts/core/telemetry-manager.js)

---

# Test Suite Inventory (as of 2025-06-03)

| Current Location | File(s) | Type | Notes |
|------------------|---------|------|-------|
| /tests/core/ | debug-orchestrator.test.js, ... | Unit | Orchestrator tests |
| /tests/unit/memory/ | memory-operations.test.ts.bak | Unit | Memory component |
| /tests/unified-migration/ | task-manager.test.js, ... | Migration | Migration pipeline |
| /tests/cli/ | progress-bar.test.js, ... | CLI | CLI tests |
| /tests/viewer/components/ | Button.test.jsx | Component | Viewer tests |
| /clarity-cli/__tests__/ | cli.snapshot.test.js, ... | CLI/Snapshot | CLI tests |
| /scripts/core/tests/ | meta-orchestrator.test.js, ... | Unit | To be consolidated |
| /tests/fixtures/ | input.txt, ... | Fixture | Test data |

(Add more rows as needed)

---

# Mapping Table: Current → Canonical Structure

| Current Location | File(s) | Target Location | Migration Notes |
|------------------|---------|----------------|----------------|
| /tests/core/ | debug-orchestrator.test.js, ... | /tests/unit/ | Move, merge with /scripts/core/tests/ |
| /tests/unit/memory/ | memory-operations.test.ts.bak | /tests/legacy/ | Archive as legacy (TypeScript, .bak) |
| /tests/unified-migration/ | task-manager.test.js, ... | /tests/migration/ | Move, ensure modularity/DI |
| /tests/cli/ | progress-bar.test.js, ... | /tests/cli/ | Review, refactor for DI |
| /tests/viewer/components/ | Button.test.jsx | /tests/unit/ or /tests/viewer/components/ | Keep, ensure modularity |
| /clarity-cli/__tests__/ | cli.snapshot.test.js, ... | /tests/cli/ or /clarity-cli/__tests__/ | Keep, document as CLI/snapshot |
| /scripts/core/tests/ | meta-orchestrator.test.js, ... | /tests/unit/ | Move, merge with /tests/core/ |
| /tests/fixtures/ | input.txt, ... | /tests/fixtures/ | Keep as is |

(Add more rows as needed)

**Migration Notes:**
- Merge orchestrator/core tests into `/tests/unit/`.
- Archive `.bak` and TypeScript legacy tests.
- Refactor all tests for DI, modularity, and logging standards.
- Document all moves/merges in this doc and in commit messages.

---

# Migration Plan

- Propose canonical structure (see above).
- Map all current tests to this structure.
- Migrate, merge, and modularize in small, validated steps.
- After each batch, update this doc and run the test cycle to validate.
- Refactor for DI, telemetry, and modularity as you go.
- Archive legacy/obsolete tests with clear rationale.

---

# Progress Tracker

- [x] Inventory complete
- [x] Canonical structure defined
- [x] Migration plan drafted
- [ ] Batch 1 migrated/validated
- [ ] Batch 2 migrated/validated
- [ ] Orchestration/telemetry enhanced
- [ ] Full backtest complete
- [ ] Documentation finalized

---

# Lessons Learned & Backtesting Results

## Migration/Test Run Log Template

### Date:
### Batch/Step:
### Summary of Actions:
### Issues Found:
### Fixes Applied:
### Telemetry/Logging Notes:
### Lessons Learned:
### Next Steps:

(Add a new entry for each migration or test run. Archive completed reports in `/docs/test-run-report.md`.)

---

# Automation & Batch Migration (Snowball Process)

All test suite migrations are performed using the canonical automation script:

- **Script:** `scripts/automate-test-suite-migration.js`
- **Process:**
  1. Backup all relevant files and verify backup integrity.
  2. Run validation (dry-run) and abort on any errors.
  3. Print a summary of planned actions for each batch (dry-run output).
  4. Require explicit user confirmation before live migration.
  5. For each batch:
     - Move/archive files as planned
     - Run tests and log results
     - Update documentation and test run report
     - Append batch summary and lessons learned to this doc
  6. Run post-migration validation and full backtest.
  7. Log all actions and update documentation for traceability.

### Usage
- Run: `node scripts/automate-test-suite-migration.js [--yes]`
- Dry-run is default; live migration only on explicit confirmation.
- All actions are logged via canonical orchestrators.
- After each batch, update this doc and the [Test Run Report](../test-run-report.md).

### Lessons Learned & Batch Summary Template

| Date | Batch | Actions | Issues | Fixes | Telemetry | Lessons Learned | Next Steps |
|------|-------|---------|--------|-------|-----------|-----------------|------------|
|      |       |         |        |       |           |                 |            |

- After each batch, fill out a new row and update the doc.
- Archive completed reports in [Test Run Report](../test-run-report.md).

### Traceability
- Every migration, validation, and test run is logged and auditable.
- All changes are traceable to a batch, timestamp, and user confirmation.
- Lessons learned are incorporated into validation rules, documentation, and automation logic.

---

## Orchestrator-Driven Automation & Infinity Router Pattern

All automation, migration, validation, and documentation flows are defined as tasks and submitted to the canonical orchestrator layer. The orchestrator handles execution, logging, telemetry, error handling, and user prompts. This enables:
- Merge-safe, parallel, and modular operations
- Full traceability and auditability
- Automated documentation and reporting
- LLM-ready context and documentation routing

### How to Define and Submit Tasks
- Define each action (migration, validation, doc update, LLM call, etc.) as a task object
- Submit tasks to the orchestrator (e.g., TaskOrchestrator, MetaOrchestrator)
- The orchestrator logs all actions, results, and errors
- Docs and reports are generated from orchestrator logs and telemetry

### Infinity Router Diagram (Description)
- All automation, context, and LLM flows go through the orchestrator layer
- Orchestrator routes to task handlers, context/documentation indexers, LLMs, and doc/report updaters
- All results, errors, and user prompts are logged and auditable

### Onboarding for New Contributors
- All new automation must use the orchestrator layer
- Never run migration/validation logic directly in scripts
- Add new task types or workflows by extending the orchestrator or task handlers
- Use orchestrator logs and telemetry to update docs, reports, and context indexes

---

## Automated Documentation, Reporting, and Context Indexing

- All orchestration logs and telemetry are parsed to auto-update:
  - The orchestration doc (batch/task summaries, lessons learned, errors)
  - The test run report (results, errors, telemetry)
  - The context/documentation index (for LLMs and users)
- After each batch or task, docs and reports are updated automatically—no manual steps required.
- This enables continuous onboarding, traceability, and LLM/context workflows.
- To extend: add new task types or handlers for LLM/context/documentation flows, and update the indexer to include new context types.
- Parallel/merge-safe operations are supported by the orchestrator and reflected in the logs and index.

---

## Self-Healing, Defensive Patterns, and the Infinity Router

- All async resources (e.g., loggers, telemetry, orchestrators) must be fully initialized before use.
- The orchestrator and all handlers must check for initialization and fail gracefully with clear errors if not ready.
- Defensive checks (e.g., in LogOrchestrator.log) prevent cryptic errors and enable self-healing workflows.
- All such events are logged and used to improve the system and prompt engineering.
- This is a key part of the "infinity router" pattern: the system can auto-correct, retry, or prompt the user as needed, and is robust to partial failures.
- Lessons learned: Never use async resources before initialization. Always log and report initialization errors for future improvement.

---

# Test Suite Orchestration

## Overview

This document describes the orchestrator-driven approach to running, validating, and reporting on the test suite in CLARITY_ENGINE, including automated error clustering and reporting.

## Test Suite Workflow

1. **Task Creation:** Add test, validation, and error clustering tasks to the orchestrator.
2. **Execution:** The orchestrator runs all tasks using their respective handlers (e.g., `TestHandler`, `ValidationHandler`, `ErrorClusterHandler`).
3. **Error Clustering:** After tests, an `errorcluster` task can be added to aggregate and report errors from all logs and reports.
4. **Outputs:**
   - Test results and validation reports
   - `error-clusters.json` and `error-clusters.md` for error triage
5. **CI Integration:** All outputs are available for CI dashboards and automated review.

## Example: Adding Error Clustering After Tests

```js
await orchestrator.addTask({
  type: 'errorcluster',
  description: 'Cluster and report errors after test suite run',
});
```

## Standards Compliance

- All test and error reporting is orchestrator-driven, logged, and auditable
- No ad-hoc scripts: all automation is routed through orchestrators
- Documentation follows required YAML frontmatter and metadata

## See Also
- [Task Orchestrator](../components/orchestration/task-orchestrator.md)
- [Error Clustering](../components/orchestration/error-clustering.md)
- [Task Handlers](../components/task-handlers.md) 