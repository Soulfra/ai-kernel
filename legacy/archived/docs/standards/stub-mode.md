---
title: Stub Mode and TODO Tracking
description: Documentation for stub mode, how it works, how it's logged, and how to spiral out to full implementation. Part of the Soulfra Standard for iterative, traceable development.
lastUpdated: 2025-07-27T06:00:00Z
version: 1.0.0
---

# Stub Mode and TODO Tracking

## What is Stub Mode?
Stub mode is a temporary state where missing dependencies, integrations, or features are replaced with stubbed (fake) responses. This allows the system to run end-to-end, log all steps, and provide a "thread" for debugging and iterative improvement.

## When is Stub Mode Used?
- When a required dependency (e.g., anthropic, OpenAI) is missing
- When an integration or feature is not yet implemented
- When running in a test or bootstrap environment

## How is Stub Mode Logged?
- Every stubbed call logs a clear message to `project_meta/suggestion_log.md` and a dedicated dashboard file (e.g., `project_meta/insights/llm_stub_dashboard.md`)
- All stubbed calls are marked with `STUB MODE` and `TODO: Fix` for later tracking

## How to Find All Stubbed Calls/TODOs
- Search for `STUB MODE` or `TODO: Fix` in logs and dashboard files
- Review `project_meta/insights/llm_stub_dashboard.md` for all stubbed LLM calls
- Review the magic list and suggestion log for all stubbed steps

## How are Stubbed Errors and Missing Scripts Logged?
- Any missing script or failed execSync/require call is caught, logged as a stub/TODO, and surfaced in the suggestion log and dashboard.
- The system never fails silently; every gap is actionable and traceable.
- This enables a true spiral-out process: you can always see what needs to be implemented next.

## Spiral-Out Example
- If `run-safe-migration.js` is missing, the orchestrator logs a stub message and continues.
- The magic list and dashboards show this as a TODO.
- You can then implement the script, remove the stub, and re-run the system to verify.

## Spiral-Out Process
1. Run the system in stub mode to get a working end-to-end flow
2. Log and trace all stubbed calls and TODOs
3. Replace each stub with a real implementation, one by one
4. After each fix, re-run the E2E orchestrator and verify the system
5. Repeat until all stubs are replaced and the system is fully implemented

## References
- [Forced Wrapper Utility](./forced-wrapper.md)
- [E2E Orchestrator](./e2e-orchestrator.md)
- [Magic List Engine](./magic-list-engine.md)

---
*Stub mode is a key part of the Soulfra Standard for safe, iterative, and traceable development. It ensures you always have a working thread to debug, improve, and spiral out from.* 