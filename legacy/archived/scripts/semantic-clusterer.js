#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const CONCEPT_MAP_FILE = path.join(__dirname, '../project_meta/semantic_concept_map.json');
const OUTPUT_FILE = path.join(__dirname, '../project_meta/semantic_clusters.json');
const SIMILARITY_THRESHOLD = 0.75; // 0-1, for fuzzy matching
const MIN_CLUSTER_SIZE = 3; // Minimum references to suggest a cluster

function loadConcepts() {
  if (!fs.existsSync(CONCEPT_MAP_FILE)) return [];
  return JSON.parse(fs.readFileSync(CONCEPT_MAP_FILE, 'utf8'));
}

function stringSimilarity(a, b) {
  // Robustly coerce to string, handle non-string/null/undefined
  const sA = (typeof a === 'string') ? a : (a !== undefined && a !== null ? String(a) : '');
  const sB = (typeof b === 'string') ? b : (b !== undefined && b !== null ? String(b) : '');
  if (!sA && !sB) return 0;
  // Simple Jaccard similarity for demo (can swap for better/faster algo or embeddings)
  const setA = new Set(sA.toLowerCase().split(/\W+/));
  const setB = new Set(sB.toLowerCase().split(/\W+/));
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

function getClusterTier(size) {
  // Logarithmic scale: minimum size for tier 1 is 3, for tier 100 is much larger
  if (size < 3) return 0;
  // log2 scale, 10x per 10 tiers, 100x per 20 tiers, etc.
  return Math.min(100, Math.floor(Math.log2(size / 3) * 10) + 1);
}

function getNextTierRequirement(size) {
  // What size is needed for the next tier?
  const currentTier = getClusterTier(size);
  if (currentTier >= 100) return null;
  // Invert getClusterTier to get next size threshold
  const nextTier = currentTier + 1;
  // size = 3 * 2^((tier-1)/10)
  const nextSize = Math.ceil(3 * Math.pow(2, (nextTier - 1) / 10));
  return nextSize > size ? nextSize : size + 1;
}

function clusterConcepts(concepts) {
  const clusters = [];
  const used = new Set();
  for (let i = 0; i < concepts.length; i++) {
    if (used.has(i)) continue;
    const c = concepts[i];
    const v1 = c.value || c.key || c.text || c.name || '';
    const cluster = [c];
    used.add(i);
    for (let j = i + 1; j < concepts.length; j++) {
      if (used.has(j)) continue;
      const c2 = concepts[j];
      const v2 = c2.value || c2.key || c2.text || c2.name || '';
      if (c.type === c2.type && stringSimilarity(v1, v2) >= SIMILARITY_THRESHOLD) {
        cluster.push(c2);
        used.add(j);
      }
    }
    if (cluster.length >= MIN_CLUSTER_SIZE) {
      const uniqueFiles = new Set(cluster.map(x => x.file));
      const density = uniqueFiles.size / cluster.length;
      const tier = getClusterTier(cluster.length);
      const nextTierRequirement = getNextTierRequirement(cluster.length);
      clusters.push({
        type: c.type,
        label: v1,
        count: cluster.length,
        files: Array.from(uniqueFiles),
        members: cluster,
        density,
        tier,
        nextTierRequirement, // Number of members needed for next tier
        upvotes: 0, // For voting system
        downvotes: 0 // For voting system
        // No recursive/meta-cluster: only base concepts, not clusters of clusters
      });
    }
  }
  return clusters;
}

function main() {
  const concepts = loadConcepts();
  if (!concepts.length) {
    console.error('No concepts found. Run semantic-concept-extractor.js first.');
    process.exit(1);
  }
  const clusters = clusterConcepts(concepts);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify({
    clusters,
    tiering: 'Cluster tiers are assigned logarithmically: 1-100. Each tier requires exponentially more members. nextTierRequirement shows the size needed for the next tier. upvotes/downvotes are for the voting system.'
  }, null, 2));
  console.log(`Clustered ${concepts.length} concepts into ${clusters.length} clusters (with up to 100 tiers).`);
  // TODO: Integrate with folder/tag suggestion, voting CLI/API, and ledger logging
}

if (require.main === module) main(); 