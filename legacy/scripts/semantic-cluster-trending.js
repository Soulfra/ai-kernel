#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const CLUSTERS_FILE = path.join(__dirname, '../project_meta/semantic_clusters.json');

function loadClusters() {
  if (!fs.existsSync(CLUSTERS_FILE)) throw new Error('semantic_clusters.json not found.');
  const data = JSON.parse(fs.readFileSync(CLUSTERS_FILE, 'utf8'));
  return data.clusters;
}

function main() {
  const [,, topNArg, sortByArg, filterArg] = process.argv;
  const topN = parseInt(topNArg, 10) || 10;
  const sortBy = sortByArg || 'upvotes';
  const filter = filterArg || 'all';
  const clusters = loadClusters();
  let filtered = clusters;
  if (filter === 'decayed') {
    filtered = clusters.filter(c => c.badges && c.badges.includes('Decayed'));
  } else if (filter === 'revived') {
    filtered = clusters.filter(c => c.badges && c.badges.includes('revived'));
  } else if (filter === 'active') {
    filtered = clusters.filter(c => !c.badges || (!c.badges.includes('Decayed') && !c.badges.includes('revived')));
  }
  let sorted;
  if (sortBy === 'tier') {
    sorted = filtered.slice().sort((a, b) => (b.tier || 0) - (a.tier || 0));
  } else if (sortBy === 'density') {
    sorted = filtered.slice().sort((a, b) => (b.density || 0) - (a.density || 0));
  } else {
    // Default: upvotes, then tier, then density
    sorted = filtered.slice().sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0) || (b.tier || 0) - (a.tier || 0) || (b.density || 0) - (a.density || 0));
  }
  console.log(`Top ${topN} trending clusters (sorted by ${sortBy}, filter: ${filter}):`);
  for (let i = 0; i < Math.min(topN, sorted.length); i++) {
    const c = sorted[i];
    console.log(`#${i}: "${c.label}" | Tier: ${c.tier} | Upvotes: ${c.upvotes} | Downvotes: ${c.downvotes} | Density: ${c.density.toFixed(2)} | Members: ${c.count} | Badges: ${(c.badges||[]).join(',')}`);
  }
}

if (require.main === module) main(); 