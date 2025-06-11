---
title: Chatlog Parser Feature
description: Parses chat logs to extract ideas and TODOs and generates Markdown documentation.
lastUpdated: 2025-07-27T06:00:00Z
version: 0.1.0
tags: [chatlog, parser, documentation]
status: living
---

# Chatlog Parser Feature

This feature converts exported chat logs into structured Markdown documents. It scans
for TODO items and bullet points, then creates docs with YAML frontmatter
that can be incorporated into the kernel documentation.

## Usage

```bash
node scripts/features/chatlog-parser/index.js input-logs/ docs/generated/
```

Generated files will appear in `docs/generated/`.

## Tests

Run the unit tests:

```bash
npm test tests/features/chatlog-parser.test.js
```

## References
- [Documentation Automation](../../../docs/standards/documentation-automation.md)
