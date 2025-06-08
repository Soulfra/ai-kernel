---
title: Testing Harness & Backtesting Guide
description: Documentation for the modular, automated test harness and backtesting process.
lastUpdated: 2025-06-03
version: 1.0.0
---

# Testing Harness & Backtesting Guide

## Overview
This guide describes how to use the modular, automated test harness for the CLARITY_ENGINE pipeline. All scripts are modular, non-recursive, and support dynamic test scenarios.

## Test Workflow
1. **Reset the environment:**
   ```sh
   node scripts/reset-test-env.js --desc "Clean slate before backtest"
   ```
   - Deletes contents of all pipeline directories for a clean run.

2. **Set up the test environment:**
   ```sh
   node scripts/setup-test-env.js
   ```
   - Creates `/drop` and `/ready` if missing, copies sample files from `/test-docs/` if available.

3. **Add your test files:**
   - Place files (e.g., `memory.json`, ChatGPT logs) in `/drop/`.

4. **Run the full pipeline:**
   ```sh
   node scripts/master-orchestrator.js --report
   ```
   - Runs intake, extraction, clustering, indexing, validation, analytics.
   - Generates a Markdown run report in `/logs/`.

5. **Review outputs and logs:**
   - Check `/concepts/`, `/clusters/`, `/index/`, `/logs/` for results and reports.

6. **Document the test run:**
   - Fill out a `test-run-report.md` for each scenario.

## Modularity & Extensibility
- All scripts are under 250 lines, non-recursive, and can be extended for batch, CI, or scenario-based testing.
- Add new test scenarios by placing files in `/test-docs/` or `/drop/`.
- Archive results by moving outputs/logs to `/test-results/<timestamp or scenario>/`.

## Interpreting Outputs
- **Concepts:** Extracted from input files, found in `/concepts/`.
- **Clusters:** Grouped concepts, found in `/clusters/`.
- **Index:** Searchable index, found in `/index/`.
- **Logs:** Event logs, errors, and run reports in `/logs/`.
- **Run Report:** Markdown summary of each run, in `/logs/`.

## Extending the Harness
- Add batch scenario support, result diffing, or CI integration as needed.
- See the enhancement backlog for future features.

--- 