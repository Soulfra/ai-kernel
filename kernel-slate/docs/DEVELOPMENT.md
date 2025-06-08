---
title: Development Guide
description: Workflow and standards for contributing to CLARITY_ENGINE.
lastUpdated: 2025-06-08T04:36:01Z
version: 1.0.0
tags: [development]
status: living
---

# Development Guide

## Workflow

1. Create a feature branch.
2. Implement your feature with tests.
3. Run the test suite:
   ```bash
   npm test
   ```
4. Update documentation.
5. Submit a pull request.

## Standards

- Use `ensureFileAndDir` for all file writes.
- Follow the [Kernel Integration Standards](./standards/kernel-integration-standards.md).
- Keep documentation up to date.
