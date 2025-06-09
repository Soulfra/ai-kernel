---
title: Extraction Engine
description: Documentation for the Extraction Engine module.
lastUpdated: 2025-06-03
version: 1.0.0
---

# Extraction Engine

## Overview
Processes files from `/ready/`, extracts concepts, and outputs to `/concepts/`.

## Input
- `/ready/` (files ready for extraction)

## Output
- `/concepts/` (extracted concepts)
- Logs to `/logs/`

## Anti-Recursion
- Never reads from or writes to its own output as input
- Only processes new files 