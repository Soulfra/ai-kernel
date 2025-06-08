---
title: Overseer Watchdog CLI Utility
description: Documentation for the overseer-watchdog.js script, which monitors for stuck/hung processes, swaps in blank/reset state, logs interventions, and updates the dashboard and magic list.
lastUpdated: 2025-07-27T06:00:00Z
version: 1.0.0
---

# Overseer Watchdog CLI Utility

## Overview

The `overseer-watchdog.js` script monitors all running jobs/scripts for heartbeats/progress by checking log/dashboard file timestamps. If a process is stuck or hung (no progress in 1 minute), it swaps in a blank/reset state, logs the intervention, and updates the dashboard and magic list. It escalates if multiple stuck files are detected.

## How to Run

```sh
node scripts/overseer-watchdog.js
```

## What It Does
- Monitors key status/dashboard files for recent updates
- Detects stuck/hung processes (no update in 1 minute)
- Swaps in blank/reset state for stuck files
- Logs all interventions and escalates if needed
- Updates dashboard and magic list

## Logging
- All actions and interventions are logged to `project_meta/suggestion_log.md` and via LogOrchestrator
- Dashboard file: `project_meta/insights/overseer_watchdog_dashboard.md`

## How to Extend
- Add more status files or heartbeat sources as needed
- Adjust stuck threshold for your system
- Integrate with notification hooks (Slack, email, dashboard API)
- Schedule as a CI job or background daemon for continuous assurance

---
*This overseer is the meta-resilience layer of the Soulfra Standard, ensuring no process is ever stuck or left unmonitored.* 