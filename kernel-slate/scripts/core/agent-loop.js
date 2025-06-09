#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { exec } = require('child_process');

const repoRoot = path.resolve(__dirname, '../..');
const templatesDir = path.join(repoRoot, 'agent-templates');
const inputDir = path.join(repoRoot, 'input');
const registryFile = path.join(repoRoot, 'installed-agents.json');
const logDir = path.join(repoRoot, 'logs');
const logFile = path.join(logDir, 'agent-loop.log');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

function loadAgents() {
  const registry = fs.existsSync(registryFile)
    ? JSON.parse(fs.readFileSync(registryFile, 'utf8'))
    : [];
  return registry.map(r => {
    const config = r.config && fs.existsSync(r.config) ? yaml.load(fs.readFileSync(r.config, 'utf8')) : {};
    return { ...config, configPath: r.config };
  });
}

function runAgent(agent) {
  if (!agent.run) return;
  exec(agent.run, { shell: true }, (err, stdout, stderr) => {
    const out = err ? stderr : stdout;
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${agent.name}: ${out}\n`);
  });
}

function check() {
  const agents = loadAgents();
  for (const agent of agents) {
    if (!agent.watch) continue;
    if (agent.trigger) {
      const triggerPath = path.join(inputDir, agent.trigger);
      if (!fs.existsSync(triggerPath)) continue;
    }
    runAgent(agent);
  }
}

function loop() {
  check();
  setInterval(check, 15000);
}

if (require.main === module) {
  loop();
}

module.exports = { loop };
