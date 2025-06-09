#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const logsDir = path.join(repoRoot, 'logs');
fs.mkdirSync(logsDir, { recursive: true });

const files = [
  'standards-failures.json',
  'kernel-final-status.json',
  'make-verify-output.log',
  'doc-sync-report.json'
];
const suggestionsPath = path.join(logsDir, 'kernel-reprompt-suggestions.txt');
const pendingPath = path.join(logsDir, 'pending-prompts.json');

function read(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return ''; }
}

function parseStandards() {
  const p = path.join(logsDir, 'standards-failures.json');
  const out = [];
  if (fs.existsSync(p)) {
    try {
      const arr = JSON.parse(read(p));
      arr.forEach(f => {
        if (f && f.message) out.push(`Fix ${f.category}: ${f.message} (${f.file})`);
      });
    } catch {}
  }
  return out;
}

function parseFinalStatus() {
  const p = path.join(logsDir, 'kernel-final-status.json');
  const out = [];
  if (fs.existsSync(p)) {
    try {
      const data = JSON.parse(read(p));
      if (data.kernelCompliant === false) {
        out.push(`Kernel not compliant: ${data.standardsFailures} standards failures`);
      }
    } catch {}
  }
  return out;
}

function parseVerifyLog() {
  const p = path.join(logsDir, 'make-verify-output.log');
  const out = [];
  if (fs.existsSync(p)) {
    const txt = read(p);
    txt.split(/\r?\n/).forEach(line => {
      if (line.includes('❌')) {
        out.push(line.substring(line.indexOf('❌') + 1).trim());
      }
    });
  }
  return out;
}

function parseDocSync() {
  const p = path.join(logsDir, 'doc-sync-report.json');
  const out = [];
  const text = read(p);
  if (text.includes('❌')) {
    text.split(/\r?\n/).forEach(line => {
      if (line.includes('❌')) out.push(line.substring(line.indexOf('❌') + 1).trim());
    });
  }
  return out;
}

function collectPrompts() {
  const prompts = [];
  prompts.push(...parseStandards());
  prompts.push(...parseFinalStatus());
  prompts.push(...parseVerifyLog());
  prompts.push(...parseDocSync());
  return prompts;
}

function save(prompts) {
  fs.writeFileSync(suggestionsPath, prompts.join('\n') + (prompts.length ? '\n' : ''));
  fs.writeFileSync(pendingPath, JSON.stringify(prompts, null, 2));
}

function update() {
  const prompts = collectPrompts();
  save(prompts);
}

function watch() {
  files.forEach(f => {
    const p = path.join(logsDir, f);
    fs.watchFile(p, { interval: 1000 }, update);
  });
  update();
}

if (require.main === module) {
  if (process.argv.includes('--once')) {
    update();
  } else {
    watch();
  }
}
