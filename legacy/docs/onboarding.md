---
title: Onboarding Guide
description: Step-by-step onboarding for new users and contributors to CLARITY_ENGINE.
lastUpdated: 2025-06-03
version: 1.0.0
---

# Onboarding Guide

Welcome to CLARITY_ENGINE! This guide will help you get started as a user or contributor.

## Quick Start
1. Clone the repository and install dependencies.
2. Review the [Pipeline Contract](./pipeline-contract.md) and [System Architecture](./system-architecture.md).
3. Place your documents in `/drop/` or `/input/agency/` for intake.
4. Run the pipeline scripts in order: intake, extraction, clustering, indexing, validation.
5. Use the CLI or dashboard for analytics, voting, and review.
6. Review logs and reports in `/logs/` and `/docs/`.

## Contributor Steps
1. Read the [Validation Rules](./validation-rules.md) and [Testing Guide](./testing-guide.md).
2. Follow file naming, length, and metadata standards.
3. Write modular code (≤250 lines per file/function).
4. Add/extend documentation with YAML frontmatter.
5. Run validation and tests before submitting a PR.

## Pipeline Summary
- **Intake:** Watches for new files, moves to ready state.
- **Extraction:** Parses and extracts concepts.
- **Clustering:** Groups similar concepts.
- **Indexing:** Builds a searchable index.
- **Analytics:** Provides insights, voting, and review.

## Support
- For help, see `/docs/` or contact the maintainers. 