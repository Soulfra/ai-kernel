#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const CORE_DIR = path.join(__dirname, 'core');
const AGENTS_DIR = path.join(__dirname, '../../agents');
const TESTS_DIR = path.join(__dirname, 'core/tests');
const TASK_LOG = path.join(__dirname, '../../project_meta/task_logs/main_task_log.json');

function getJsFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.js'))
    .map(f => path.join(dir, f));
}

function scanFileForPattern(file, pattern) {
  const content = fs.readFileSync(file, 'utf8');
  return pattern.test(content);
}

function scanTestForLogAssertion(testFile, className) {
  const content = fs.readFileSync(testFile, 'utf8');
  return content.includes(`using DI override`) && content.includes(className);
}

function validateDiCoverage() {
  const files = [
    ...getJsFiles(CORE_DIR),
    ...getJsFiles(AGENTS_DIR)
  ];
  const testFiles = getJsFiles(TESTS_DIR);
  const missing = [];
  const report = [];

  for (const file of files) {
    const base = path.basename(file);
    const className = base.replace('.js', '');
    const hasOverride = scanFileForPattern(file, /orchestratorOverrides/);
    const hasLog = scanFileForPattern(file, /logger\.info\(['"`].*using DI override/);
    const testFile = testFiles.find(f => f.toLowerCase().includes(className.toLowerCase()));
    const hasTest = testFile ? scanTestForLogAssertion(testFile, className) : false;
    report.push({ file: base, hasOverride, hasLog, hasTest });
    if (!hasOverride || !hasLog || !hasTest) {
      missing.push({ file: base, hasOverride, hasLog, hasTest });
    }
  }
  return { report, missing };
}

function logToTaskLog(result) {
  let log = [];
  if (fs.existsSync(TASK_LOG)) {
    try { log = JSON.parse(fs.readFileSync(TASK_LOG, 'utf8')); } catch { log = []; }
  } else {
    // If the file does not exist, initialize as empty array
    log = [];
  }
  log.push({
    taskId: `validate-di-coverage-${Date.now()}`,
    description: 'Automated DI/override validation run',
    status: result.missing.length === 0 ? 'success' : 'failed',
    timestamp: new Date().toISOString(),
    details: result.missing
  });
  fs.writeFileSync(TASK_LOG, JSON.stringify(log, null, 2));
}

function main() {
  const result = validateDiCoverage();
  logToTaskLog(result);
  console.log('DI/Override Validation Report:');
  for (const entry of result.report) {
    console.log(`${entry.file}: override=${entry.hasOverride} log=${entry.hasLog} test=${entry.hasTest}`);
  }
  if (result.missing.length > 0) {
    console.error('\nMissing DI/override support or test coverage in:');
    for (const entry of result.missing) {
      console.error(`- ${entry.file} (override=${entry.hasOverride} log=${entry.hasLog} test=${entry.hasTest})`);
    }
    process.exit(1);
  } else {
    console.log('\nAll orchestrators/agents have DI/override support, logging, and test coverage.');
    process.exit(0);
  }
}

if (require.main === module) main(); 