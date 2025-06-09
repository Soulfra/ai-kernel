#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
let yaml;
try {
  yaml = require('js-yaml');
} catch {
  yaml = null;
}

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  return { status: res.status, stdout: res.stdout, stderr: res.stderr };
}

function findFiles(dir, filter) {
  const out = [];
  const stack = Array.isArray(dir) ? dir.slice() : [dir];
  while (stack.length) {
    const cur = stack.pop();
    if (!fs.existsSync(cur)) continue;
    const stat = fs.statSync(cur);
    if (stat.isDirectory()) {
      for (const f of fs.readdirSync(cur)) stack.push(path.join(cur, f));
    } else {
      if (!filter || filter(cur)) out.push(cur);
    }
  }
  return out;
}

function parseDeps(file) {
  const text = fs.readFileSync(file, 'utf8');
  const dir = path.dirname(file);
  const re = /require\(["']([^"']+)["']\)|import[^"']+["']([^"']+)["']/g;
  const deps = [];
  let m;
  while ((m = re.exec(text))) {
    const p = m[1] || m[2];
    if (!p.startsWith('.')) continue;
    const candidates = [p, `${p}.js`, `${p}.json`, path.join(p, 'index.js')];
    for (const c of candidates) {
      const abs = path.resolve(dir, c);
      if (fs.existsSync(abs)) { deps.push(abs); break; }
    }
  }
  return deps;
}

function loadAgentFiles(repoRoot) {
  const yamls = findFiles(path.join(repoRoot, 'agent-templates'), f => f.endsWith('.yaml'));
  const set = new Set();
  for (const yf of yamls) {
    let doc = null;
    if (yaml) {
      try { doc = yaml.load(fs.readFileSync(yf, 'utf8')); } catch {}
    } else {
      const m = fs.readFileSync(yf, 'utf8').match(/file:\s*(.*)/);
      if (m) doc = { file: m[1].trim() };
    }
    if (doc && doc.file) {
      set.add(path.resolve(path.dirname(yf), doc.file));
    }
  }
  return { yamls, files: set };
}

function buildGraph(files) {
  const graph = {};
  const incoming = {};
  for (const f of files) graph[f] = [];
  for (const f of files) {
    let deps = [];
    try { deps = parseDeps(f); } catch {}
    graph[f] = deps;
    for (const d of deps) {
      if (!incoming[d]) incoming[d] = new Set();
      incoming[d].add(f);
    }
  }
  return { graph, incoming };
}

