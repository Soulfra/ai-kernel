#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { Configuration, OpenAIApi } = require('openai');
const { SemanticEngine } = require('../core/semantic-engine');

const watchDir = '/voice';
fs.mkdirSync(watchDir, { recursive: true });

if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY required');
  process.exit(1);
}

const conf = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
const openai = new OpenAIApi(conf);

async function transcribe(file) {
  const resp = await openai.createTranscription(
    fs.createReadStream(file),
    'whisper-1'
  );
  return resp.data.text.trim();
}

async function addConcept(text, file) {
  const engine = new SemanticEngine({
    vectorStore: {},
    graphStore: {},
    embedding: {},
    clustering: {},
    relationship: {},
    validation: {}
  });
  const concept = {
    id: randomUUID(),
    type: 'voice_input',
    content: text,
    metadata: { file: path.basename(file), timestamp: new Date().toISOString() }
  };
  await engine.addConcept(concept);
}

const processed = new Set();

async function handle(file) {
  try {
    const text = await transcribe(file);
    await addConcept(text, file);
    fs.unlinkSync(file);
    console.log(`[✓] Processed ${path.basename(file)}`);
  } catch (err) {
    processed.delete(file);
    console.error('Failed to process', file, err.message);
  }
}

function scan() {
  const files = fs.readdirSync(watchDir).filter(f => /\.(wav|mp3)$/i.test(f));
  for (const f of files) {
    const full = path.join(watchDir, f);
    if (processed.has(full)) continue;
    processed.add(full);
    handle(full);
  }
}

function watch() {
  scan();
  fs.watch(watchDir, () => setTimeout(scan, 300));
}

if (require.main === module) {
  watch();
}

module.exports = { watch };
