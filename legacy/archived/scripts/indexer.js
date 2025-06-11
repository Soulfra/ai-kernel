// Indexing Script: Processes clusters from /clusters/, outputs index to /index/, logs actions via orchestrator
const fs = require('fs');
const path = require('path');
const { LogOrchestrator } = require('./core/log-orchestrator');
const { TelemetryManager } = require('./core/telemetry-manager');

const CLUSTERS_DIR = process.env.CLUSTERS_DIR || './clusters';
const INDEX_DIR = process.env.INDEX_DIR || './index';

function buildIndex(clusters) {
  // TODO: Implement advanced indexing/search
  // Placeholder: flatten clusters
  const index = [];
  Object.entries(clusters).forEach(([key, items]) => {
    items.forEach(({ file, concept }) => {
      index.push({ key, file, concept });
    });
  });
  return index;
}

async function processClusters(logger, telemetry) {
  const clustersFile = path.join(CLUSTERS_DIR, 'clusters.json');
  if (!fs.existsSync(clustersFile)) {
    logger.warn('No clusters.json found');
    logger.emit('task:event', { type: 'indexing_skipped', reason: 'no_clusters' });
    return;
  }
  try {
    const clusters = JSON.parse(fs.readFileSync(clustersFile, 'utf8'));
    const index = buildIndex(clusters);
    const outFile = path.join(INDEX_DIR, 'index.json');
    fs.writeFileSync(outFile, JSON.stringify(index, null, 2));
    logger.info('Indexed concepts', { count: index.length });
    telemetry.recordMetric('concepts_indexed', index.length);
    logger.emit('task:event', { type: 'concepts_indexed', count: index.length });
  } catch (e) {
    logger.error('Error indexing clusters', { error: e.message });
    telemetry.recordMetric('indexer_error', 1, { error: e.message });
    logger.emit('task:event', { type: 'indexer_error', error: e.message });
  }
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function main() {
  if (process.argv.includes('--help')) {
    console.log('Usage: node indexer.js [--help]\nProcesses clusters from /clusters/, outputs index to /index/.');
    process.exit(0);
  }
  const logger = new LogOrchestrator();
  const telemetry = new TelemetryManager();
  ensureDir(INDEX_DIR);
  await processClusters(logger, telemetry);
  logger.info('Indexing run complete');
  logger.emit('task:event', { type: 'indexing_complete' });
}

if (require.main === module) main();
// Documentation: All logging and error handling is via orchestrator/telemetry injection. Task events are emitted for traceability.

// TODO: Add advanced indexing, error handling, and search features 