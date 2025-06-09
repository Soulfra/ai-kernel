#!/usr/bin/env node
/**
 * semantic-cluster-automation.js
 *
 * Master automation script for the knowledge clustering system.
 *
 * Usage:
 *   node scripts/semantic-cluster-automation.js [--simulate-votes] [--backtest] [--decay-days=N]
 *
 * Features:
 *   - Runs concept extraction, clustering, trending
 *   - Optionally simulates random voting
 *   - Updates badges (milestone tiers, most upvoted)
 *   - Tracks 'lastVoted' timestamp for each cluster
 *   - Applies decay logic based on lastVoted (not just upvotes)
 *   - Adds 'peerReview' field: clusters above tier 50 require at least 3 unique upvoters
 *   - Logs all major actions/results to the task log
 *   - Outputs summary report
 *   - All fields and logic are traceable and extensible
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CLUSTERS_FILE = path.join(__dirname, '../project_meta/semantic_clusters.json');
const TASK_LOG_FILE = path.join(__dirname, '../project_meta/task_logs/main_task_log.json');
const BADGE_TIERS = [10, 25, 50, 100];
const DECAY_DAYS_DEFAULT = 30;

function runScript(cmd) {
  console.log(`Running: ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

function loadClusters() {
  if (!fs.existsSync(CLUSTERS_FILE)) throw new Error('semantic_clusters.json not found.');
  const data = JSON.parse(fs.readFileSync(CLUSTERS_FILE, 'utf8'));
  return data.clusters;
}

function saveClusters(clusters) {
  const data = {
    clusters,
    tiering: 'Cluster tiers are assigned logarithmically: 1-100. Each tier requires exponentially more members. nextTierRequirement shows the size needed for the next tier. upvotes/downvotes are for the voting system. lastVoted is the timestamp of the last upvote. peerReview is required for tier > 50.'
  };
  fs.writeFileSync(CLUSTERS_FILE, JSON.stringify(data, null, 2));
}

function logTask(event) {
  let log = [];
  if (fs.existsSync(TASK_LOG_FILE)) {
    log = JSON.parse(fs.readFileSync(TASK_LOG_FILE, 'utf8'));
  }
  log.push({ ...event, timestamp: new Date().toISOString() });
  fs.writeFileSync(TASK_LOG_FILE, JSON.stringify(log, null, 2));
}

function updateBadges(clusters) {
  // Milestone tier badges
  for (const c of clusters) {
    c.badges = c.badges || [];
    for (const t of BADGE_TIERS) {
      if (c.tier >= t && !c.badges.includes(`Tier ${t}+`)) {
        c.badges.push(`Tier ${t}+`);
      }
    }
  }
  // Most upvoted badge
  const maxUpvotes = Math.max(...clusters.map(c => c.upvotes || 0));
  for (const c of clusters) {
    if ((c.upvotes || 0) === maxUpvotes && maxUpvotes > 0 && !c.badges.includes('Most Upvoted')) {
      c.badges.push('Most Upvoted');
    }
  }
}

function applyDecay(clusters, decayDays) {
  const now = Date.now();
  let decayed = 0;
  for (const c of clusters) {
    // Only decay if lastVoted is older than decayDays
    if (c.tier > 1) {
      const lastVoted = c.lastVoted ? new Date(c.lastVoted).getTime() : 0;
      const daysSinceVote = (now - lastVoted) / (1000 * 60 * 60 * 24);
      if ((!c.lastVoted || daysSinceVote > decayDays)) {
        c.tier = Math.max(1, c.tier - 1);
        c.badges = c.badges || [];
        c.badges.push('Decayed');
        decayed++;
        logTask({
          taskId: 'auto_decay_event',
          description: `Cluster '${c.label}' decayed due to inactivity (lastVoted: ${c.lastVoted || 'never'}).`,
          clusterLabel: c.label,
          tier: c.tier
        });
      }
    }
  }
  return decayed;
}

function simulateVotes(clusters, n = 100) {
  // Simulate unique upvoters for peer review
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * clusters.length);
    const userId = `user_${Math.floor(Math.random() * 20)}`;
    clusters[idx].upvotes = (clusters[idx].upvotes || 0) + 1;
    clusters[idx].lastVoted = new Date().toISOString();
    clusters[idx].upvoters = clusters[idx].upvoters || [];
    if (!clusters[idx].upvoters.includes(userId)) clusters[idx].upvoters.push(userId);
  }
}

function updatePeerReview(clusters) {
  let reviewed = 0;
  for (const c of clusters) {
    if (c.tier > 50) {
      c.upvoters = c.upvoters || [];
      c.peerReview = c.upvoters.length >= 3;
      if (c.peerReview) reviewed++;
      logTask({
        taskId: 'auto_peer_review',
        description: `Peer review for cluster '${c.label}': ${c.peerReview ? 'PASSED' : 'FAILED'} (${c.upvoters.length} unique upvoters).`,
        clusterLabel: c.label,
        tier: c.tier,
        peerReview: c.peerReview
      });
    } else {
      c.peerReview = undefined;
    }
  }
  return reviewed;
}

function summaryReport(clusters) {
  const tierCounts = {};
  for (const c of clusters) {
    tierCounts[c.tier] = (tierCounts[c.tier] || 0) + 1;
  }
  const badgeCounts = {};
  for (const c of clusters) {
    if (c.badges) for (const b of c.badges) badgeCounts[b] = (badgeCounts[b] || 0) + 1;
  }
  const peerReviewed = clusters.filter(c => c.peerReview).length;
  const topClusters = clusters.slice().sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0)).slice(0, 5);
  return {
    totalClusters: clusters.length,
    tierCounts,
    badgeCounts,
    peerReviewed,
    topClusters: topClusters.map(c => ({ label: c.label, tier: c.tier, upvotes: c.upvotes, badges: c.badges, peerReview: c.peerReview }))
  };
}

function main() {
  const args = process.argv.slice(2);
  const simulateVotesFlag = args.includes('--simulate-votes');
  const backtestFlag = args.includes('--backtest');
  const decayArg = args.find(a => a.startsWith('--decay-days='));
  const decayDays = decayArg ? parseInt(decayArg.split('=')[1], 10) : DECAY_DAYS_DEFAULT;

  // 1. Run concept extractor and clustering
  if (!backtestFlag) {
    runScript('node scripts/semantic-concept-extractor.js');
  }
  runScript('node scripts/semantic-clusterer.js');

  // 2. Optionally simulate voting
  let clusters = loadClusters();
  if (simulateVotesFlag) {
    simulateVotes(clusters, 200);
    logTask({
      taskId: 'auto_vote_simulation',
      description: 'Simulated random voting on clusters.'
    });
  }

  // 3. Update badges
  updateBadges(clusters);
  logTask({
    taskId: 'auto_badge_update',
    description: 'Updated badges for milestone tiers and most upvoted clusters.'
  });

  // 4. Peer review for high-tier clusters
  const reviewed = updatePeerReview(clusters);
  if (reviewed > 0) {
    logTask({
      taskId: 'auto_peer_review_summary',
      description: `Peer review completed for ${reviewed} clusters above tier 50.`
    });
  }

  // 5. Apply decay logic
  const decayed = applyDecay(clusters, decayDays);
  if (decayed > 0) {
    logTask({
      taskId: 'auto_decay',
      description: `Applied decay logic to clusters. ${decayed} clusters decayed.`
    });
  }

  // 6. Save clusters
  saveClusters(clusters);

  // 7. Run trending script and output summary
  runScript('node scripts/semantic-cluster-trending.js 10 upvotes');
  const summary = summaryReport(clusters);
  console.log('---\nSummary Report:', JSON.stringify(summary, null, 2));
  logTask({
    taskId: 'auto_summary_report',
    description: 'Generated summary report for clustering automation.',
    result: summary
  });
}

if (require.main === module) main(); 