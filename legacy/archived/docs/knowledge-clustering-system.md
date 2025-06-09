---
title: Knowledge Clustering System
description: Living documentation for the self-organizing, tiered, gamified knowledge clustering and voting system in Clarity Engine.
lastUpdated: 2025-06-03T13:30:00Z
version: 1.1.0
tags: [knowledge, clustering, voting, gamification, automation]
status: stable
---

# Knowledge Clustering System

## Overview
A modular, self-organizing, and gamified knowledge clustering system. Concepts are clustered by semantic similarity, assigned a tier (1-100, logarithmic), and can be upvoted/downvoted by users or automation. The system is designed for traceability, anti-spam, and future extensibility.

## Full Workflow
1. **Concept Extraction & Clustering**: `semantic-concept-extractor.js`, `semantic-clusterer.js`
2. **Voting**: `semantic-cluster-vote.js` (upvote/downvote by index or label)
3. **Trending/Filtering**: `semantic-cluster-trending.js` (filter by active, decayed, revived)
4. **Decay & Revival**: Clusters decay if inactive; revive with `semantic-cluster-revive.js` (expedited growth, badges, traceability)
5. **Revival Suggestions**: `semantic-cluster-suggest-revival.js` (suggests top decayed clusters to rescue)
6. **Analytics**: `semantic-cluster-analytics.js` (decay/revival rates, comeback clusters)
7. **Automated Testing**: `semantic-cluster-test.js` (verifies all major flows)
8. **Automation Pipeline**: `semantic-cluster-automation.js` (runs the full pipeline, logs all actions)

## Usage Examples
- **Run full automation:**
  ```sh
  node scripts/semantic-cluster-automation.js --simulate-votes --decay-days=30
  ```
- **Vote on a cluster:**
  ```sh
  node scripts/semantic-cluster-vote.js upvote <clusterIndex|label>
  ```
- **See trending clusters:**
  ```sh
  node scripts/semantic-cluster-trending.js 10 upvotes active
  node scripts/semantic-cluster-trending.js 10 upvotes decayed
  node scripts/semantic-cluster-trending.js 10 upvotes revived
  ```
- **Suggest decayed clusters for revival:**
  ```sh
  node scripts/semantic-cluster-suggest-revival.js 5
  ```
- **Revive a decayed cluster:**
  ```sh
  node scripts/semantic-cluster-revive.js <clusterIndex|label>
  ```
- **Run analytics:**
  ```sh
  node scripts/semantic-cluster-analytics.js
  ```
- **Run the test suite:**
  ```sh
  node scripts/semantic-cluster-test.js
  ```

## Extension & Testing
- System is modular and can be extended with badges, trending, peer review, UI/CLI tools, and analytics
- Test by running on real/external datasets and analyzing cluster quality, tier distribution, voting, decay, and revival patterns

## How to Onboard
1. **Clone the repo and install dependencies**
2. **Run the full pipeline** with `semantic-cluster-automation.js`
3. **Explore clusters** with trending, analytics, and revival suggestion scripts
4. **Vote, revive, and test** using the provided CLI tools
5. **Review logs** in `project_meta/task_logs/main_task_log.json` for traceability
6. **Extend**: Add new scripts, badges, or UI as needed

## Related Scripts & Logs
- `scripts/semantic-concept-extractor.js`
- `scripts/semantic-clusterer.js`
- `scripts/semantic-cluster-vote.js`
- `scripts/semantic-cluster-trending.js`
- `scripts/semantic-cluster-revive.js`
- `scripts/semantic-cluster-suggest-revival.js`
- `scripts/semantic-cluster-analytics.js`
- `scripts/semantic-cluster-test.js`
- `scripts/semantic-cluster-automation.js`
- `project_meta/task_logs/main_task_log.json`
- `project_meta/plans/SEMANTIC_CLUSTERING_PLAN.md`

---
*Update this document as the system evolves and new features are added.* 