---
title: Chatlog Parser Feature
description: Parses exported chat logs, clusters ideas, and generates docs with YAML frontmatter for the kernel slate.
lastUpdated: 2025-06-07T00:00:00Z
version: 0.1.0
---
# Chatlog Parser Feature

## Description
This feature parses exported chat logs (from Cursor, ChatGPT, etc.), clusters ideas and TODOs, and generates documentation with YAML frontmatter and crosslinks. It helps you turn conversations into actionable, standards-compliant docs.

## Usage
1. Export your chat logs as text or Markdown
2. Place them in a folder (e.g., `input-logs/`)
3. Run the parser:
   ```
   node features/chatlog-parser/index.js input-logs/ docs/generated/
   ```
4. Generated docs will appear in `docs/generated/`

## Tests
How to run the tests for this feature:
```
npx jest features/chatlog-parser/test/
```

## Crosslinks
- [Magic List](../../magic-list.md)
- [Kernel Standards](../../KERNEL_SLATE/docs/standards/kernel-backup-e2e-checklist.md)

## Onboarding Notes
- All generated docs use YAML frontmatter and crosslinks
- Update this README with every change 