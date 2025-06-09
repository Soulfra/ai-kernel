---
title: Intake Daemon
description: Documentation for the Intake Daemon module.
lastUpdated: 2025-06-03
version: 1.0.0
---

# Intake Daemon

## Overview
Watches `/drop/` or `/input/agency/` for new files, moves them to `/ready/` for processing, and logs all actions.

## Input
- `/drop/` or `/input/agency/` (new files)

## Output
- `/ready/` (files ready for extraction)
- Logs to `/logs/`

## Anti-Recursion
- Never writes back to input directories
- Only moves/copies files, never processes its own output 