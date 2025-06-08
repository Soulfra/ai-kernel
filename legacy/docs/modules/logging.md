---
title: Logging & Eventing
description: Documentation for the Logging & Eventing module.
lastUpdated: 2025-06-03
version: 1.0.0
---

# Logging & Eventing

## Overview
Centralizes logging of all actions, events, errors, and metrics across the system.

## Input
- Log events from all modules

## Output
- Append-only logs (to `/logs/`)
- Metrics and summaries (to `/docs/`)

## Anti-Recursion
- Never triggers pipeline actions
- Only records and aggregates events 