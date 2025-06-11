#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
require('../core/ensure-runtime.js').ensureRuntime();

function parseSimpleYaml(str) {
  const lines = str.replace(/\r/g, '').split('\n');
  const result = {};
  let i = 0;
  while (i < lines.length) {
    let line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) { i++; continue; }
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!m) { i++; continue; }
    const key = m[1];
    let rest = m[2];
    if (rest === '|') {
      i++;
      const indent = (lines[i] || '').match(/^(\s*)/)[1].length;
      let val = '';
      while (i < lines.length && lines[i].startsWith(' '.repeat(indent))) {
        val += lines[i].slice(indent) + '\n';
        i++;
      }
      result[key] = val.trimEnd();
      continue;
    }
    if (rest === '' && lines[i+1] && lines[i+1].trim().startsWith('- ')) {
      const arr = [];
      i++;
      while (i < lines.length && lines[i].trim().startsWith('- ')) {
        arr.push(lines[i].trim().slice(2));
        i++;
      }
      result[key] = arr;
      continue;
    }
    if (rest === '' && lines[i+1] && /^\s+[^\s]/.test(lines[i+1])) {
      const obj = {};
      i++;
      while (i < lines.length && /^\s+[^\s]/.test(lines[i])) {
        const sub = lines[i].trim().match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
        if (sub) obj[sub[1]] = sub[2];
        i++;
      }
      result[key] = obj;
      continue;
    }
    result[key] = rest;
    i++;
  }
  return result;
}

function usage() {
  console.error('Usage: node generate-agent-readme.js <agent.yaml>');
}

function formatList(title, items) {
  if (!items || items.length === 0) return '';
  return `\n## ${title}\n` + items.map(i => `- ${i}`).join('\n') + '\n';
}

function formatHooks(hooks) {
  if (!hooks || Object.keys(hooks).length === 0) return '';
  const lines = Object.entries(hooks).map(([k,v]) => `- **${k}**: ${v}`);
  return '\n## Usage Hooks\n' + lines.join('\n') + '\n';
}

function generate(doc) {
  let out = `# ${doc.name}\n\n`;
  if (doc.description) out += `${doc.description}\n`;
  out += formatList('Inputs', doc.inputs || []);
  out += formatList('Outputs', doc.outputs || []);
  if (doc.install) out += `\n## Install\n\n${doc.install.trim()}\n`;
  out += formatHooks(doc.usage_hooks);
  return out;
}

function main() {
  const [file] = process.argv.slice(2);
  if (!file) {
    usage();
    process.exit(1);
  }
  const full = path.resolve(file);
  if (!fs.existsSync(full)) {
    console.error('File not found:', full);
    process.exit(1);
  }
  const doc = parseSimpleYaml(fs.readFileSync(full, 'utf8'));
  if (!doc || !doc.name) {
    console.error('Invalid agent.yaml');
    process.exit(1);
  }
  const readme = generate(doc);
  const dest = path.join(path.dirname(full), 'README.md');
  fs.writeFileSync(dest, readme);
  console.log('Generated', dest);
}

if (require.main === module) {
  try { main(); } catch(err) { console.error(err); process.exit(1); }
}

module.exports = { generate };
