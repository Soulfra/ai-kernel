#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ALLOWED_DIRS = [
  'examples', // Allow direct logging in examples
  'CLARITY_ENGINE_DOCS/examples',
];
const LOG_PATTERNS = [/console\.log\s*\(/, /console\.error\s*\(/, /console\.warn\s*\(/];
const CANONICAL_LOGGER = 'LogOrchestrator';
const CANONICAL_LOGGER_PATH = 'scripts/core/log-orchestrator.js';

const EXCLUDED_DIRS = [
  'node_modules',
  'CLARITY_ENGINE_DOCS/node_modules',
  '.git',
  'logs',
  'coverage',
  'dist',
  'build',
  'cache',
  'backups',
  'test-migration',
  'CLARITY_ENGINE_EXPANSION_DOCS',
  'CLARITY_ENGINE_HANDOFF',
  'Engine_Expansion_Handoff',
  'whisper_env',
  'venv',
  '__pycache__',
];

let violations = [];

function isAllowed(filePath) {
  return ALLOWED_DIRS.some(dir => filePath.includes(path.sep + dir + path.sep));
}

function isExcluded(filePath) {
  return EXCLUDED_DIRS.some(dir => filePath.includes(path.sep + dir + path.sep));
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  LOG_PATTERNS.forEach(pattern => {
    if (pattern.test(content) && !isAllowed(filePath)) {
      violations.push({ file: filePath, pattern: pattern.toString() });
    }
  });
  // Check orchestrators for canonical logger usage
  if (
    filePath.includes('orchestrator') &&
    !content.includes(CANONICAL_LOGGER)
  ) {
    violations.push({ file: filePath, pattern: 'Missing canonical LogOrchestrator' });
  }
}

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (!isExcluded(filePath)) {
        results = results.concat(walk(filePath));
      }
    } else {
      if (!isExcluded(filePath)) {
        results.push(filePath);
      }
    }
  });
  return results;
}

walk(ROOT).forEach(filePath => {
  scanFile(filePath);
});

if (violations.length > 0) {
  console.error('Logging validation failed!');
  violations.forEach(v => {
    console.error(`  [${v.pattern}] in ${v.file}`);
  });
  process.exit(1);
} else {
  console.log('Logging validation passed: All logging is canonical.');
} 