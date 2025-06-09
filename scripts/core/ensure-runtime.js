#!/usr/bin/env node
const { execSync } = require('child_process');

function checkNode() {
  try {
    const version = execSync('node --version').toString().trim();
    console.log(`[\u2713] Node runtime ${version}`);
    return true;
  } catch {
    console.error('[\u2717] Node runtime not found');
    return false;
  }
}

if (require.main === module) {
  process.exitCode = checkNode() ? 0 : 1;
}
