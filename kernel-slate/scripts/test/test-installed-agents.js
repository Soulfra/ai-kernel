#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const yaml = require('js-yaml');

const repoRoot = path.resolve(__dirname, '../..');
const registryFile = path.join(repoRoot, 'installed-agents.json');
const healthFile = path.join(repoRoot, 'kernel-slate/docs/agent-health.md');

function loadRegistry() {
  return fs.existsSync(registryFile)
    ? JSON.parse(fs.readFileSync(registryFile, 'utf8'))
    : [];
}

function runTest(configPath) {
  const doc = yaml.load(fs.readFileSync(configPath, 'utf8'));
  if (!doc.test) return 'skipped';
  try {
    execSync(doc.test, { stdio: 'inherit', shell: true });
    return 'pass';
  } catch {
    return 'fail';
  }
}

function main() {
  const agents = loadRegistry();
  const results = [];
  for (const agent of agents) {
    if (!agent.config || !fs.existsSync(agent.config)) continue;
    const result = runTest(agent.config);
    results.push({ name: agent.name, result });
  }
  let md = '# Agent Health\n';
  for (const r of results) {
    md += `- ${r.name}: ${r.result}\n`;
  }
  fs.writeFileSync(healthFile, md);
  console.log(`Wrote ${results.length} results to ${healthFile}`);
}

if (require.main === module) {
  main();
}

module.exports = { main };
