---
title: Chatlog Parser Example
description: Example usage of the chatlog parser feature.
lastUpdated: 2025-07-27T06:00:00Z
version: 0.1.0
tags: [example, chatlog]
status: living
---

# Chatlog Parser Example

The chatlog parser converts exported chat conversations into Markdown docs.
It scans for TODO items and bullet points, then creates files with YAML
frontmatter.

```bash
node scripts/features/chatlog-parser/index.js input-logs/ docs/generated/
```

See the [Chatlog Parser README](../../scripts/features/chatlog-parser/README.md)
for full details.
