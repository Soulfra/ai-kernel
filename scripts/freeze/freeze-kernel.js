const fs = require('fs');
const path = require('path');
const glob = require('glob');

const repoRoot = path.resolve(__dirname, '..', '..');

function parseMakeTargets() {
  const makefile = fs.readFileSync(path.join(repoRoot, 'Makefile'), 'utf8');
  const targets = [];
  for (const line of makefile.split(/\n/)) {
    const m = line.match(/^([A-Za-z0-9_-]+):/);
    if (m) targets.push(m[1]);
  }
  return targets;
}

function parseCliCommands() {
  const cliFile = fs.readFileSync(path.join(repoRoot, 'kernel-cli.js'), 'utf8');
  const cmds = [];
  const regex = /cmd === '([A-Za-z0-9_-]+)'/g;
  let m;
  while ((m = regex.exec(cliFile))) {
    cmds.push(m[1]);
  }
  return Array.from(new Set(cmds));
}

function parseApiEndpoints() {
  const serverFile = fs.readFileSync(path.join(repoRoot, 'scripts', 'boot', 'kernel-server.js'), 'utf8');
  const endpoints = [];
  const regex = /app\.(get|post)\('([^']+)'/g;
  let m;
  while ((m = regex.exec(serverFile))) {
    endpoints.push({ method: m[1], path: m[2] });
  }
  return endpoints;
}

function vaultSchema() {
  const fields = [
    'ideas/',
    'agents/',
    'jobs/',
    'zips/',
    'tokens.json',
    'usage.json',
    'settings.json',
    'subscription.json',
    'billing-history.json',
    'daily-summary.json'
  ];
  return fields;
}

function writeSnapshots(cli, api) {
  const snapDir = path.join(repoRoot, 'snapshots');
  fs.mkdirSync(snapDir, { recursive: true });
  fs.writeFileSync(path.join(snapDir, 'kernal-v1-cli.json'), JSON.stringify(cli, null, 2));
  fs.writeFileSync(path.join(snapDir, 'kernal-v1-api.json'), JSON.stringify(api, null, 2));
}

function writeDocs(cli, api) {
  const docDir = path.join(repoRoot, 'docs', 'v1');
  fs.mkdirSync(docDir, { recursive: true });
  const cmdMd = ['# Commands', '', '## Make Targets'];
  for (const t of cli.makeTargets) cmdMd.push(`- ${t}`);
  cmdMd.push('', '## CLI Commands');
  for (const c of cli.commands) cmdMd.push(`- ${c}`);
  fs.writeFileSync(path.join(docDir, 'COMMANDS.md'), cmdMd.join('\n') + '\n');

  const struct = ['# Kernel Structure', '', '## API Endpoints'];
  for (const e of api.endpoints) struct.push(`- ${e.method.toUpperCase()} ${e.path}`);
  struct.push('', '## Vault Schema');
  for (const f of api.vault) struct.push(`- ${f}`);
  fs.writeFileSync(path.join(docDir, 'STRUCTURE.md'), struct.join('\n') + '\n');
}

function run() {
  const cli = {
    makeTargets: parseMakeTargets(),
    commands: parseCliCommands()
  };
  const api = {
    endpoints: parseApiEndpoints(),
    vault: vaultSchema()
  };
  writeSnapshots(cli, api);
  writeDocs(cli, api);
  console.log('Kernel frozen at v1');
}

if (require.main === module) {
  run();
}

module.exports = run;
