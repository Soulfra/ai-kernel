---
title: Gamification & Analytics
description: Documentation for the Gamification & Analytics module.
lastUpdated: 2025-06-03
version: 1.0.0
---

# Gamification & Analytics

## Overview
Provides voting, peer review, badges, and analytics dashboards for clusters and contributors.

## Input
- User actions (votes, reviews)
- Data from `/index/`, `/clusters/`, `/docs/`

## Output
- Analytics dashboards, badges, and reports (to `/docs/`)
- Logs to `/logs/`

## Anti-Recursion
- Never triggers pipeline processing
- Only analyzes and reports 