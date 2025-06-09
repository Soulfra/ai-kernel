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
  const clusters = loadClusters();
  const decayed = clusters.filter(c => c.badges && c.badges.includes('Decayed'));
  const revived = clusters.filter(c => c.badges && c.badges.includes('revived'));
  const mostRevived = clusters.slice().sort((a, b) => (b.revivalCount || 0) - (a.revivalCount || 0)).slice(0, 5);
  console.log(`Decay/Revival Analytics:`);
  console.log(`- Total clusters: ${clusters.length}`);
  console.log(`- Decayed clusters: ${decayed.length}`);
  console.log(`- Revived clusters: ${revived.length}`);
  console.log(`- Most revived clusters:`);
  mostRevived.forEach((c, i) => {
    if ((c.revivalCount || 0) > 0) {
      console.log(`  #${i}: "${c.label}" | Revival Count: ${c.revivalCount} | Current Tier: ${c.tier}`);
    }
  });
  // Comeback stories: clusters that were decayed and are now high tier
  const comebacks = clusters.filter(c => (c.revivalCount || 0) > 0 && c.tier > 10);
  if (comebacks.length) {
    console.log(`- Comeback clusters (revived and now tier > 10):`);
    comebacks.forEach(c => {
      console.log(`  "${c.label}" | Tier: ${c.tier} | Revival Count: ${c.revivalCount}`);
    });
  }
}

if (require.main === module) main(); 