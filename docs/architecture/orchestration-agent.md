---
title: Orchestration Agent
description: Implementation details for the Orchestration Agent in the Agentic Orchestration Layer.
lastUpdated: 2025-07-27T06:00:00Z
version: 1.0.0
tags: [agent, orchestration, architecture]
status: living
---

# Orchestration Agent

The **Orchestration Agent** coordinates workflow execution within the CLARITY_ENGINE kernel. It extends the `BaseAgent` class and logs all steps using the canonical `Logger`. Log files are created with `ensureFileAndDir` to maintain self‑healing properties.

## Overview

- Manages ordered steps in a workflow
- Creates a log file for every run
- Emits errors when a step fails
- Designed to integrate with other agents defined in the [Agentic Orchestration Layer](./agentic-orchestration.md)

## Implementation

```javascript
const OrchestrationAgent = require('../../scripts/core/orchestration-agent');

async function example() {
  const agent = new OrchestrationAgent();
  await agent.runWorkflow([
    () => Promise.resolve('one'),
    () => Promise.resolve('two')
  ]);
}
```

## Maintenance

- Verify log file creation during E2E tests
- Keep documentation in sync with `kernel-integration-standards.md`
- Update tests when adding new workflow capabilities

