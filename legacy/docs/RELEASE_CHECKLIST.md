---
title: Release Checklist
description: Final checklist for open source or enterprise release.
lastUpdated: 2025-06-04
version: 1.0.0
---

# Release Checklist

## Documentation
- [ ] README.md is up to date (architecture, API keys, usage)
- [ ] Four-layer model documented (`docs/architecture/FOUR_LAYER_MODEL.md`)
- [ ] Plugin system and API documented (`plugins/README.md`)
- [ ] Batch runner usage documented (`docs/USAGE_BATCH_RUNNER.md`)

## Plugins & LLMs
- [ ] Example plugin(s) included (`plugins/example-llm-plugin.js`, `plugins/example-openai-plugin.js`)
- [ ] Plugins tested and working
- [ ] API keys set up via `.env.example` (not committed)

## Automation & Health
- [ ] System health check passes
- [ ] Batch runner produces results for real suggestions
- [ ] Errors and suggestions are surfaced in logs/dashboard

## Security
- [ ] `.env` is in `.gitignore`
- [ ] No secrets or API keys in code or git
- [ ] All dependencies are up to date

## Onboarding
- [ ] Onboarding docs and templates are available
- [ ] Clear instructions for adding plugins, API keys, and running automation

## Final Steps
- [ ] Run a full E2E test (health check, batch runner, plugin run)
- [ ] Review all logs and suggestions
- [ ] Tag and release! 