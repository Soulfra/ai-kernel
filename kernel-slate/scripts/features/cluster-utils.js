const fs = require('fs');
const path = require('path');

/**
 * Cluster concepts using the provided SemanticEngine.
 * Concepts will receive a `clusterId` in their metadata.
 * @param {Array<Object>} concepts
 * @param {SemanticEngine} engine
 * @returns {Promise<Array<{clusterId:string, topConcept:string, members:number}>>}
 */
async function clusterConcepts(concepts, engine) {
  const cluster = await engine.createCluster(concepts);
  const labelMap = new Map();
  cluster.labels.forEach((label, idx) => {
    if (!labelMap.has(label)) labelMap.set(label, []);
    labelMap.get(label).push(concepts[idx]);
  });
  const summary = [];
  for (const [label, items] of labelMap.entries()) {
    const id = `${cluster.id}-${label}`;
    items.forEach(c => { c.metadata.clusterId = id; });
    summary.push({ clusterId: id, topConcept: items[0].id, members: items.length });
  }
  // Attach for later summary
  cluster.concepts = concepts;
  engine.clusteringService.clusters.set(cluster.id, cluster);
  return summary;
}

/**
 * Generate a markdown summary of all clusters in the engine and save to filePath.
 */
function writeClusterSummary(engine, filePath) {
  let md = '# Chat Summary\n\n';
  for (const cluster of engine.clusteringService.clusters.values()) {
    const concepts = cluster.concepts || [];
    const text = concepts.map(c => c.content).join(' ').toLowerCase();
    const words = text.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
    const freq = {};
    words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
    const topWords = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([w]) => w)
      .join(', ');
    md += `## Cluster ${cluster.id}\n\n`;
    md += `- Messages: ${concepts.length}\n`;
    md += `- Key Themes: ${topWords}\n\n`;
  }
  fs.writeFileSync(path.resolve(filePath), md);
}

module.exports = { clusterConcepts, writeClusterSummary };
