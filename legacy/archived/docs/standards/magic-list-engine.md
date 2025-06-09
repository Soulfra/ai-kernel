---
title: Magic List Engine CLI Utility
description: Documentation for the magic-list-engine.js CLI utility, which aggregates actionable items from all feedback/insight sources, clusters/deduplicates/tags, and outputs a single actionable list. Part of the Soulfra/Clarity Engine feedback loop.
lastUpdated: 2025-07-27T06:00:00Z
version: 1.0.0
---

# Magic List Engine CLI Utility

## Overview

The `magic-list-engine.js` CLI utility aggregates actionable items from:
- Conversation logs
- Debug logs
- Suggestion logs
- Archiving/batch summaries
- Living TODOs (FINALIZATION_PLAN.md, magic_goal_list.md)
- (Future) User feedback

It clusters, deduplicates, tags, and outputs a single actionable list to the terminal and to `project_meta/insights/magic_list_dashboard.md`. It logs its own run and errors, and is designed to keep the system self-healing and up to date.

## How to Run

```sh
node scripts/magic-list-engine.js
```

## What It Does
- Aggregates actionable items from all feedback/insight sources
- Clusters, deduplicates, and tags items by source (suggestion, debug, conversation, todo, goal, batch)
- Outputs a unified, actionable list to the terminal and dashboard file
- Logs every run and any errors to `project_meta/suggestion_log.md` and LogOrchestrator

## How It Works
- Reads from all key sources (logs, TODOs, batch summaries)
- Uses simple regex and tagging to extract actionable items
- Deduplicates and clusters by tag/source
- Outputs to both terminal and dashboard file

## How to Extend
- Add new sources (e.g., user feedback, plugin logs) by updating the script
- Enhance clustering/tagging logic for smarter grouping
- Add notification hooks (Slack, email, dashboard API)
- Integrate with onboarding, CI, and batch jobs for continuous improvement

## How It Fits the Soulfra/Clarity Engine Feedback Loop
- Ensures all surfaced gaps, TODOs, and lessons learned are visible and actionable in one place
- Keeps the team and system aware of what needs attention, closing the loop between detection, action, and documentation
- Can be run manually, scheduled, or integrated into CI/onboarding

---
*This utility is a core part of the Soulfra Standard for self-healing, self-documenting, and compliance-first automation.* 