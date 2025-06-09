---
title: Clustering Engine
description: Documentation for the Clustering Engine module.
lastUpdated: 2025-06-03
version: 1.0.0
---

# Clustering Engine

## Overview
Groups similar concepts from `/concepts/` and outputs clusters to `/clusters/`.

## Input
- `/concepts/` (extracted concepts)

## Output
- `/clusters/` (clustered concepts)
- Logs to `/logs/`

## Anti-Recursion
- Never reads from or writes to its own output as input
- Only processes new concepts 