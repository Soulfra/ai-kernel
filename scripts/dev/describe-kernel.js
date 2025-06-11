#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const requireOrInstall = require('../core/utils/requireOrInstall');
const yaml = requireOrInstall('js-yaml');

function readJSON(file) {
  if (!fs.existsSync(file)) return null;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function readYAML(file) {
  if (!fs.existsSync(file)) return null;
  try { return yaml.load(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function findAgentYamls(dir) {
  const out = [];
  function walk(d) {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f);
      const stat = fs.statSync(p);
      if (stat.isDirectory()) walk(p);
      else if (f.endsWith('.yaml')) out.push(p);
    }
  }
  walk(dir);
  return out;
}

function parseMakefile(makefilePath) {
  const tasks = [];
  if (fs.existsSync(makefilePath)) {
    const lines = fs.readFileSync(makefilePath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const m = line.match(/^([A-Za-z0-9_-]+):/);
      if (m) tasks.push(m[1]);
    }
  }
  return tasks;
}

function generateSummary({agents, kernelCfg, availableAgents, tasks}) {
  const lines = [];
  lines.push('# Kernel Summary\n');
  lines.push('## How the kernel works');
  if (kernelCfg && Array.isArray(kernelCfg.agents)) {
    lines.push('The kernel loads the following agents: ' + kernelCfg.agents.join(', ') + '.');
  }
  if (tasks && tasks.length) {
    lines.push('Common Makefile tasks: ' + tasks.join(', ') + '.');
  }

  lines.push('\n## Inputs and Outputs');
  for (const a of agents) {
    if (a.inputs || a.outputs) {
      lines.push(`**${a.name}**:`);
      if (a.inputs) lines.push('  - inputs: ' + a.inputs.join(', '));
      if (a.outputs) lines.push('  - outputs: ' + a.outputs.join(', '));
    }
  }
  if (agents.every(a => !a.inputs && !a.outputs)) {
    lines.push('Agents do not explicitly declare inputs/outputs in their YAML files.');
  }

  lines.push('\n## Major Agents Installed');
  if (agents.length) {
    for (const a of agents) {
      lines.push(`- ${a.name}: ${a.description || ''}`.trim());
    }
  }
  if (availableAgents && availableAgents.length) {
    lines.push('\nAdditional agents listed in available-agents.json:');
    for (const a of availableAgents) {
      lines.push(`- ${a.name} (${a.url || a.path || ''})`);
    }
  }

  lines.push('\n## Getting Started for Developers');
  lines.push('Install dependencies with `npm install` and use the Makefile tasks to run the kernel.');
  if (tasks.includes('boot')) {
    lines.push('Run `make boot` to validate the environment and start the agent loop.');
  } else if (tasks.includes('run')) {
    lines.push('Run `make run` to start the system.');
  }
  return lines.join('\n');
}

function main() {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const docsDir = path.join(repoRoot, 'docs');
  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir);

  const agentYamlFiles = findAgentYamls(path.join(repoRoot, 'agent-templates'));
  const agents = agentYamlFiles.map(f => ({file: f, ...readYAML(f)})).filter(a => a && a.name);

  const kernelCfg = readJSON(path.join(repoRoot, 'kernel.json'));

  const availableAgents = readJSON(path.join(repoRoot, 'kernel-slate', 'docs', 'available-agents.json')) || [];

  const tasks = parseMakefile(path.join(repoRoot, 'Makefile'));

  const summary = generateSummary({agents, kernelCfg, availableAgents, tasks});
  fs.writeFileSync(path.join(docsDir, 'kernel-summary.md'), summary);
  console.log('Wrote docs/kernel-summary.md');
}

if (require.main === module) {
  main();
}
