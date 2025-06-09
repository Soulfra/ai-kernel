---
title: Testing & Backtesting Guide
description: Guide for running, interpreting, and extending tests in CLARITY_ENGINE.
lastUpdated: 2025-06-03
version: 1.0.0
---

# Testing & Backtesting Guide

## Running Tests
- Use provided scripts in `/scripts/` to run unit, integration, and system tests.
- Run `npm test` or `yarn test` for the full suite.
- For batch tests, place files in `/drop/` and run the full pipeline.

## Interpreting Results
- Review output in `/logs/` and `/docs/` for pass/fail, errors, and coverage.
- All test actions are logged and auditable.

## Extending Tests
- Add new test cases in `/tests/` or extend existing scripts.
- Ensure new tests follow modularity and standards.
- Update documentation and coverage metrics.

## Test Batch Checklist
- [ ] Place agency files in `/drop/` or `/input/agency/`
- [ ] Run intake daemon/script
- [ ] Run extraction, clustering, and indexing scripts
- [ ] Run validation and compliance checks
- [ ] Review outputs, logs, and analytics
- [ ] Run gamification/review CLI
- [ ] Test backup and rollback
- [ ] Document the test run and results 