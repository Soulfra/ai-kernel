---
title: Active Suggestions CLI Utility
description: Documentation for the active-suggestions.js CLI utility, which aggregates and surfaces actionable suggestions, TODOs, and errors from logs and living docs. Part of the Soulfra/Clarity Engine feedback loop.
lastUpdated: 2025-07-27T06:00:00Z
version: 1.0.0
---

# Active Suggestions CLI Utility

## Overview

The `active-suggestions.js` CLI utility aggregates and surfaces actionable suggestions, TODOs, and errors from:
- `project_meta/suggestion_log.md`
- `project_meta/plans/FINALIZATION_PLAN.md` (Living TODOs)
- `project_meta/insights/` (batch meta-summaries, lessons learned)

It outputs a prioritized, actionable list in the terminal, logs its own run and any errors to LogOrchestrator and the suggestion log, and is designed to keep the system self-healing and up to date.

## How to Run

```sh
node scripts/active-suggestions.js
```

## What It Does
- Parses and clusters actionable items from logs and living docs
- Outputs:
  - Recent surfaced gaps & errors
  - Living TODOs (by cluster)
  - Recent insights & lessons learned
- Logs every run and any errors to `project_meta/suggestion_log.md` and LogOrchestrator

## Expected Output
- A clear, actionable list of the latest surfaced suggestions, TODOs, and errors
- If no actionable items are found, outputs: "No actionable suggestions, TODOs, or errors found. System is healthy!"

## Error Handling
- Any file read or parse errors are logged to the suggestion log and LogOrchestrator
- If the script fails, it logs the error and exits with a non-zero code

## How It Fits the Soulfra/Clarity Engine Feedback Loop
- Ensures all surfaced gaps, TODOs, and lessons learned are visible and actionable
- Keeps the team and system aware of what needs attention, closing the loop between detection, action, and documentation
- Can be run manually or scheduled as part of CI/onboarding

## How to Test

1. **Manual Test:**
   - Add a new entry to `project_meta/suggestion_log.md` or a TODO to `FINALIZATION_PLAN.md`
   - Run `node scripts/active-suggestions.js`
   - Verify the new entry appears in the output

2. **Error Test:**
   - Temporarily rename one of the source files (e.g., `suggestion_log.md`)
   - Run the script and verify that the error is logged and surfaced

3. **Healthy System Test:**
   - Clear all actionable items from the logs and TODOs
   - Run the script and verify it outputs the healthy system message

## Logging
- All runs and errors are logged to `project_meta/suggestion_log.md` and via LogOrchestrator
- These logs are surfaced in the dashboard and batch meta-summaries

## Continuous Improvement
- The script is designed to be extended with notifications (email, Slack, dashboard API) in the future
- All surfaced gaps and lessons learned are fed back into the system for continuous improvement

---
*This utility is a core part of the Soulfra Standard for self-healing, self-documenting, and compliance-first automation.* 