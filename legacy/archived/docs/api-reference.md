---
title: API & CLI Reference
description: Reference for API endpoints and CLI commands in CLARITY_ENGINE.
lastUpdated: 2025-06-03
version: 1.0.0
---

# API & CLI Reference

## API Endpoints
- `GET /api/clusters` — List all clusters
- `GET /api/docs` — List all documents
- `POST /api/submit` — Submit new knowledge
- `GET /api/analytics` — Get analytics data
- `POST /api/vote` — Upvote/downvote a cluster

## CLI Commands
- `npm run intake` — Run intake daemon
- `npm run extract` — Run extraction script
- `npm run cluster` — Run clustering script
- `npm run index` — Run indexing script
- `npm run validate` — Run all validation scripts
- `npm run analytics` — Launch analytics dashboard
- `npm run gamify` — Launch gamification CLI
- `npm run backup` — Create backup
- `npm run rollback` — Rollback to previous state

## Usage Examples
```sh
# Submit a new document via API
curl -X POST -F file=@mydoc.md http://localhost:3000/api/submit

# Upvote a cluster via CLI
echo "cluster-id" | npm run gamify -- upvote
``` 