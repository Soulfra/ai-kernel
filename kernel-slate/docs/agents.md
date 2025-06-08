---
title: Agent Registry
description: List of available agents in the CLARITY_ENGINE kernel.
lastUpdated: 2025-06-08T15:48:41.034Z
version: 1.0.0
tags: [agents, registry]
status: living
---

# Agent Registry

## Core Agents

### OrchestrationAgent

- **Path:** `scripts/core/orchestration-agent.js`
- **Description:** Coordinates workflow steps across services
- **CLI Runnable:** No
- **Uses:** Logger, BaseAgent

### BackupOrchestrator

- **Path:** `scripts/core/backup-orchestrator.js`
- **Description:** Self-healing backup orchestrator
- **CLI Runnable:** No
- **Uses:** fs, EventEmitter, ensureFileAndDir

## Feature Agents

### GenerateChatSummary

- **Path:** `scripts/features/generate-chat-summary.js`
- **Description:** Generates a markdown summary of chat clusters
- **CLI Runnable:** Yes
- **Uses:** SemanticEngine, writeClusterSummary

### ChatlogParser

- **Path:** `scripts/features/chatlog-parser/index.js`
- **Description:** Parses chat logs to extract TODOs and bullet points
- **CLI Runnable:** Yes
- **Uses:** parseChatlog, generateDoc

### UploadServer

- **Path:** `scripts/features/upload-server.js`
- **Description:** Simple Express server for uploading files
- **CLI Runnable:** Yes
- **Uses:** express, multer

## Utility Agents

### EnsureFileAndDir

- **Path:** `shared/utils/ensureFileAndDir.js`
- **Description:** Utility to create files and directories if missing
- **CLI Runnable:** No
- **Uses:** fs, path

### GenerateRouteHash

- **Path:** `shared/utils/generateRouteHash.js`
- **Description:** Creates a deterministic hash for route objects
- **CLI Runnable:** No
- **Uses:** crypto
