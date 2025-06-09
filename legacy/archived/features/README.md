---
title: Modular Features Directory
description: How to add, test, and document new features for the CLARITY_ENGINE kernel slate using the modular spiral-out process.
lastUpdated: 2025-06-07T00:00:00Z
version: 1.0.0
---
# Modular Features Directory

This directory is for new, modular features that extend the CLARITY_ENGINE kernel slate.

## Spiral-Out Process
- Develop each feature in isolation (in its own folder)
- Write E2E/integration/unit tests for every feature
- Document with YAML frontmatter and crosslinks
- Only merge features that are E2E-tested, self-healing, and documented

## How to Add a New Feature
1. Copy the `_template/` directory to a new folder (e.g., `my-feature/`)
2. Update the README and code
3. Write tests in `test/`
4. Update docs and crosslinks
5. Submit a PR or merge after passing all checks

## References
- [Kernel Standards](../KERNEL_SLATE/docs/standards/kernel-backup-e2e-checklist.md)
- [Onboarding](../KERNEL_SLATE/README.md) 