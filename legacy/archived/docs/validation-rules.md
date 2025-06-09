---
title: Validation Rules
description: Enforced standards for files, code, and documentation in CLARITY_ENGINE.
lastUpdated: 2025-06-03
version: 1.0.0
---

# Validation Rules

## File Naming
- Lowercase, hyphens, no spaces
- Must match module/component purpose

## File Length
- ≤250 lines per file/function

## Metadata
- All docs must have YAML frontmatter with: `title`, `description`, `lastUpdated`, `version`

## Dependency & Link Validation
- No circular references
- All links and dependencies must resolve

## Anti-Recursion
- No script/module writes to its own input or triggers itself/upstream
- All triggers are explicit (user, cron, or event from a different layer)

## Logging & Telemetry
- All actions must be logged via canonical orchestrators
- No ad-hoc logging

## Pre-Commit & CI
- All standards are validated before commit/merge

## Change Management
- All changes to validation rules must be reviewed and versioned 