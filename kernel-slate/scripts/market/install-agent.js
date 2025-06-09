#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { execSync } = require('child_process');
const stripeUnlock = require('../payments/stripe-agent-unlock');
const usage = require('../payments/track-usage');

const registryFile = path.resolve(__dirname, '../../installed-agents.json');
const repoRoot = path.resolve(__dirname, '../..');
const lockFile = path.join(repoRoot, '.agent.lock');

function register(agent) {
  const list = fs.existsSync(registryFile)
    ? JSON.parse(fs.readFileSync(registryFile, 'utf8'))
    : [];
  list.push({
    name: agent.name,
    file: agent.file,
    config: agent._configPath || '',
    installed: new Date().toISOString(),
  });
  fs.writeFileSync(registryFile, JSON.stringify(list, null, 2));
}

async function main() {
  if (fs.existsSync(lockFile)) {
    console.error('Another agent operation is currently running. Exiting.');
    process.exit(1);
  }
  fs.writeFileSync(lockFile, 'running');
  try {
    const file = process.argv[2];
    if (!file) {
      console.error('Usage: node install-agent.js <agent.yaml>');
      fs.unlinkSync(lockFile);
      process.exit(1);
    }
    const fullPath = path.resolve(file);
    const doc = yaml.load(fs.readFileSync(fullPath, 'utf8'));
    doc._configPath = fullPath;
    await stripeUnlock.chargeAgentInstall(doc.name);
    if (doc.install) {
      try {
        execSync(doc.install, { stdio: 'inherit', shell: true });
      } catch (err) {
        console.error('Install script failed:', err.message);
      }
    }
    register(doc);
    usage.logInstall(doc.name);
    console.log(`Installed agent: ${doc.name}`);
  } finally {
    if (fs.existsSync(lockFile)) fs.unlinkSync(lockFile);
  }
}

if (require.main === module) {
  main();
}
