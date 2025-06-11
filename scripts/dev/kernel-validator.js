#!/usr/bin/env node
const path = require('path');
const { spawnSync } = require('child_process');

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  return { status: res.status, stdout: res.stdout, stderr: res.stderr, error: res.error };
}

function printResult(ok, section, message) {
  if (ok) {
    console.log(`\u2705 ${section}`); // ✅
  } else {
    console.error(`\u274C ${section}: ${message}`); // ❌
  }
}

function main() {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const steps = [];

  steps.push(['kernel-cli verify', run('kernel-cli', ['verify'], { cwd: repoRoot })]);
  steps.push(['Jest tests', run('npm', ['test', '--silent'], { cwd: repoRoot })]);
  steps.push(['kernel-inspector', run('node', ['scripts/dev/kernel-inspector.js'], { cwd: repoRoot })]);

  let allPass = true;
  for (const [name, res] of steps) {
    const ok = res.status === 0;
    const msg = (res.error ? res.error.message : (res.stderr || res.stdout || '')).trim().split(/\r?\n/)[0];
    printResult(ok, name, msg);
    if (!ok) allPass = false;
  }

  if (allPass) {
    console.log('\u2705 E2E Kernel Verified');
    process.exit(0);
  } else {
    console.error('\u274C Kernel validation failed');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
