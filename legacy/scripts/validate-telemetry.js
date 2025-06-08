#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ALLOWED_DIRS = [
  'examples',
  'CLARITY_ENGINE_DOCS/examples',
];
const TELEMETRY_PATTERNS = [
  /TelemetryManager/,
  /recordMetric/,
  /trackMetric/,
  /startSpan/,
  /endSpan/,
  /trackSource/,
  /generateReport\s*\(/,
];
const CANONICAL_TELEMETRY = 'TelemetryManager';
const CANONICAL_TELEMETRY_PATH = 'scripts/core/telemetry-manager.js';

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
  // Check for orchestrators and major scripts missing TelemetryManager
  if (
    filePath.includes('orchestrator') ||
    filePath.includes('execute') ||
    filePath.includes('run-')
  ) {
    if (!content.includes(CANONICAL_TELEMETRY)) {
      violations.push({ file: filePath, pattern: 'Missing canonical TelemetryManager' });
    }
  }
  // Check for direct telemetry/metric code
  TELEMETRY_PATTERNS.forEach(pattern => {
    if (pattern.test(content) && !isAllowed(filePath)) {
      // This is a positive, not a violation, but we could log files that use telemetry
    }
  });
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
  console.error('Telemetry validation failed!');
  violations.forEach(v => {
    console.error(`  [${v.pattern}] in ${v.file}`);
  });
  process.exit(1);
} else {
  console.log('Telemetry validation passed: All orchestrators and major scripts use TelemetryManager.');
} 