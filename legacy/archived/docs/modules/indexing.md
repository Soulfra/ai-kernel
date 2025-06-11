---
title: Indexing Engine
description: Documentation for the Indexing Engine module.
lastUpdated: 2025-06-03
version: 1.0.0
---

# Indexing Engine

## Overview
Indexes clusters from `/clusters/` and outputs a searchable index to `/index/`.

## Input
- `/clusters/` (clustered concepts)

## Output
- `/index/` (searchable index)
- Logs to `/logs/`

## Anti-Recursion
- Never reads from or writes to its own output as input
- Only processes new clusters 