#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const logsDir = path.join(repoRoot, 'logs');
const logFile = path.join(logsDir, 'cli-output.json');
fs.mkdirSync(logsDir, { recursive: true });

function appendLog(command, output) {
  let arr = [];
  if (fs.existsSync(logFile)) {
    try { arr = JSON.parse(fs.readFileSync(logFile, 'utf8')); } catch {}
  }
  arr.push({ timestamp: new Date().toISOString(), command, output });
  fs.writeFileSync(logFile, JSON.stringify(arr, null, 2));
}

function run(cmd, opts = {}) {
  try {
    const out = execSync(cmd, { encoding: 'utf8', cwd: repoRoot, shell: true, ...opts });
    process.stdout.write(out);
    appendLog(cmd, out.trim());
    return 0;
  } catch (err) {
    const out = ((err.stdout || '') + (err.stderr || '')).toString();
    process.stdout.write(err.stdout || '');
    process.stderr.write(err.stderr || '');
    appendLog(cmd, out.trim() || err.message);
    return err.status || 1;
  }
}

function runWithOutput(cmd, opts = {}) {
  try {
    const out = execSync(cmd, { encoding: 'utf8', cwd: repoRoot, shell: true, ...opts });
    process.stdout.write(out);
    appendLog(cmd, out.trim());
    return { status: 0, output: out };
  } catch (err) {
    const out = ((err.stdout || '') + (err.stderr || '')).toString();
    process.stdout.write(err.stdout || '');
    process.stderr.write(err.stderr || '');
    appendLog(cmd, out.trim() || err.message);
    return { status: err.status || 1, output: out };
  }
}

function parsePassedTests(output) {
  const m = output.match(/Tests:\s+(?:\d+\s+\w+,\s+)?(\d+)\s+passed/);
  return m ? parseInt(m[1], 10) : null;
}

async function releaseCheck() {
  const errors = [];
  let passed = null;

  const ensure = runWithOutput('node scripts/core/ensure-runtime.js');
  if (ensure.status !== 0) errors.push('ensure-runtime.js');

  const verify = runWithOutput('make -C kernel-slate verify');
  if (verify.status !== 0) errors.push('make verify');
  const parsed = parsePassedTests(verify.output);
  if (parsed !== null) passed = parsed;

  const ok = ensure.status === 0 && verify.status === 0;
  const symbol = ok ? '✅' : '❌';
  const count = passed !== null ? `${passed} tests passed` : 'test count unknown';
  const errMsg = errors.length ? ` errors: ${errors.join(', ')}` : '';
  console.log(`\n${symbol} ${count}${errMsg}`);
  return ok ? 0 : 1;
}
async function doctor() {
  const ensure = runWithOutput("node scripts/core/ensure-runtime.js");
  const inspect = runWithOutput("node scripts/dev/kernel-inspector.js");
  const verify = runWithOutput("timeout 15s make verify");
  const ok = ensure.status === 0 && inspect.status === 0 && verify.status === 0;
  console.log(ok ? "✅ doctor passed" : "❌ doctor failed");
  return ok ? 0 : 1;
}

