#!/usr/bin/env node
/**
 * semantic-cluster-revive.js
 *
 * Revive a decayed/archived cluster by index or label.
 * Usage:
 *   node scripts/semantic-cluster-revive.js <clusterIndex|label>
 *
 * On revival:
 *   - Sets tier to 50% of previous max tier (not below 2)
 *   - Removes 'Decayed' badge, resets lastVoted to now
 *   - Adds 'revived' badge, increments revivalCount
 *   - Optionally, lowers nextTierRequirement for first 5 upvotes
 *   - Logs the revival event to the task log
 *   - Prints new status and how to re-engage the cluster
 */
const fs = require('fs');
const path = require('path');

const CLUSTERS_FILE = path.join(__dirname, '../project_meta/semantic_clusters.json');
const TASK_LOG_FILE = path.join(__dirname, '../project_meta/task_logs/main_task_log.json');

function loadClusters() {
  if (!fs.existsSync(CLUSTERS_FILE)) throw new Error('semantic_clusters.json not found.');
  const data = JSON.parse(fs.readFileSync(CLUSTERS_FILE, 'utf8'));
  return data.clusters;
}

function saveClusters(clusters) {
  const data = {
    clusters,
    tiering: 'Cluster tiers are assigned logarithmically: 1-100. Each tier requires exponentially more members. nextTierRequirement shows the size needed for the next tier. upvotes/downvotes are for the voting system.'
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

function findCluster(clusters, arg) {
  if (/^\d+$/.test(arg)) return clusters[parseInt(arg, 10)];
  return clusters.find(c => c.label && c.label.toLowerCase() === arg.toLowerCase());
}

function main() {
  const [,, clusterArg] = process.argv;
  if (!clusterArg) {
    console.log('Usage: node scripts/semantic-cluster-revive.js <clusterIndex|label>');
    process.exit(1);
  }
  const clusters = loadClusters();
  const cluster = findCluster(clusters, clusterArg);
  if (!cluster) {
    console.error('Cluster not found:', clusterArg);
    process.exit(1);
  }
  if (!cluster.badges || !cluster.badges.includes('Decayed')) {
    console.log('Cluster is not decayed and does not need revival.');
    process.exit(0);
  }
  // Revival logic
  const prevTier = cluster.tier || 2;
  const revivedTier = Math.max(2, Math.floor(prevTier * 0.5));
  cluster.tier = revivedTier;
  cluster.lastVoted = new Date().toISOString();
  cluster.badges = (cluster.badges || []).filter(b => b !== 'Decayed');
  cluster.badges.push('revived');
  cluster.revivalCount = (cluster.revivalCount || 0) + 1;
  // Expedite: lower nextTierRequirement for first 5 upvotes after revival
  cluster.nextTierRequirement = Math.max(cluster.count + 1, cluster.count + 2); // Lowered for quick growth
  cluster.revivalExpedite = 5; // Number of upvotes to expedite
  // Log event
  logTask({
    taskId: 'cluster_revival',
    description: `Revived cluster '${cluster.label}' from tier ${prevTier} to ${revivedTier}.`,
    clusterLabel: cluster.label,
    prevTier,
    revivedTier,
    revivalCount: cluster.revivalCount
  });
  saveClusters(clusters);
  console.log(`Cluster "${cluster.label}" revived! Now at tier ${revivedTier} (was ${prevTier}).`);
  console.log(`It will grow faster for the next ${cluster.revivalExpedite} upvotes. Encourage engagement to restore its status!`);
}

if (require.main === module) main(); 