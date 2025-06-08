#!/usr/bin/env node
const path = require('path');
const { SemanticEngine } = require('../core/semantic-engine');
const { writeClusterSummary } = require('./cluster-utils');

async function run() {
  const engine = new SemanticEngine({
    vectorStore: {},
    graphStore: {},
    embedding: {},
    clustering: { minClusterSize: 2, minSamples: 1 },
    relationship: {},
    validation: {}
  });

  const out = path.resolve(__dirname, '../..', 'docs', 'chat-summary.md');
  writeClusterSummary(engine, out);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