async function shrinkwrap() {
  const scanDirs = ['scripts', 'docs', 'agents', 'tests', 'legacy', 'logs'];
  const allFiles = [];

  function findFiles(dir) {
    const stack = [dir];
    const out = [];
    while (stack.length) {
      const cur = stack.pop();
      for (const item of fs.readdirSync(cur, { withFileTypes: true })) {
        const full = path.join(cur, item.name);
        if (item.isDirectory()) stack.push(full); else out.push(full);
      }
    }
    return out;
  }

  for (const d of scanDirs) {
    const abs = path.join(repoRoot, d);
    if (fs.existsSync(abs)) allFiles.push(...findFiles(abs));
  }

  function buildReferenceMap(files) {
    const map = {};
    const jsFiles = files.filter(f => f.endsWith('.js'));
    const re = /require\(['"]([^'"]+)['"]\)|import[^'"\n]+['"]([^'"]+)['"]/g;
    for (const file of jsFiles) {
      const dir = path.dirname(file);
      let text;
      try { text = fs.readFileSync(file, 'utf8'); } catch { continue; }
      let m;
      while ((m = re.exec(text))) {
        const p = m[1] || m[2];
        if (!p.startsWith('.')) continue;
        const candidates = [p, `${p}.js`, `${p}.json`, path.join(p, 'index.js')];
        let resolved = null;
        for (const c of candidates) {
          const abs = path.resolve(dir, c);
          if (fs.existsSync(abs)) { resolved = abs; break; }
        }
        if (resolved) {
          if (!map[resolved]) map[resolved] = new Set();
          map[resolved].add(file);
        }
      }
    }
    return map;
  }

  function loadRegistrations() {
    const set = new Set();
    const regFiles = ['agent-registry.json', path.join('kernel-slate', 'agent-registry.json')];
    for (const f of regFiles) {
      const fp = path.join(repoRoot, f);
      if (!fs.existsSync(fp)) continue;
      try {
        const data = fs.readFileSync(fp, 'utf8');
        const json = JSON.parse(data);
        const arr = Array.isArray(json) ? json : json.agents;
        for (const a of arr || []) if (a.path) set.add(path.resolve(repoRoot, a.path));
      } catch {}
    }
    return set;
  }

  const usageMap = buildReferenceMap(allFiles);
  const registrations = loadRegistrations();

  const cliText = fs.readFileSync(__filename, 'utf8');
  const cliPaths = new Set();
  const pathRegex = /['"](scripts[^'"\n]+\.js)['"]/g;
  let m;
  while ((m = pathRegex.exec(cliText))) {
    const abs = path.resolve(repoRoot, m[1]);
    cliPaths.add(abs);
  }

  const results = [];
  for (const file of allFiles) {
    const rel = path.relative(repoRoot, file);
    let status = '💤 Dormant';
    if (rel.startsWith('legacy/')) status = '💀 Legacy-only';
    if (usageMap[file] || cliPaths.has(file) || registrations.has(file)) status = '✅ Essential';
    results.push({ file: rel, status });
  }

  const baseMap = {};
  for (const r of results.filter(r => r.status === '💤 Dormant')) {
    const base = path.basename(r.file);
    if (!baseMap[base]) baseMap[base] = [];
    baseMap[base].push(r);
  }
  for (const base in baseMap) {
    if (baseMap[base].length > 1) {
      for (const r of baseMap[base]) r.status = '🧯 Redundant';
    }
  }

  fs.writeFileSync(path.join(logsDir, 'bloat-report.json'), JSON.stringify(results, null, 2));

  let md = '# Kernel Bloat Map\n\n| File | Status |\n| --- | --- |\n';
  for (const r of results) md += `| ${r.file} | ${r.status} |\n`;
  fs.mkdirSync(path.join(repoRoot, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, 'docs', 'kernel-bloat-map.md'), md);

  const commands = [];
  const cmdRe = /case ['"]([^'"]+)['"]:/g;
  while ((m = cmdRe.exec(cliText))) commands.push(m[1]);

  const docsDir = path.join(repoRoot, 'docs');
  const docs = fs.existsSync(docsDir) ? findFiles(docsDir).map(f => path.relative(repoRoot, f)) : [];

  const agentList = Array.from(registrations).map(p => path.relative(repoRoot, p));

  const include = ['scripts', 'docs', 'agent.yaml', 'Makefile', 'package.json', path.relative(repoRoot, __filename)];
  const includedFiles = [];
  for (const item of include) {
    const abs = path.join(repoRoot, item);
    if (!fs.existsSync(abs)) continue;
    if (fs.statSync(abs).isDirectory()) includedFiles.push(...findFiles(abs)); else includedFiles.push(abs);
  }

  let totalSize = 0;
  for (const f of includedFiles) totalSize += fs.statSync(f).size;

  const excluded = results.filter(r => r.status === '💀 Legacy-only' || r.status === '🧯 Redundant');

  const shrinkwrapDoc = [
    '# Kernel Shrinkwrap',
    '',
    '## CLI Commands',
    commands.map(c => `- ${c}`).join('\n'),
    '',
    '## Registered Agents',
    agentList.map(a => `- ${a}`).join('\n'),
    '',
    '## Documentation Files',
    docs.map(d => `- ${d}`).join('\n'),
    '',
    `Included files: ${includedFiles.length}`,
    `Total size: ${totalSize} bytes`,
    '',
    '### Excluded',
    excluded.map(e => `- ${e.file} (${e.status})`).join('\n')
  ].join('\n');

  fs.writeFileSync(path.join(repoRoot, 'docs', 'kernel-shrinkwrap.md'), shrinkwrapDoc);

  const runInfo = {
    timestamp: new Date().toISOString(),
    included: includedFiles.length,
    size: totalSize,
    excluded: excluded.length
  };
  fs.writeFileSync(path.join(logsDir, 'shrinkwrap-run.json'), JSON.stringify(runInfo, null, 2));
  fs.writeFileSync(path.join(logsDir, 'fix-session-log.md'), `shrinkwrap run at ${runInfo.timestamp}\n`);
  console.log('Shrinkwrap complete');
}

