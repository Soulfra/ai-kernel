#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function main() {
  const sanitizer = readJson('sanitizer-report.json');
  const docValidation = fs.existsSync('validation.log') ? fs.readFileSync('validation.log', 'utf8') : '';
  const testLog = fs.existsSync('test.log') ? fs.readFileSync('test.log', 'utf8') : '';
  const autoheal = fs.existsSync('autoheal.log') ? fs.readFileSync('autoheal.log', 'utf8') : '';

  const status = {
    timestamp: new Date().toISOString(),
    sanitizer: sanitizer || {},
    docValidationSummary: docValidation.split('\n').slice(0, 20).join('\n'),
    testLogSummary: testLog.split('\n').slice(0, 20).join('\n'),
    autohealSummary: autoheal.split('\n').slice(0, 20).join('\n'),
  };

  fs.writeFileSync('system-status.json', JSON.stringify(status, null, 2), 'utf8');

  let md = `# System Status\n\n- Timestamp: ${status.timestamp}\n\n## Sanitizer Compliance\n`;
  if (sanitizer) {
    md += `- Total Files: ${sanitizer.totalFiles}\n- Sanitized Files: ${sanitizer.sanitizedFiles}\n`;
    Object.entries(sanitizer.summary || {}).forEach(([k, v]) => { md += `  - ${k}: ${v}\n`; });
  }
  md += '\n## Doc Validation (first 20 lines)\n';
  md += status.docValidationSummary + '\n';
  md += '\n## Test Log (first 20 lines)\n';
  md += status.testLogSummary + '\n';
  md += '\n## Autoheal Log (first 20 lines)\n';
  md += status.autohealSummary + '\n';

  fs.writeFileSync('SYSTEM_STATUS.md', md, 'utf8');
  console.log('System status written to SYSTEM_STATUS.md and system-status.json');
}

if (require.main === module) main(); 