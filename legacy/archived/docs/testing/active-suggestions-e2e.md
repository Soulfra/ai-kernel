---
title: Active Suggestions CLI E2E Test
description: Documentation for the end-to-end test of the active-suggestions.js CLI utility, including test steps, how to run, and expected results.
lastUpdated: 2025-07-27T06:00:00Z
version: 1.0.0
---

# Active Suggestions CLI E2E Test

## Overview
This document describes the end-to-end (E2E) test for the `active-suggestions.js` CLI utility, which aggregates and surfaces actionable suggestions, TODOs, and errors from logs and living docs.

## What It Tests
- That a fake suggestion and TODO are surfaced in the CLI output
- That the CLI handles missing files gracefully and logs errors
- That the CLI outputs a healthy system message when no actionable items are present

## How to Run

```sh
npm test tests/core/active-suggestions.test.js
```

## Test Steps
1. **Add a fake suggestion and TODO** to the relevant files
2. **Run the CLI** and check that both appear in the output
3. **Simulate a missing file** (e.g., rename `suggestion_log.md`) and check that an error is logged and surfaced
4. **Clear all actionable items** and check that the healthy system message is output

## Expected Results
- The fake suggestion and TODO are shown in the CLI output
- Missing file errors are logged and surfaced
- When no actionable items are present, the CLI outputs: "No actionable suggestions, TODOs, or errors found. System is healthy!"

## Error Handling
- All errors are logged to `project_meta/suggestion_log.md` and via LogOrchestrator
- The test restores original files after running

## Continuous Improvement
- This test should be updated as the CLI utility evolves (e.g., if new sources or output formats are added)

---
*This E2E test ensures the active suggestion feedback loop is robust, visible, and self-healing as part of the Soulfra Standard.* 