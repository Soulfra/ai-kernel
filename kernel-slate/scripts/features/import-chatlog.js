#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { parseChatLog, messagesToConcepts } = require('./chatlog-utils');
const { SemanticEngine } = require('../core/semantic-engine');

async function run() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node import-chatlog.js <chatlog.txt|chatlog.md>');
    process.exit(1);
  }

  const text = fs.readFileSync(path.resolve(file), 'utf-8');
  const messages = parseChatLog(text);
  const concepts = messagesToConcepts(messages);

  const config = {
    vectorStore: {},
    graphStore: {},
    embedding: {},
    clustering: { minClusterSize: 2, minSamples: 1 },
    relationship: {},
    validation: {}
  };

  const engine = new SemanticEngine(config);

  for (const concept of concepts) {
    await engine.addConcept(concept);
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
