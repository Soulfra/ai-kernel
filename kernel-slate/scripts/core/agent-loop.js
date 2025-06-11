#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const requireOrInstall = require('./utils/requireOrInstall');
const yaml = requireOrInstall('js-yaml');
const { exec } = require('child_process');

const repoRoot = path.resolve(__dirname, '../..');
const templatesDir = path.join(repoRoot, 'agent-templates');
const inputDir = path.join(repoRoot, 'input');
const registryFile = path.join(repoRoot, 'installed-agents.json');
const logDir = path.join(repoRoot, 'logs');
const logFile = path.join(logDir, 'agent-loop.log');
const lockFile = path.join(repoRoot, '.agent.lock');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
if (fs.existsSync(lockFile)) {
  console.error('Agent loop already running. Exiting.');
  process.exit(1);
}
fs.writeFileSync(lockFile, 'running');
function cleanup() {
  if (fs.existsSync(lockFile)) fs.unlinkSync(lockFile);
}
process.on('exit', cleanup);
process.on('SIGINT', () => {
  cleanup();
  process.exit(0);
});
process.on('SIGTERM', () => {
  cleanup();
  process.exit(0);
});

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
