#!/usr/bin/env node
const { spawnSync } = require('child_process');
const fs = require('fs');

function usage() {
  console.log('Usage: kernel-cli <command>');
  console.log('Commands:\n  verify  Run repository verification checks');
}

const cmd = process.argv[2];
if (cmd === 'verify') {
  const dep = spawnSync('node', ['scripts/core/ensure-runtime.js'], { stdio: 'inherit' });
  console.log(dep.status === 0 ? '\u2705 dependencies' : '\u274c dependencies');

  let agentsInstalled = false;
  if (fs.existsSync('installed-agents.json')) {
    try {
      const arr = JSON.parse(fs.readFileSync('installed-agents.json', 'utf8'));
      agentsInstalled = Array.isArray(arr) && arr.length > 0;
    } catch {}
  }
  console.log(agentsInstalled ? '\u2705 agents installed' : '\u274c no agents installed');

  console.log(fs.existsSync('package.json') ? '\u2705 package.json' : '\u274c package.json missing');
  console.log(fs.existsSync('.env') ? '\u2705 .env' : '\u274c .env missing');
  console.log(fs.existsSync('kernel.json') ? '\u2705 kernel.json' : '\u274c kernel.json missing');

  const tests = spawnSync('npm', ['test', '--prefix', 'kernel-slate'], { stdio: 'inherit' });
  console.log(tests.status === 0 ? '\u2705 tests' : '\u274c tests failed');
  const ok = dep.status === 0 && agentsInstalled && tests.status === 0;
  process.exit(ok ? 0 : 1);
} else {
  usage();
  process.exit(1);
}

