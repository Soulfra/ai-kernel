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
  const [,, nArg] = process.argv;
  const N = parseInt(nArg, 10) || 5;
  const clusters = loadClusters();
  // Filter decayed clusters
  const decayed = clusters.filter(c => c.badges && c.badges.includes('Decayed'));
  // Sort by previous tier (if available), then by count
  decayed.sort((a, b) => (b.prevTier || b.tier || 0) - (a.prevTier || a.tier || 0) || (b.count || 0) - (a.count || 0));
  console.log(`Top ${N} decayed clusters to consider for revival:`);
  for (let i = 0; i < Math.min(N, decayed.length); i++) {
    const c = decayed[i];
    console.log(`#${i}: "${c.label}" | Previous Tier: ${c.prevTier || c.tier} | Members: ${c.count} | Revival Count: ${c.revivalCount || 0}`);
  }
}

if (require.main === module) main(); 