#!/usr/bin/env node
const fs = require('fs');
const { spawnSync } = require('child_process');
const requireOrInstall = require('../../kernel-slate/scripts/core/utils/requireOrInstall');
const chalkModule = requireOrInstall('chalk');
const chalk = chalkModule.default || chalkModule;

function usage() {
  console.log('Usage: kernel-cli <init|verify|inspect|test|install-agent|launch-ui>');
}

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  return res.status === 0;
}

async function verify() {
  const runtimeOk = run('node', ['scripts/core/ensure-runtime.js']);

  if (!fs.existsSync('kernel-slate/node_modules')) {
    if (!run('npm', ['install', '--prefix', 'kernel-slate'])) return false;
  }

  requireOrInstall('jest');
  const testOk = run('npm', ['test']);

  const ok = runtimeOk && testOk;
  console.log(ok ? chalk.green('\u2705') : chalk.red('\u274c'));
  return ok;
}

async function main() {
  try {
    const cmd = process.argv[2];
    if (cmd === 'verify') {
      const ok = await verify();
      process.exit(ok ? 0 : 1);
    } else {
      usage();
      process.exit(1);
    }
  } catch (err) {
    console.error(err.message);
    usage();
    process.exit(1);
  }
}

main();

