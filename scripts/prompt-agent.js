#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const yaml = require('js-yaml');
const { ProviderRouter } = require('./core/provider-router');
const { ensureUser } = require('./core/user-vault');

async function ask(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(r => rl.question(q, a => { rl.close(); r(a); }));
}

async function main() {
  const user = process.argv[2];
  let prompt = process.argv.slice(3).join(' ');
  if (!user) {
    console.log('Usage: node prompt-agent.js <user> [prompt]');
    process.exit(1);
  }
  ensureUser(user);
  if (!prompt) prompt = await ask('Prompt: ');
  const repoRoot = path.resolve(__dirname, '..');
  const tFile = path.join(repoRoot, 'vault-prompts', user, 'claude-transcripts.json');
  let transcript = '';
  if (fs.existsSync(tFile)) {
    try { const arr = JSON.parse(fs.readFileSync(tFile, 'utf8')); transcript = arr.length ? arr[arr.length-1].text : ''; } catch {}
  }
  const router = new ProviderRouter();
  const fullPrompt = `Voice Transcript: ${transcript}\nPrompt: ${prompt}\nRespond with .idea.yaml`;
  const { text } = await router.callAnthropic(fullPrompt);
  const idea = (()=>{ try { return yaml.load(text) || {}; } catch { return {}; }})();
  const ideaOut = path.join(repoRoot, 'vault', user, 'suggested-next.json');
  fs.mkdirSync(path.dirname(ideaOut), { recursive: true });
  fs.writeFileSync(ideaOut, JSON.stringify(idea, null, 2));
  const logDir = path.join(repoRoot, 'vault-prompts', user);
  fs.mkdirSync(logDir, { recursive: true });
  fs.writeFileSync(path.join(logDir, 'claude-reflection.json'), JSON.stringify({ prompt: fullPrompt, response: text, timestamp: new Date().toISOString() }, null, 2));
  console.log('Idea saved to', ideaOut);
}

if (require.main === module) {
  main().catch(err => { console.error(err); process.exit(1); });
}

module.exports = { main };
