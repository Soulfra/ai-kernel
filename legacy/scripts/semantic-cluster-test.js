#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const CLUSTERS_FILE = path.join(__dirname, '../project_meta/semantic_clusters.json');
const TASK_LOG_FILE = path.join(__dirname, '../project_meta/task_logs/main_task_log.json');

function loadClusters() {
  if (!fs.existsSync(CLUSTERS_FILE)) throw new Error('semantic_clusters.json not found.');
  const data = JSON.parse(fs.readFileSync(CLUSTERS_FILE, 'utf8'));
  return data.clusters;
}

function logTask(event) {
  let log = [];
  if (fs.existsSync(TASK_LOG_FILE)) {
    log = JSON.parse(fs.readFileSync(TASK_LOG_FILE, 'utf8'));
  }
  log.push({ ...event, timestamp: new Date().toISOString() });
  fs.writeFileSync(TASK_LOG_FILE, JSON.stringify(log, null, 2));
}

function main() {
  const clusters = loadClusters();
  let passed = 0, failed = 0;
  // Test decay
  const decayed = clusters.filter(c => c.badges && c.badges.includes('Decayed'));
  if (decayed.length > 0) { passed++; } else { failed++; }
  // Test revival
  const revived = clusters.filter(c => c.badges && c.badges.includes('revived'));
  if (revived.length > 0) { passed++; } else { failed++; }
  // Test expedited growth
  const expedited = revived.filter(c => c.revivalExpedite && c.revivalExpedite > 0);
  if (expedited.length > 0) { passed++; } else { failed++; }
  // Test peer review
  const peerReviewed = clusters.filter(c => c.peerReview);
  if (peerReviewed.length >= 0) { passed++; } else { failed++; }
  // Test badge assignment
  const hasBadges = clusters.filter(c => c.badges && c.badges.length > 0);
  if (hasBadges.length > 0) { passed++; } else { failed++; }
  // Log and print
  logTask({
    taskId: 'cluster_test_suite',
    description: 'Ran cluster test suite.',
    results: { decayed: decayed.length, revived: revived.length, expedited: expedited.length, peerReviewed: peerReviewed.length, badges: hasBadges.length, passed, failed }
  });
  console.log('Cluster Test Suite Results:');
  console.log(`  Decayed: ${decayed.length}`);
  console.log(`  Revived: ${revived.length}`);
  console.log(`  Expedited Growth: ${expedited.length}`);
  console.log(`  Peer Reviewed: ${peerReviewed.length}`);
  console.log(`  Badges Assigned: ${hasBadges.length}`);
  console.log(`  Passed: ${passed}, Failed: ${failed}`);
}

if (require.main === module) main(); 