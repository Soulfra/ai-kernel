#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const yaml = require('js-yaml');
require('../core/ensure-runtime.js').ensureRuntime();

const repoRoot = path.resolve(__dirname, '../..');
const scanDirs = ['scripts', 'legacy', 'test', 'docs'].map(d => path.join(repoRoot, d));

function findFiles(dirs) {
  const out = [];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    const stack = [dir];
    while (stack.length) {
      const cur = stack.pop();
      for (const item of fs.readdirSync(cur, { withFileTypes: true })) {
        const full = path.join(cur, item.name);
        if (item.isDirectory()) stack.push(full);
        else out.push(full);
      }
    }
  }
  return out;
}

function buildReferenceMap(files) {
  const map = {};
  const broken = {};
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
      } else {
        if (!broken[file]) broken[file] = [];
        broken[file].push(p);
      }
    }
  }
  return { map, broken };
}

function lintFile(file) {
  if (!file.endsWith('.js')) return null;
  const res = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (res.status !== 0) return (res.stderr || 'syntax error').trim();
  return null;
}

function hasPreserveTag(file) {
  if (!file.endsWith('.js')) return false;
  try {
    const text = fs.readFileSync(file, 'utf8');
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      if (line.startsWith('#!')) continue;
      const t = line.trim();
      if (!t) continue;
      if (t.startsWith('//')) {
        if (t.includes('@preserve')) return true;
        continue;
      }
      break;
    }
  } catch {}
  return false;
}

function loadRegistrations() {
  const set = new Set();
  const regFiles = ['agent-registry.json', path.join('kernel-slate', 'agent-registry.json')];
  for (const f of regFiles) {
    const fp = path.join(repoRoot, f);
    if (!fs.existsSync(fp)) continue;
    try {
      const arr = JSON.parse(fs.readFileSync(fp, 'utf8'));
      for (const a of arr) {
        if (a.path) set.add(path.resolve(repoRoot, a.path));
      }
    } catch {}
  }
  const yamlFiles = findFiles([repoRoot]).filter(f => f.endsWith('.yaml'));
  for (const yf of yamlFiles) {
    try {
      const doc = yaml.load(fs.readFileSync(yf, 'utf8'));
      if (doc && doc.file) {
        const p = path.resolve(path.dirname(yf), doc.file);
        set.add(p);
      }
    } catch {}
  }
  return set;
}

function main() {
  const files = findFiles(scanDirs);
  const { map: usageMap, broken } = buildReferenceMap(files);
  const registrations = loadRegistrations();
  const staleBefore = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const flagged = [];

  for (const file of files) {
    if (hasPreserveTag(file)) continue;
    const reasons = [];
    if (!usageMap[file]) reasons.push('unused');
    if (!registrations.has(file)) reasons.push('unregistered');
    try {
      const mtime = fs.statSync(file).mtime.getTime();
      if (mtime < staleBefore) reasons.push('stale');
    } catch {}
    const lintErr = lintFile(file);
    if (lintErr) reasons.push('lint:' + lintErr);
    if (broken[file]) reasons.push('broken require: ' + broken[file].join(', '));
    if (reasons.length) {
      flagged.push({ file: path.relative(repoRoot, file), reasons });
    }
  }

  const outDir = path.join(repoRoot, 'logs');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'prune-report.json');
  fs.writeFileSync(outFile, JSON.stringify(flagged, null, 2));
  console.log(`Wrote ${flagged.length} entries to ${outFile}`);
}

if (require.main === module) {
  main();
}

module.exports = { main };
