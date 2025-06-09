#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const requireOrInstall = require('./utils/requireOrInstall');
const yaml = requireOrInstall('js-yaml');
const { spawn } = require('child_process');

const repoRoot = path.resolve(__dirname, '../..');
const templatesDir = path.join(repoRoot, 'agent-templates');
const installScript = path.join(repoRoot, 'kernel-slate/scripts/market/install-agent.js');
const registryFile = path.join(repoRoot, 'installed-agents.json');
const docsFile = path.join(repoRoot, 'kernel-slate/docs/agents.md');

function loadRegistry() {
  return fs.existsSync(registryFile)
    ? JSON.parse(fs.readFileSync(registryFile, 'utf8'))
    : [];
}

function validate(doc) {
  return doc && doc.name && doc.description && doc.file;
}

function updateDocs(doc, configPath) {
  if (!fs.existsSync(docsFile)) return;
  const content = fs.readFileSync(docsFile, 'utf8');
  if (content.includes(`### ${doc.name}`)) return;
  const entry = `\n### ${doc.name}\n- **Description:** ${doc.description}\n- **Path:** ${doc.file}\n- **Config:** ${path.relative(repoRoot, configPath)}\n`;
  fs.appendFileSync(docsFile, entry);
}

function install(configPath, doc) {
  const child = spawn('node', [installScript, configPath], { stdio: 'inherit' });
  child.on('exit', () => {
    updateDocs(doc, configPath);
  });
}

function scan() {
  const registry = loadRegistry();
  const installed = new Set(registry.map(a => a.name));
  const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.yaml'));
  for (const file of files) {
    const full = path.join(templatesDir, file);
    const doc = yaml.load(fs.readFileSync(full, 'utf8'));
    if (!validate(doc)) continue;
    if (!installed.has(doc.name)) {
      doc._configPath = full;
      install(full, doc);
    }
  }
}

function watch() {
  scan();
  fs.watch(templatesDir, () => {
    setTimeout(scan, 300);
  });
}

if (require.main === module) {
  watch();
}

module.exports = { watch };
