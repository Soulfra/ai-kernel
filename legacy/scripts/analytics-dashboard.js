#!/usr/bin/env node
// Analytics Dashboard CLI: Cluster health, contributor stats, system metrics
const fs = require('fs');
const path = require('path');

const CLUSTERS_FILE = process.env.CLUSTERS_FILE || './clusters/clusters.json';
const LOG_FILE = process.env.LOG_FILE || './logs/analytics-dashboard.log';

function log(message) {
  const entry = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, entry);
}

function loadClusters() {
  if (!fs.existsSync(CLUSTERS_FILE)) return {};
  return JSON.parse(fs.readFileSync(CLUSTERS_FILE, 'utf8'));
}

function clusterHealth(clusters) {
  const stats = { total: 0, decaying: 0, revived: 0 };
  Object.values(clusters).forEach(items => {
    stats.total += items.length;
    items.forEach(item => {
      if (item.status === 'decaying') stats.decaying++;
      if (item.status === 'revived') stats.revived++;
    });
  });
  return stats;
}

function contributorStats(clusters) {
  const contributors = {};
  Object.values(clusters).forEach(items => {
    items.forEach(item => {
      if (item.contributor) {
        contributors[item.contributor] = (contributors[item.contributor] || 0) + 1;
      }
    });
  });
  return contributors;
}

function showDashboard() {
  const clusters = loadClusters();
  const health = clusterHealth(clusters);
  const contributors = contributorStats(clusters);
  console.log('--- Analytics Dashboard ---');
  console.log(`Total Concepts: ${health.total}`);
  console.log(`Decaying: ${health.decaying}`);
  console.log(`Revived: ${health.revived}`);
  console.log('Top Contributors:');
  Object.entries(contributors)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([name, count], i) => {
      console.log(`${i + 1}. ${name}: ${count}`);
    });
  // TODO: Add more system metrics, trends, and visualizations
}

function main() {
  log('Analytics dashboard viewed.');
  showDashboard();
}

if (require.main === module) main();
// TODO: Add web UI, advanced analytics, and error handling 