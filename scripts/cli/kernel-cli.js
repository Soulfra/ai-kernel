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

function init() {
  return run('bash', ['setup.sh']);
}

function inspect() {
  return run('node', ['scripts/dev/kernel-inspector.js']);
}

function test() {
  requireOrInstall('jest');
  return run('npm', ['test']);
}

function installAgent(pathArg) {
  if (!pathArg) return false;
  return run('node', ['kernel-slate/scripts/market/install-agent.js', pathArg]);
}

function launchUI() {
  return run('node', ['scripts/ui/server.js']);
}

async function verify() {
  const runtimeOk = run('node', ['scripts/core/ensure-runtime.js']);

  if (!fs.existsSync('kernel-slate/node_modules')) {
    if (!run('npm', ['install', '--prefix', 'kernel-slate'])) return false;
  }

  requireOrInstall('jest');
  const testOk = run('npm', ['test']);

  const ok = runtimeOk && testOk;
  console.log(ok ? chalk.green('✅') : chalk.red('❌'));
  return ok;
}

async function main() {
  try {
    const [cmd, arg] = process.argv.slice(2);
    let ok = false;
    switch (cmd) {
      case 'init':
        ok = init();
        break;
      case 'verify':
        ok = await verify();
        break;
      case 'inspect':
        ok = inspect();
        break;
      case 'test':
        ok = test();
        break;
      case 'install-agent':
        ok = installAgent(arg);
        break;
      case 'launch-ui':
        ok = launchUI();
        break;
      default:
        usage();
        process.exit(1);
    }
    process.exit(ok ? 0 : 1);
  } catch (err) {
    console.error(err.message);
    usage();
    process.exit(1);
  }
}

main();

