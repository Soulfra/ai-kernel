---
title: Validation & Compliance
description: Documentation for the Validation & Compliance module.
lastUpdated: 2025-06-03
version: 1.0.0
---

# Validation & Compliance

## Overview
Validates file naming, length, metadata, dependencies, and anti-recursion compliance across the system.

## Input
- All pipeline outputs

## Output
- Validation reports (to `/logs/` and `/docs/`)

## Anti-Recursion
- Never modifies pipeline inputs or outputs
- Only reads and reports 