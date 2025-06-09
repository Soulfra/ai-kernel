---
title: API Server
description: Documentation for the API Server module.
lastUpdated: 2025-06-03
version: 1.0.0
---

# API Server

## Overview
Exposes REST/gRPC endpoints for querying clusters, docs, analytics, and submitting new knowledge.

## Input
- API requests from users or external systems

## Output
- API responses (data from `/index/`, `/clusters/`, `/docs/`)
- Logs to `/logs/`

## Anti-Recursion
- Never triggers pipeline processing
- Only serves data and records events 