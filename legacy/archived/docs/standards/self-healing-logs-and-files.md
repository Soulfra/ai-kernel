---
title: Self-Healing Logs & File Creation Standard
version: 1.0.0
description: Canonical standard and template for robust, self-healing file and directory creation in CLARITY_ENGINE. Includes rationale, code template, and onboarding notes.
lastUpdated: 2025-07-27
---

# Self-Healing Logs & File Creation Standard

## Overview

This standard ensures that all orchestrators, scripts, and tests in CLARITY_ENGINE are robust to missing files and directories. It eliminates ENOENT errors and makes the system self-healing, modular, and CI-proof.

## Rationale
- Prevents all "no such file or directory" (ENOENT) errors.
- Ensures logs, manifests, suggestion logs, and meta files are always created as needed.
- Supports parallel and isolated test runs (no shared state or race conditions).
- Enables safe, auditable, and scalable automation.

## Canonical Pattern

1. **Use the `ensureFileAndDir` utility before any file write/append/stat.**
2. **In tests, use a unique temp directory for logs and meta files.**
3. **Pass the log directory as a config/option to orchestrators and loggers.**
4. **Never clean up or mutate shared directories in parallel tests.**

## Code Template

```js
const ensureFileAndDir = require('shared/utils/ensureFileAndDir');
const path = require('path');

// Example: Ensure suggestion log exists before writing
const suggestionLog = path.join(logsDir, 'suggestion_log.md');
ensureFileAndDir(suggestionLog);
fs.appendFileSync(suggestionLog, '...');

// Example: In a test, use a temp logs dir
const tempLogsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'logs-test-'));
const logPath = path.join(tempLogsDir, 'error.log');
ensureFileAndDir(logPath);
```

## Onboarding & Spiral-Out
- All new code must use `ensureFileAndDir` before file writes.
- All tests must use unique temp directories for logs/meta files.
- Document any surfaced gaps or lessons learned in this doc.
- Update the template and standards as the system evolves.

## Continuous Improvement
- Add a diagnostics script to check for direct file writes not using the utility.
- Reference this doc in onboarding, handoff, and compliance materials.

---

*For implementation, see `shared/utils/ensureFileAndDir.js` and test examples in `/tests/core/`.* 