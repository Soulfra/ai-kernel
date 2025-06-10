const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { randomUUID } = require('crypto');
const { Configuration, OpenAIApi } = require('openai');
const { reflect } = require('../agents/reflection-agent');
const { ensureUser } = require('../core/user-vault');

async function transcribe(file) {
  if (process.env.OPENAI_API_KEY) {
    const conf = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
    const openai = new OpenAIApi(conf);
    const resp = await openai.createTranscription(fs.createReadStream(file), 'whisper-1');
    return resp.data.text.trim();
  }
  const res = spawnSync('whisper', [file, '--model', 'base', '--output_format', 'txt']);
  if (res.status === 0) {
    const txt = file.replace(/\.[^.]+$/, '.txt');
    try { return fs.readFileSync(txt, 'utf8').trim(); } catch {}
  }
  throw new Error('Transcription failed');
}

async function main() {
  const file = process.argv[2];
  const user = process.argv[3] || 'demo';
  if (!file) {
    console.log('Usage: node claude-voice.js <voice-file> [user]');
    process.exit(1);
  }
  ensureUser(user);
  const text = await transcribe(file);
  const suggestion = reflect(user);

  const repoRoot = path.resolve(__dirname, '..', '..');
  const voiceLog = path.join(repoRoot, 'vault', user, 'voice-log.json');
  const transcripts = path.join(repoRoot, 'vault-prompts', user, 'claude-transcripts.json');
  const id = randomUUID();
  const entry = { id, timestamp: new Date().toISOString(), file: path.basename(file), text };

  let arr = [];
  if (fs.existsSync(voiceLog)) { try { arr = JSON.parse(fs.readFileSync(voiceLog, 'utf8')); } catch {} }
  arr.push(entry);
  fs.mkdirSync(path.dirname(voiceLog), { recursive: true });
  fs.writeFileSync(voiceLog, JSON.stringify(arr, null, 2));

  let tarr = [];
  if (fs.existsSync(transcripts)) { try { tarr = JSON.parse(fs.readFileSync(transcripts, 'utf8')); } catch {} }
  tarr.push({ id, text, timestamp: entry.timestamp });
  fs.mkdirSync(path.dirname(transcripts), { recursive: true });
  fs.writeFileSync(transcripts, JSON.stringify(tarr, null, 2));

  console.log(JSON.stringify({ text, suggestion }, null, 2));
}

if (require.main === module) {
  main().catch(err => { console.error(err); process.exit(1); });
}

module.exports = { transcribe, main };
