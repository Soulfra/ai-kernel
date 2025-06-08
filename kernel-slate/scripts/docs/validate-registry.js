#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..', '..');
const registryPath = path.join(rootDir, 'agent-registry.json');

if (!fs.existsSync(registryPath)) {
  console.error(`Registry file not found: ${registryPath}`);
  process.exit(1);
}

let registry;
try {
  const data = fs.readFileSync(registryPath, 'utf8');
  registry = JSON.parse(data);
} catch (err) {
  console.error(`Failed to read registry: ${err.message}`);
  process.exit(1);
}

if (!Array.isArray(registry)) {
  console.error('Registry must be an array of agent entries');
  process.exit(1);
}

const missing = [];
const noDescription = [];
const names = new Set();

for (const agent of registry) {
  if (agent.name) names.add(agent.name);
}

for (const agent of registry) {
  const agentPath = path.join(rootDir, agent.path || '');
  if (!agent.path || !fs.existsSync(agentPath)) {
    missing.push(agent.path);
  }
  if (!agent.description) {
    noDescription.push(agent.path);
  }
  if (agent.uses && Array.isArray(agent.uses)) {
    for (const u of agent.uses) {
      if (!names.has(u)) {
        console.warn(`Undeclared dependency: ${agent.path} uses ${u}`);
      }
    }
  }
}

const validCount = registry.length - missing.length;

if (missing.length === 0 && noDescription.length === 0) {
  console.log(`[✓] All ${registry.length} agents valid`);
} else {
  console.log(`[✓] ${validCount} agents valid`);
  if (missing.length > 0) {
    console.log(`[⚠️] Missing: ${missing.join(', ')}`);
  }
  if (noDescription.length > 0) {
    console.log(`[⚠️] No description: ${noDescription.join(', ')}`);
  }
}
