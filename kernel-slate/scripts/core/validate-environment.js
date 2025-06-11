#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const requireOrInstall = require('./utils/requireOrInstall');
const yaml = requireOrInstall('js-yaml');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const repoRoot = path.resolve(__dirname, '../..');
const registryFile = path.join(repoRoot, 'installed-agents.json');

function checkCommand(cmd) {
  try {
    execSync(`which ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function loadAgents() {
  return fs.existsSync(registryFile)
    ? JSON.parse(fs.readFileSync(registryFile, 'utf8'))
    : [];
}

function ensureEnv(keys) {
  const missing = [];
  for (const key of keys) {
    if (!process.env[key]) missing.push(key);
  }
  return missing;
}

function main() {
  const deps = ['python3', 'docker', 'ffmpeg'];
  const missingDeps = deps.filter(d => !checkCommand(d));

  const agents = loadAgents();
  const missingVars = new Set();
  const requiredEnv = [
    'OPENAI_API_KEY',
    'STRIPE_API_KEY',
    'ANTHROPIC_API_KEY',
    'OLLAMA_MODEL'
  ];

  ensureEnv(requiredEnv).forEach(k => missingVars.add(k));
  for (const agent of agents) {
    if (!agent.config || !fs.existsSync(agent.config)) continue;
    const doc = yaml.load(fs.readFileSync(agent.config, 'utf8'));
    if (doc.required_api_keys) {
      ensureEnv(doc.required_api_keys).forEach(k => missingVars.add(k));
    }
  }

  if (missingDeps.length) {
    console.warn('Missing system dependencies:', missingDeps.join(', '));
  }
  if (missingVars.size) {
    console.warn('Missing environment variables:', Array.from(missingVars).join(', '));
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
