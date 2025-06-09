#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const readline = require('readline');
const requireOrInstall = require('./utils/requireOrInstall');
const yaml = requireOrInstall('js-yaml');

const repoRoot = path.resolve(__dirname, '../..');
const rcFile = path.join(repoRoot, '.kernelrc.json');
const templatesDir = path.join(repoRoot, 'agent-templates');

function loadConfig() {
  if (fs.existsSync(rcFile)) {
    try {
      return JSON.parse(fs.readFileSync(rcFile, 'utf8'));
    } catch {
      return {};
    }
  }
  return {};
}

function saveConfig(cfg) {
  fs.writeFileSync(rcFile, JSON.stringify(cfg, null, 2));
}

function printAgentSummaries() {
  if (!fs.existsSync(templatesDir)) return;
  const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.yaml'));
  if (!files.length) return;
  console.log('\nDemo Agents Available:');
  for (const f of files) {
    try {
      const doc = yaml.load(fs.readFileSync(path.join(templatesDir, f), 'utf8'));
      console.log(`- ${doc.name}: ${doc.description}`);
    } catch {}
  }
  console.log('');
}

async function ask(rl, q) {
  return new Promise(resolve => rl.question(q, a => resolve(a.trim())));
}

async function run() {
  const config = loadConfig();
  if (config.onboarded) return;

  printAgentSummaries();

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const chatPath = await ask(rl, 'Path to chatlog to import (leave blank to skip): ');
  if (chatPath) {
    spawnSync('node', [path.join('kernel-slate/scripts/features/import-chatlog.js'), chatPath], { stdio: 'inherit', cwd: repoRoot });
    config.importedChatlog = chatPath;
  } else {
    config.importedChatlog = false;
  }

  const voice = await ask(rl, 'Record a voice memo now? (y/n): ');
  if (voice.toLowerCase().startsWith('y')) {
    spawnSync('node', [path.join('kernel-slate/scripts/features/record-voice-log.js')], { stdio: 'inherit', cwd: repoRoot });
    config.recordedVoice = true;
  } else {
    config.recordedVoice = false;
  }

  const install = await ask(rl, 'Install demo agents? (y/n): ');
  if (install.toLowerCase().startsWith('y')) {
    const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.yaml'));
    for (const f of files) {
      spawnSync('node', [path.join('kernel-slate/scripts/market/install-agent.js'), path.join('agent-templates', f)], { stdio: 'inherit', cwd: repoRoot });
    }
    config.installedDemoAgents = true;
  } else {
    config.installedDemoAgents = false;
  }

  config.onboarded = true;
  rl.close();
  saveConfig(config);
  console.log('Onboarding complete.');
}

if (require.main === module) {
  run();
}

module.exports = { run };
