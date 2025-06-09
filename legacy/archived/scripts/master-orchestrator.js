// Master Orchestrator: Runs the full pipeline in sequence, logs via orchestrator, emits events, generates reports
const { spawnSync } = require('child_process');
const { LogOrchestrator } = require('./core/log-orchestrator');
const { TelemetryManager } = require('./core/telemetry-manager');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

function runScript(script, args = [], traceId) {
  const result = spawnSync('node', [script, ...args], { encoding: 'utf8' });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr, script, traceId };
}

function writeReport(report, traceId) {
  const outPath = path.join('./logs', `run-report-${traceId}.md`);
  fs.writeFileSync(outPath, report);
  return outPath;
}

function generateMarkdownReport(results, traceId) {
  let md = `# Pipeline Run Report\n\n- **Trace ID:** ${traceId}\n- **Timestamp:** ${new Date().toISOString()}\n\n`;
  results.forEach(r => {
    md += `## ${r.stage}\n- **Script:** ${r.script}\n- **Exit Code:** ${r.code}\n- **Stdout:**\n\n\n${r.stdout}\n\n- **Stderr:**\n\n\n${r.stderr}\n\n`;
    if (r.error) md += `- **Error:** ${r.error}\n`;
  });
  return md;
}

async function main() {
  if (process.argv.includes('--help')) {
    console.log('Usage: node master-orchestrator.js [--dry-run] [--rollback] [--report] [--help]\nRuns the full pipeline: intake, extraction, clustering, indexing, validation, analytics.');
    process.exit(0);
  }
  const logger = new LogOrchestrator();
  const telemetry = new TelemetryManager();
  const dryRun = process.argv.includes('--dry-run');
  const rollback = process.argv.includes('--rollback');
  const report = process.argv.includes('--report');
  const traceId = uuidv4();
  const results = [];

  logger.info('Master orchestrator started', { dryRun, rollback, report, traceId });
  logger.emit('task:event', { type: 'master_orchestrator_started', dryRun, rollback, report, traceId });

  if (rollback) {
    logger.info('Running rollback', { traceId });
    const r = runScript('rollback.js', [], traceId);
    results.push({ ...r, stage: 'Rollback' });
    logger.emit('task:event', { type: 'rollback_executed', traceId });
    process.exit(0);
  }

  const stages = [
    { name: 'Intake', script: 'intake-daemon.js' },
    { name: 'Extraction', script: 'extractor.js' },
    { name: 'Clustering', script: 'clusterer.js' },
    { name: 'Indexing', script: 'indexer.js' },
    { name: 'Validation', script: 'validate-all.js' },
    { name: 'Analytics', script: 'analytics-dashboard.js' }
  ];

  for (const stage of stages) {
    logger.info(`Running ${stage.name}`, { traceId });
    try {
      const r = runScript(stage.script, dryRun ? ['--dry-run'] : [], traceId);
      results.push({ ...r, stage: stage.name });
      if (r.code !== 0) {
        logger.error(`${stage.name} failed`, { traceId, error: r.stderr });
        logger.emit('task:event', { type: `${stage.name.toLowerCase()}_failed`, traceId, error: r.stderr });
        // Optionally halt on error:
        // break;
      } else {
        logger.emit('task:event', { type: `${stage.name.toLowerCase()}_completed`, traceId });
      }
    } catch (e) {
      logger.error(`${stage.name} error`, { traceId, error: e.message });
      logger.emit('task:event', { type: `${stage.name.toLowerCase()}_error`, traceId, error: e.message });
      results.push({ stage: stage.name, script: stage.script, code: -1, stdout: '', stderr: '', error: e.message });
      // Optionally halt on error:
      // break;
    }
  }

  if (report) {
    logger.info('Generating report', { traceId });
    const md = generateMarkdownReport(results, traceId);
    const outPath = writeReport(md, traceId);
    logger.emit('task:event', { type: 'report_generated', traceId, outPath });
    console.log(`Run report written to: ${outPath}`);
  }

  logger.info('Master orchestrator run complete', { traceId });
  logger.emit('task:event', { type: 'master_orchestrator_complete', traceId });
  // TODO: Add log rotation, notification hooks, and advanced reporting (see enhancement backlog)
}

if (require.main === module) main();
// Documentation: Runs the full pipeline, uses orchestrator/telemetry for all logging and event emission. Supports --help, --dry-run, --rollback, --report. Generates Markdown run reports with trace IDs. 