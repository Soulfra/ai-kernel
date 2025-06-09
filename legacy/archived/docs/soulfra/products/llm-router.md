---
title: Llm Router
description: Documentation for the llm-router component of the Clarity Engine system.
lastUpdated: 2025-06-04T00:00:00.000Z
version: 1.1.0
tags: []
status: stable
---

# LLM Router - Product Requirements & Implementation

## Overview
LLM Router is an intelligent system for managing and optimizing LLM interactions, providing model selection, cost management, performance optimization, and deep context routing. **All LLM calls in Clarity Engine are routed through `scripts/core/llm-router.js` via orchestrators.**

## Core Requirements

### Functional Requirements
- Model selection and routing
- Performance optimization
- Cost management
- Quality monitoring
- Fallback handling
- Usage analytics
- **Context-aware routing (e.g., passing task/debug logs for deep reasoning)**

### Technical Requirements
- Performance: < 100ms routing
- Security: API key management
- Scalability: Load balancing
- Integration: Multiple LLM APIs
- **Deep logging and orchestrator integration**

## Implementation

### Architecture
- Router core (`scripts/core/llm-router.js`)
- Model registry (OpenAI, DeepSeek, Claude, etc.)
- Performance monitor
- Cost tracker
- Analytics engine
- **Integrated with LogOrchestrator and all orchestrators**

### Usage Example

```js
const { LLMRouter } = require('./core/llm-router');
const router = new LLMRouter();

// Shallow LLM call
const result = await router.routeLLMCall('Say hello world.', {}, { requiredDepth: 'shallow' });

// Deep LLM call with debug logs as context
const context = { deepLogs: 'Error: Something failed at step 3. Warning: Resource low.' };
const deepResult = await router.routeLLMCall('Summarize the following debug logs.', context, { requiredDepth: 'deep' });
```

### Orchestrator Integration
- All orchestrators (Task, Debug, Writer, etc.) must use LLMRouter for LLM calls.
- Pass relevant context (task logs, debug logs, dependencies) for deep tasks.
- All requests, responses, and errors are logged via LogOrchestrator.

## Success Metrics
- Routing accuracy
- Cost efficiency
- Response time
- Model utilization
- Error rate
- **Contextual accuracy for deep tasks**

## Maintenance
- Update model registry as new LLMs are added
- Monitor logs and analytics for performance/cost/quality
- Refactor orchestrators to use LLMRouter exclusively