function collectCliFiles(files, repoRoot) {
  const cli = new Set();
  const makeFile = path.join(repoRoot, 'Makefile');
  const pkgFile = path.join(repoRoot, 'package.json');
  const makeTxt = fs.existsSync(makeFile) ? fs.readFileSync(makeFile, 'utf8') : '';
  let pkgTxt = '';
  if (fs.existsSync(pkgFile)) {
    try { const obj = JSON.parse(fs.readFileSync(pkgFile, 'utf8')); pkgTxt = Object.values(obj.scripts || {}).join('\n'); } catch {}
  }
  for (const f of files) {
    let first = '';
    try { first = fs.readFileSync(f, 'utf8').split(/\r?\n/)[0]; } catch {}
    if (first.startsWith('#!') && first.includes('node')) { cli.add(f); continue; }
    const rel = path.relative(repoRoot, f).replace(/\\/g, '/');
    const r = new RegExp(`node\s+${rel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
    if (r.test(makeTxt) || r.test(pkgTxt)) cli.add(f);
  }
  return cli;
}

function main() {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const logsDir = path.join(repoRoot, 'logs');
  fs.mkdirSync(logsDir, { recursive: true });

  const required = ['Makefile','package.json','kernel.json','scripts','agent-templates','setup.sh','installed-agents.json'];
  const structure = {};
  for (const item of required) {
    structure[item] = fs.existsSync(path.join(repoRoot, item));
  }

  const searchDirs = ['scripts','legacy','kernel-slate'].map(d => path.join(repoRoot, d));
  const jsFiles = findFiles(searchDirs, f => f.endsWith('.js'));
  const { graph, incoming } = buildGraph(jsFiles);
  const { yamls, files: agentSet } = loadAgentFiles(repoRoot);
  const cliSet = collectCliFiles(jsFiles, repoRoot);

  const flagged = [];
  for (const f of jsFiles) {
    const hasIn = incoming[f] && incoming[f].size;
    const hasOut = graph[f] && graph[f].length;
    if (!hasIn && !hasOut && !agentSet.has(f) && !cliSet.has(f)) {
      flagged.push(path.relative(repoRoot, f));
    }
  }

  const requireErrors = [];
  for (const f of jsFiles) {
    try { require(f); } catch (err) { requireErrors.push({ file: path.relative(repoRoot, f), error: err.message }); }
  }

  const tests = {};
  tests.npmTest = run('npm', ['test'], { cwd: repoRoot });
  tests.ensureRuntime = run('node', [path.join('scripts','core','ensure-runtime.js')], { cwd: repoRoot });
  if (fs.existsSync(path.join(repoRoot,'Makefile'))) {
    tests.makeVerify = run('make', ['verify'], { cwd: repoRoot });
  }

  const agentYaml = yamls[0];
  const installRes = {};
  if (agentYaml) {
    const availPath = path.join(repoRoot,'kernel-slate','docs','available-agents.json');
    const beforeAvail = fs.existsSync(availPath) ? fs.readFileSync(availPath,'utf8') : null;
    const readmePath = path.join(path.dirname(agentYaml),'README.md');
    const installScript = path.join(repoRoot,'kernel-slate','scripts','market','install-agent.js');
    run('node', [installScript, agentYaml], { cwd: repoRoot, stdio: 'inherit' });
    if (yaml) run('node', [path.join(repoRoot,'scripts','dev','generate-agent-readme.js'), agentYaml], { cwd: repoRoot });
    const afterAvail = fs.existsSync(availPath) ? fs.readFileSync(availPath,'utf8') : null;
    installRes.agent = path.relative(repoRoot, agentYaml);
    installRes.availableUpdated = beforeAvail !== afterAvail;
    installRes.readmeCreated = fs.existsSync(readmePath);
  }

  const report = { structure, flagged, requireErrors, tests: {
    npmTest: tests.npmTest.status === 0,
    ensureRuntime: tests.ensureRuntime.status === 0,
    makeVerify: tests.makeVerify ? tests.makeVerify.status === 0 : null
  }, agentInstall: installRes };

  fs.writeFileSync(path.join(logsDir,'kernel-inspection.json'), JSON.stringify(report, null, 2));

  const lines = [];
  lines.push('# Kernel Inspection Report\n');
  lines.push('## Structure');
  for (const [k,v] of Object.entries(structure)) {
    lines.push(`- ${v ? '✅' : '❌'} ${k}`);
  }
  lines.push('\n## Unreferenced JS Files');
  lines.push(flagged.length ? flagged.map(f => `- ${f}`).join('\n') : 'None');
  lines.push('\n## Require Errors');
  if (requireErrors.length) {
    for (const r of requireErrors) lines.push(`- ${r.file}: ${r.error}`);
  } else lines.push('None');
  lines.push('\n## Test Results');
  lines.push(`- npm test: ${report.tests.npmTest ? 'pass' : 'fail'}`);
  lines.push(`- ensure-runtime.js: ${report.tests.ensureRuntime ? 'pass' : 'fail'}`);
  if (report.tests.makeVerify !== null) lines.push(`- make verify: ${report.tests.makeVerify ? 'pass' : 'fail'}`);
  if (installRes.agent) {
    lines.push('\n## Agent Installation');
    lines.push(`- Installed: ${installRes.agent}`);
    lines.push(`- README created: ${installRes.readmeCreated ? 'yes' : 'no'}`);
    lines.push(`- available-agents.json updated: ${installRes.availableUpdated ? 'yes' : 'no'}`);
  }
  fs.writeFileSync(path.join(logsDir,'kernel-report.md'), lines.join('\n'));
  console.log('Wrote logs/kernel-report.md and kernel-inspection.json');
}

if (require.main === module) {
  main();
}

module.exports = { main };
