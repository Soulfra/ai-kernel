#!/usr/bin/env node
/**
 * external_meta_workflow.js
 * Automates the full external meta workflow for agency handoff and return.
 *
 * Standards:
 *   - Modular, non-recursive, <250 lines per function
 *   - All logging via LogOrchestrator
 *   - All metrics via TelemetryManager
 *   - Validation scripts run after copy/merge
 *   - Usage: node scripts/external_meta_workflow.js run-all
 */
const fs = require('fs');
const path = require('path');
const LogOrchestrator = require('./core/log-orchestrator');
const TelemetryManager = require('./core/telemetry-manager');

const META_DIR = 'project_meta';
const EXTERNAL_DIR = 'project_meta_external';
const EXTERNAL_ZIP = 'project_meta_external.zip';
const LOG_DIR = './logs/debug';
const METRICS_DIR = './logs/metrics';
const TASK_LOG = path.join(META_DIR, 'task_logs', 'main_task_log.json');
const TASK_PLAN_TEMPLATE = path.join(META_DIR, 'plans', 'TASK_PLAN_TEMPLATE.json');
const PLANS_DIR = path.join(META_DIR, 'plans');

const logger = new LogOrchestrator({ logDir: LOG_DIR });
const telemetry = new TelemetryManager({ metricsDir: METRICS_DIR });

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function saveJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}
function pruneFiles(dir, ignoreFile) {
  if (!fs.existsSync(ignoreFile)) return;
  const patterns = fs.readFileSync(ignoreFile, 'utf8').split('\n').map(l => l.trim()).filter(Boolean);
  for (const pattern of patterns) {
    const matches = require('glob').sync(path.join(dir, pattern));
    for (const match of matches) fs.rmSync(match, { recursive: true, force: true });
  }
}
async function batchGenerateTaskPlans() {
  const span = await telemetry.startSpan('batchGenerateTaskPlans');
  const tasks = loadJson(TASK_LOG);
  const template = loadJson(TASK_PLAN_TEMPLATE);
  let count = 0;
  for (const task of tasks) {
    if (!task.taskId) continue;
    const outFile = path.join(PLANS_DIR, `TASK_PLAN_${task.taskId}.json`);
    if (!fs.existsSync(outFile)) {
      const plan = JSON.parse(JSON.stringify(template));
      plan.taskMetadata = { ...plan.taskMetadata, ...task };
      saveJson(outFile, plan);
      count++;
    }
  }
  await logger.info('Batch generated task plans', { count });
  await telemetry.recordMetric('batch_task_plans', count);
  await telemetry.endSpan('batchGenerateTaskPlans');
}
async function createExternalCopyWithPrune() {
  const span = await telemetry.startSpan('createExternalCopyWithPrune');
  if (fs.existsSync(EXTERNAL_DIR)) fs.rmSync(EXTERNAL_DIR, { recursive: true, force: true });
  require('child_process').execSync(`cp -R ${META_DIR} ${EXTERNAL_DIR}`);
  const ignoreFile = path.join(EXTERNAL_DIR, '.metaignore');
  if (fs.existsSync(ignoreFile)) pruneFiles(EXTERNAL_DIR, ignoreFile);
  await logger.info('External copy created with pruning', {});
  await telemetry.recordMetric('external_copy_pruned', 1);
  await telemetry.endSpan('createExternalCopyWithPrune');
}
function generateOnboardingChecklist() {
  const checklist = [
    'Fill out all task plan files in plans/',
    'Update task logs as needed',
    'Run validation scripts before returning',
    'Zip and return the entire directory',
  ];
  fs.writeFileSync(path.join(EXTERNAL_DIR, 'ONBOARDING_CHECKLIST.md'), checklist.map(i => `- [ ] ${i}`).join('\n'));
}
function updateTaskLogEvent(event) {
  const tasks = loadJson(TASK_LOG);
  tasks.push({
    taskId: `auto_${Date.now()}`,
    description: event,
    status: 'completed',
    lastUpdated: new Date().toISOString(),
    notes: 'Automated by external_meta_workflow.js'
  });
  saveJson(TASK_LOG, tasks);
}
async function zipExternalCopy() {
  const span = await telemetry.startSpan('zipExternalCopy');
  if (fs.existsSync(EXTERNAL_ZIP)) fs.rmSync(EXTERNAL_ZIP);
  require('child_process').execSync(`zip -r ${EXTERNAL_ZIP} ${EXTERNAL_DIR}`);
  await logger.info('External copy zipped', { zip: EXTERNAL_ZIP });
  await telemetry.recordMetric('external_copy_zipped', 1);
  await telemetry.endSpan('zipExternalCopy');
}
async function runValidationScripts() {
  const scripts = [
    'scripts/validate-logging.js',
    'scripts/validate-telemetry.js',
    'scripts/validate-docs.js'
  ];
  for (const script of scripts) {
    try {
      require('child_process').execSync(`node ${script}`, { stdio: 'pipe' });
      await logger.info('Validation passed', { script });
      await telemetry.recordMetric('validation_success', 1, { script });
    } catch (e) {
      await logger.error('Validation failed', { script, error: e.message });
      await telemetry.recordMetric('validation_failure', 1, { script, error: e.message });
    }
  }
}
async function runAll() {
  await logger.initialize();
  await telemetry.initialize();
  await batchGenerateTaskPlans();
  await createExternalCopyWithPrune();
  generateOnboardingChecklist();
  await zipExternalCopy();
  await runValidationScripts();
  updateTaskLogEvent('Ran full external meta workflow');
  await logger.cleanup();
  await telemetry.cleanup();
}
if (process.argv[2] === 'run-all') runAll();
// TODO: Add unit tests for each function
// TODO: Modularize further if needed
// TODO: Add smart diff/merge, integrity checks, and feedback extraction 