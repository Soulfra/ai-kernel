#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const builtin = new Set(require('module').builtinModules);

const repoRoot = path.resolve(__dirname, '../..');
const scriptsDir = path.resolve(__dirname, '..');
const warnings = [];

function scanDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(full);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      scanFile(full);
    }
  }
}

function scanFile(file) {
  const content = fs.readFileSync(file, 'utf8');
  const regex = /require\(['"]([^'"\)]+)['"]\)/g;
  let match;
  while ((match = regex.exec(content))) {
    const modName = match[1];
    if (modName.startsWith('.') || builtin.has(modName)) continue;
    // skip requireOrInstall usage
    const before = content.slice(0, match.index);
    if (/requireOrInstall\s*$/.test(before.split(/\n/).pop())) continue;
    warnings.push({ file: path.relative(repoRoot, file), module: modName });
  }
}

scanDir(scriptsDir);

if (warnings.length) {
  const logsDir = path.join(repoRoot, 'logs');
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
  const out = path.join(logsDir, 'import-warnings.json');
  fs.writeFileSync(out, JSON.stringify(warnings, null, 2));
  warnings.forEach(w => {
    console.warn(`Unprotected require of '${w.module}' in ${w.file}`);
  });
} else {
  console.log('No unprotected requires found.');
}
