#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const SENSITIVE_PATTERNS = [
  { name: 'email', regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[REDACTED_EMAIL]' },
  { name: 'apiKey', regex: /(?<=api[_-]?key["':=\s]*)([A-Za-z0-9\-_]{16,})/gi, replacement: '[REDACTED_API_KEY]' },
  { name: 'dbUri', regex: /mongodb\+srv:\/\/[^\s'"`]+/g, replacement: '[REDACTED_DB_URI]' },
  { name: 'ssn', regex: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[REDACTED_SSN]' },
  { name: 'creditCard', regex: /\b(?:\d[ -]*?){13,16}\b/g, replacement: '[REDACTED_CREDIT_CARD]' },
  { name: 'phone', regex: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, replacement: '[REDACTED_PHONE]' },
  { name: 'jwt', regex: /eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/g, replacement: '[REDACTED_JWT]' },
  { name: 'oauthToken', regex: /ya29\.[0-9A-Za-z\-_]+/g, replacement: '[REDACTED_OAUTH_TOKEN]' },
  { name: 'lastName', regex: /\b([A-Z][a-z]+)\s([A-Z][a-z]+)\b/g, replacement: (m, f, l) => `${f} [REDACTED_LASTNAME]` },
  // Add more as needed
];

const EXCLUDED_DIRS = [
  'node_modules', 'backups', 'test-suite', 'CLARITY_ENGINE_DOCS/backups', 'CLARITY_ENGINE_DOCS/CLARITY_ENGINE_DOCS/archive'
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) {
      if (EXCLUDED_DIRS.some(ex => full.includes(ex))) continue;
      walk(full, files);
    } else {
      files.push(full);
    }
  }
  return files;
}

function sanitizeFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  let actions = [];
  for (const pattern of SENSITIVE_PATTERNS) {
    const before = content;
    content = content.replace(pattern.regex, pattern.replacement);
    if (content !== before) {
      changed = true;
      actions.push(pattern.name);
    }
  }
  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    return actions;
  }
  return null;
}

function main() {
  const root = process.argv[2] || 'docs/';
  const files = walk(root);
  let total = 0;
  let sanitized = 0;
  let summary = {};
  let fileActions = [];
  for (const file of files) {
    total++;
    const actions = sanitizeFile(file);
    if (actions) {
      sanitized++;
      for (const act of actions) summary[act] = (summary[act] || 0) + 1;
      fileActions.push({ file, actions });
      console.log(`Sanitized: ${file} [${actions.join(', ')}]`);
    }
  }
  // Write compliance report
  const report = {
    timestamp: new Date().toISOString(),
    root,
    totalFiles: total,
    sanitizedFiles: sanitized,
    summary,
    fileActions
  };
  fs.writeFileSync('sanitizer-report.json', JSON.stringify(report, null, 2), 'utf8');
  // Markdown summary
  let md = `# Sanitizer Compliance Report\n\n- Timestamp: ${report.timestamp}\n- Root: ${root}\n- Total Files: ${total}\n- Sanitized Files: ${sanitized}\n\n## Summary\n`;
  Object.entries(summary).forEach(([k, v]) => { md += `- ${k}: ${v}\n`; });
  md += '\n## Sanitized Files\n';
  fileActions.forEach(fa => { md += `- ${fa.file}: [${fa.actions.join(', ')}]\n`; });
  fs.writeFileSync('sanitizer-report.md', md, 'utf8');
  console.log(`\nSanitization complete. ${sanitized}/${total} files sanitized.`);
  Object.entries(summary).forEach(([k, v]) => {
    console.log(`  ${k}: ${v}`);
  });
  console.log('\nCompliance report written to sanitizer-report.json and sanitizer-report.md');
}

if (require.main === module) main(); 