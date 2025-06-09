#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const repoRoot = path.resolve(__dirname, '..', '..');
const logsDir = path.join(repoRoot, 'logs');
const docsDir = path.join(repoRoot, 'docs', 'self-parsed');
fs.mkdirSync(logsDir, { recursive: true });
fs.mkdirSync(docsDir, { recursive: true });
const logPath = path.join(logsDir, 'semantic-cluster.json');

function read(file) { return fs.readFileSync(file, 'utf8'); }

function gatherFiles() {
  const dirs = [path.join(repoRoot, 'scripts'), path.join(repoRoot, 'kernel-slate', 'scripts')];
  const out = [];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    const stack = [dir];
    while (stack.length) {
      const d = stack.pop();
      for (const f of fs.readdirSync(d)) {
        const p = path.join(d, f);
        if (fs.statSync(p).isDirectory()) stack.push(p); else if (p.endsWith('.js')) out.push(p);
      }
    }
  }
  return out;
}

function firstComment(text) {
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\s*(?:\/\/|#|\*)\s*(.+)/);
    if (m) return m[1].trim();
    if (line.trim()) break;
  }
  return '';
}

function embed(text) {
  if (process.env.OPENAI_API_KEY) {
    // lazy require fetch
    const fetch = global.fetch || require('node-fetch');
    return fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: text.slice(0, 2000) })
    })
      .then(r => r.json())
      .then(j => j.data[0].embedding);
  }
  const hash = crypto.createHash('sha256').update(text).digest();
  return Array.from(hash).slice(0, 32).map(b => b / 255);
}

function distance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

function kmeans(vectors, k, iterations = 10) {
  const centers = vectors.slice(0, k).map(v => v.slice());
  const assign = new Array(vectors.length).fill(0);
  for (let iter = 0; iter < iterations; iter++) {
    // assign
    for (let i = 0; i < vectors.length; i++) {
      let best = 0; let bestD = Infinity;
      for (let j = 0; j < centers.length; j++) {
        const d = distance(vectors[i], centers[j]);
        if (d < bestD) { bestD = d; best = j; }
      }
      assign[i] = best;
    }
    // update
    const sums = Array.from({ length: k }, () => Array(vectors[0].length).fill(0));
    const counts = Array(k).fill(0);
    for (let i = 0; i < vectors.length; i++) {
      const c = assign[i];
      counts[c]++;
      for (let d = 0; d < vectors[0].length; d++) sums[c][d] += vectors[i][d];
    }
    for (let j = 0; j < k; j++) {
      if (counts[j]) centers[j] = sums[j].map(v => v / counts[j]);
    }
  }
  return assign;
}

async function main() {
  const files = gatherFiles();
  const summaries = [];
  const vectors = [];
  for (const file of files) {
    const text = read(file);
    summaries.push({ file: path.relative(repoRoot, file), summary: firstComment(text) });
    const vec = await embed(text);
    vectors.push(vec);
  }
  const k = Math.min(10, Math.max(5, Math.round(vectors.length / 5))) || 5;
  const assign = kmeans(vectors, k);

  const clusters = Array.from({ length: k }, () => []);
  for (let i = 0; i < files.length; i++) clusters[assign[i]].push(summaries[i]);

  // write docs
  clusters.forEach((items, idx) => {
    const lines = [`# Cluster ${idx}`];
    for (const it of items) {
      lines.push(`- **${it.file}**: ${it.summary}`);
    }
    fs.writeFileSync(path.join(docsDir, `cluster-${idx}.md`), lines.join('\n'));
  });
  const summaryDoc = ['# Kernel Summary'];
  clusters.forEach((c, i) => summaryDoc.push(`- Cluster ${i}: ${c.length} files`));
  fs.writeFileSync(path.join(docsDir, 'kernel-summary.md'), summaryDoc.join('\n'));

  fs.writeFileSync(logPath, JSON.stringify({ clusters }, null, 2));
}

if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