async function devkit() {
  await shrinkwrap();
  const yaml = require('js-yaml');
  const templatesDir = path.join(repoRoot, 'kernel-slate', 'agent-templates');
  const agents = fs.existsSync(templatesDir)
    ? fs.readdirSync(templatesDir).filter(f => f.endsWith('.yaml'))
    : [];
  fs.writeFileSync(path.join(logsDir, 'devkit-agents.json'), JSON.stringify(agents, null, 2));
  console.log(`Exported ${agents.length} agent templates`);

  const { ProviderRouter } = require(path.join(repoRoot, 'scripts', 'core', 'provider-router.js'));
  const router = new ProviderRouter();
  console.log('Router provider:', router.getProvider('default'));

  let invalid = 0;
  for (const a of agents) {
    try {
      const doc = yaml.load(fs.readFileSync(path.join(templatesDir, a), 'utf8')) || {};
      if (!doc.name || !doc.description || !doc.file) {
        console.log(`Invalid agent yaml: ${a}`);
        invalid++;
      }
    } catch (e) {
      console.log(`Failed to parse ${a}`);
      invalid++;
    }
  }
  if (invalid === 0) console.log('All agent yamls valid');

  const envPath = path.join(repoRoot, '.env');
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    const required = ['OPENAI_API_KEY', 'CLAUDE_API_KEY'];
    const missing = required.filter(k => !process.env[k]);
    if (missing.length) console.log('Missing env keys:', missing.join(', '));
    else console.log('Env keys present');
  } else {
    console.log('.env not found');
  }
}


function help() {
  console.log(`Usage: node kernel-cli.js <command> [args]

Commands:
  init               clone repo and run setup.sh
  verify             run make verify
  inspect            run kernel inspector
  status             show git status
  prune              prune unused files
  menu               launch menu interface
  release-check      verify release readiness
  reprompt           regenerate fix prompts
  doctor             run diagnostics
  test               run npm test
  shrinkwrap         audit bloat and generate slim package docs
  devkit             run devkit workflow
  install-agent <path>  install specified agent.yaml
  launch-ui          run the Express server`);
}

async function main() {
  const [cmd, arg] = process.argv.slice(2);
  if (!cmd) return help();
  switch (cmd) {
    case 'init': {
      const repoUrl = process.env.REPO_URL || 'https://github.com/your-org/clarity-engine.git';
      const dir = repoUrl.split('/').pop().replace(/\.git$/, '') || 'repo';
      if (process.env.NODE_ENV === 'test') {
        console.log('[dry-run] skipping git clone');
      } else if (run(`git clone ${repoUrl}`) !== 0) {
        break;
      }
      if (process.env.NODE_ENV !== 'test') {
        run('bash setup.sh', { cwd: path.join(process.cwd(), dir) });
      }
      break;
    }
    case 'verify':
      process.exitCode = run('make verify');
      break;
    case 'inspect':
      process.exitCode = run('node scripts/dev/kernel-inspector.js');
      break;
    case 'status':
      if (fs.existsSync(path.join(repoRoot, 'scripts', 'dev', 'kernel-status.js')))
        process.exitCode = run('node scripts/dev/kernel-status.js');
      else
        process.exitCode = run('git status --short');
      break;
    case 'prune':
      process.exitCode = run('node scripts/dev/prune-kernel.js');
      break;
    case 'menu':
      run('node scripts/dev/menu.js');
      break;
    case 'doctor':
      await doctor();
      break;
    case 'test':
      run('npm test');
      break;
    case 'install-agent':
      if (!arg) return help();
      run(`node kernel-slate/scripts/market/install-agent.js ${arg}`);
      break;
    case 'launch-ui':
      run('node scripts/ui/server.js');
      break;
    case 'reprompt':
      run('node kernel-slate/scripts/agents/kernel-feedback-loop.js');
      break;
    case 'release-check':
      await releaseCheck();
      break;
    case 'shrinkwrap':
      await shrinkwrap();
      break;
    case 'devkit':
      await devkit();
      break;
    case 'run':
      if (arg === 'release-check') {
        await releaseCheck();
      } else {
        help();
      }
      break;
    default:
      help();
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
