#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../..');
const searchDirs = ['legacy', 'scripts', 'tests', 'docs'];
const outputFile = path.join(repoRoot, 'docs', 'decision-trace.md');

const results = [];

function scanFile(filePath) {
  const relPath = path.relative(repoRoot, filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    const lower = trimmed.toLowerCase();
    const snippet = trimmed.slice(0, 120);
    if (lower.includes('todo')) {
      results.push({
        path: relPath,
        type: 'TODO',
        snippet,
        action: 'address TODO'
      });
    } else if (trimmed.startsWith('//') || trimmed.startsWith('#')) {
      if (['why', 'should', 'if', 'when'].some(k => lower.includes(k))) {
        results.push({
          path: relPath,
          type: 'question',
          snippet,
          action: 'add explanation'
        });
      }
    }

    const funcMatch = trimmed.match(/^(async\s+)?function\s+[\w$]+|^[\w$]+\s*=>\s*{/);
    if (funcMatch) {
      const prev = lines[idx - 1] || '';
      if (!prev.trim().startsWith('//') && !prev.trim().startsWith('/**')) {
        results.push({
          path: relPath,
          type: 'undocumented',
          snippet,
          action: 'add description'
        });
      }
    }

    if (lower.includes('decision') || lower.includes('design note') || lower.startsWith('commit')) {
      results.push({
        path: relPath,
        type: 'decision',
        snippet,
        action: 'capture in architecture docs'
      });
    }
  });
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach(ent => {
    const res = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walkDir(res);
    } else if (ent.isFile()) {
      scanFile(res);
    }
  });
}

searchDirs.forEach(d => {
  const full = path.join(repoRoot, d);
  if (fs.existsSync(full)) walkDir(full);
});

let output = '';
results.forEach(r => {
  output += `## [${r.type}] in ${r.path}\n`;
  output += `${r.snippet}\n`;
  output += `\u27a4 Suggested: ${r.action}\n\n`;
});

fs.writeFileSync(outputFile, output);
console.log(`Decision trace written to ${outputFile}`);
