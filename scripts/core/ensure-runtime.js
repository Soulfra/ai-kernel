#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function run(cmd, args, options = {}) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', ...options });
  if (res.error) throw res.error;
  return res.status === 0;
}

function ensureRuntime() {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const rootPkg = fs.existsSync(path.join(repoRoot, 'package.json'))
    ? repoRoot
    : fs.existsSync(path.join(repoRoot, 'kernel-slate', 'package.json'))
      ? path.join(repoRoot, 'kernel-slate')
      : null;

  if (!rootPkg) {
    console.error('Could not locate package.json. Please run from repo root.');
    process.exit(1);
  }
  if (!fs.existsSync(path.join(repoRoot, 'scripts'))) {
    console.error('Scripts directory missing. Are you at the repository root?');
    process.exit(1);
  }

  const nodeModules = path.join(rootPkg, 'node_modules');
  if (!fs.existsSync(nodeModules)) {
    console.log('node_modules missing, running npm install...');
    if (!run('npm', ['install'], { cwd: rootPkg })) {
      console.error('npm install failed');
      process.exit(1);
    }
  }

  try {
    require.resolve('js-yaml');
  } catch {
    console.log('Installing js-yaml...');
    if (!run('npm', ['install', 'js-yaml'], { cwd: rootPkg })) {
      console.error('Failed to install js-yaml');
      process.exit(1);
    }
  }

  const req = path.join(repoRoot, 'requirements.txt');
  if (!fs.existsSync(req)) {
    console.warn('requirements.txt not found - Python deps may be missing');
  }
}

if (require.main === module) {
  try { ensureRuntime(); } catch (err) { console.error(err); process.exit(1); }
}

module.exports = { ensureRuntime };
