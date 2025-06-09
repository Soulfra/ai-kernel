#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const repoRoot = path.resolve(__dirname, '..', '..');
const logDir = path.join(repoRoot, 'logs');
fs.mkdirSync(logDir, { recursive: true });
const logPath = path.join(logDir, 'kernel-status.log');

function run(cmd) {
  try {
    const out = execSync(cmd, { cwd: repoRoot, encoding: 'utf8' });
    fs.appendFileSync(logPath, `${cmd}\n${out}\n`);
    return { status: 0, output: out.trim() };
  } catch (err) {
    const out = ((err.stdout || '') + (err.stderr || '')).toString();
    fs.appendFileSync(logPath, `${cmd}\n${out}\n`);
    return { status: err.status || 1, output: out.trim() };
  }
}

function main() {
  const branch = run('git rev-parse --abbrev-ref HEAD');
  const status = run('git status --short');
  console.log(`Branch: ${branch.output}`);
  console.log(status.output);
  return status.status;
}

if (require.main === module) {
  const code = main();
  process.exit(code);
}

module.exports = { main };
