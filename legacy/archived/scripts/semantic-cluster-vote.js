#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const CLUSTERS_FILE = path.join(__dirname, '../project_meta/semantic_clusters.json');

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

function findCluster(clusters, arg) {
  if (/^\d+$/.test(arg)) return clusters[parseInt(arg, 10)];
  // Otherwise, search by label (case-insensitive)
  return clusters.find(c => c.label && c.label.toLowerCase() === arg.toLowerCase());
}

function main() {
  const [,, action, clusterArg] = process.argv;
  if (!['upvote', 'downvote'].includes(action) || !clusterArg) {
    console.log('Usage: node scripts/semantic-cluster-vote.js upvote <clusterIndex|label>');
    console.log('       node scripts/semantic-cluster-vote.js downvote <clusterIndex|label>');
    process.exit(1);
  }
  const clusters = loadClusters();
  const cluster = findCluster(clusters, clusterArg);
  if (!cluster) {
    console.error('Cluster not found:', clusterArg);
    process.exit(1);
  }
  if (action === 'upvote') {
    cluster.upvotes = (cluster.upvotes || 0) + 1;
  } else {
    cluster.downvotes = (cluster.downvotes || 0) + 1;
  }
  saveClusters(clusters);
  console.log(`Cluster "${cluster.label}" (tier ${cluster.tier}) now has ${cluster.upvotes} upvotes and ${cluster.downvotes} downvotes.`);
}

if (require.main === module) main(); 