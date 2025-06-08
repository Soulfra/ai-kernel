#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const RULES_PATH = path.join(process.cwd(), '.cursorrules.json');
const rules = JSON.parse(fs.readFileSync(RULES_PATH, 'utf8'));

const EXCLUDED_DIRS = [
  'backups',
  'test-suite',
  'CLARITY_ENGINE_DOCS/backups',
  'CLARITY_ENGINE_DOCS/CLARITY_ENGINE_DOCS/archive',
];

const DOCS_DIR = path.join(process.cwd(), 'docs');
const TARGETS = [
  { dir: 'scripts/core', suffix: '-orchestrator.js', docDir: 'docs/components/orchestration', docSuffix: '-orchestrator.md' },
  { dir: 'scripts/core', suffix: '-handler.js', docDir: 'docs/components', docSuffix: '-handler.md' },
  // Add more as needed
];

function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function generateDocStub(name, type) {
  const now = new Date().toISOString();
  const frontmatter = [
    '---',
    `title: ${name}`,
    `description: TODO: Add description`,
    `lastUpdated: ${now}`,
    `version: 1.0.0`,
    'tags: []',
    'status: draft',
    '---',
    ''
  ];
  // Add required fields from rules if not present
  for (const field of rules.requiredDocFields || []) {
    if (!frontmatter.some(line => line.startsWith(field + ':'))) {
      frontmatter.splice(-2, 0, `${field}: TODO`);
    }
  }
  return frontmatter.join('\n') + `\n\n# ${name}\n\n## Overview\n\nTODO\n`;
}

function scanAndGenerate(root) {
  for (const target of TARGETS) {
    const dirPath = path.join(process.cwd(), target.dir);
    if (!fs.existsSync(dirPath)) continue;
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith(target.suffix));
    for (const file of files) {
      const base = file.replace(/\.js$/, '');
      const docName = base + target.docSuffix;
      const docPath = path.join(process.cwd(), target.docDir, docName);
      if (EXCLUDED_DIRS.some(ex => docPath.includes(ex))) continue;
      ensureDirSync(path.dirname(docPath));
      if (!fs.existsSync(docPath)) {
        const stub = generateDocStub(base, target.suffix.replace('.js', ''));
        fs.writeFileSync(docPath, stub, 'utf8');
        console.log(`Generated doc stub: ${docPath}`);
      }
    }
  }
  console.log('Doc stub generation complete.');
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const root = args[0] || 'docs/';
  scanAndGenerate(root);
} 