const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const glob = require('glob');

async function loadMostRecentIdea(base) {
  const files = glob.sync('ideas/*.idea.yaml', { cwd: base, absolute: true });
  if (!files.length) return null;
  let latest = files[0];
  let mtime = (await fs.stat(latest)).mtimeMs;
  for (const f of files.slice(1)) {
    const s = await fs.stat(f);
    if (s.mtimeMs > mtime) { latest = f; mtime = s.mtimeMs; }
  }
  const content = await fs.readFile(latest, 'utf8');
  return { file: latest, data: yaml.load(content) };
}

async function loadUsage(base) {
  const usageFiles = glob.sync('{usage.json,vault/*/usage.json}', { cwd: base, absolute: true });
  const usage = [];
  for (const file of usageFiles) {
    try {
      const data = JSON.parse(await fs.readFile(file, 'utf8'));
      usage.push({ file, data });
    } catch {}
  }
  return usage;
}

async function loadMetadata(base) {
  const meta = {};
  for (const file of ['kernel.json', 'installed-agents.json']) {
    const p = path.join(base, file);
    if (fs.stat(p).catch(() => false)) {
      try {
        meta[file] = JSON.parse(await fs.readFile(p, 'utf8'));
      } catch {}
    }
  }
  meta.timestamp = new Date().toISOString();
  return meta;
}

async function run() {
  const base = process.cwd();
  const idea = await loadMostRecentIdea(base);
  const usage = await loadUsage(base);
  const metadata = await loadMetadata(base);

  const snapshot = { idea, usage, metadata };
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const slug = idea ? path.basename(idea.file, '.idea.yaml') : 'no-idea';
  const dir = path.join(base, 'snapshots');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${stamp}-full.json`), JSON.stringify(snapshot, null, 2));
  const summary = [
    `# Snapshot Summary for ${slug}`,
    '',
    `- Idea: ${idea ? path.relative(base, idea.file) : 'none'}`,
    `- Usage logs: ${usage.length}`,
    `- Timestamp: ${metadata.timestamp}`,
  ].join('\n');
  await fs.writeFile(path.join(dir, `${slug}.summary.md`), summary + '\n');
}

if (require.main === module) {
  run();
}

module.exports = run;
