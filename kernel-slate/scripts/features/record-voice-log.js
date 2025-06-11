#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { randomUUID } = require('crypto');
const { Configuration, OpenAIApi } = require('openai');
const { SemanticEngine } = require('../core/semantic-engine');

const repoRoot = path.resolve(__dirname, '../..');
const tmpDir = path.join(repoRoot, 'tmp');
fs.mkdirSync(tmpDir, { recursive: true });
const audioFile = path.join(tmpDir, 'voice-log.wav');

function recordAudio() {
  return new Promise((resolve, reject) => {
    const cmd = 'ffmpeg';
    const args = ['-y', '-f', 'pulse', '-i', 'default', '-t', '30', audioFile];
    const rec = spawn(cmd, args, { stdio: 'inherit' });
    rec.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error('Recording failed'));
    });
  });
}

async function transcribe() {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY required');
  const conf = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
  const openai = new OpenAIApi(conf);
  const resp = await openai.createTranscription(
    fs.createReadStream(audioFile),
    'whisper-1'
  );
  return resp.data.text.trim();
}

async function addConcept(text) {
  const config = {
    vectorStore: {},
    graphStore: {},
    embedding: {},
    clustering: {},
    relationship: {},
    validation: {}
  };
  const engine = new SemanticEngine(config);
  const concept = {
    id: randomUUID(),
    type: 'voice_input',
    content: text,
    metadata: { timestamp: new Date().toISOString() }
  };
  await engine.addConcept(concept);
  return concept;
}

async function main() {
  const shouldRecord = !process.argv[2];
  if (shouldRecord) {
    console.log('Recording 30s voice memo...');
    await recordAudio();
  } else {
    fs.copyFileSync(path.resolve(process.argv[2]), audioFile);
  }
  const text = await transcribe();
  const concept = await addConcept(text);
  console.log('Transcribed text:\n', text);
  if (process.argv.includes('--cluster')) {
    console.log('Clustering not implemented in this demo');
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
