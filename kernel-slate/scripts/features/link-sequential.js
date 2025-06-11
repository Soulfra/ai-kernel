const { randomUUID } = require('crypto');

/**
 * Link concepts sequentially with `follows_from` relationships.
 * Skips links when roles differ or clusterIds differ.
 * @param {Array<Object>} concepts - Concepts ordered chronologically
 * @param {SemanticEngine} engine - SemanticEngine instance
 */
async function linkSequential(concepts, engine) {
  for (let i = 0; i < concepts.length - 1; i++) {
    const a = concepts[i];
    const b = concepts[i + 1];
    if (a.metadata.role !== b.metadata.role) continue;
    if (a.metadata.clusterId && b.metadata.clusterId && a.metadata.clusterId !== b.metadata.clusterId) continue;
    const rel = {
      id: randomUUID(),
      type: 'follows_from',
      source: a.id,
      target: b.id,
      strength: 1,
      confidence: 0.9,
      metadata: {}
    };
    await engine.addRelationship(rel);
  }
}

module.exports = linkSequential;
