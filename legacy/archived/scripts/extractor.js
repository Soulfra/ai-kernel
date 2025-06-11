// Extraction Script: Processes /ready/ files, extracts concepts, outputs to /concepts/, logs actions via orchestrator
const fs = require('fs');
const path = require('path');
const { LogOrchestrator } = require('./core/log-orchestrator');
const { TelemetryManager } = require('./core/telemetry-manager');

const READY_DIR = process.env.READY_DIR || './ready';
const CONCEPTS_DIR = process.env.CONCEPTS_DIR || './concepts';

function extractConcepts(content) {
  // TODO: Integrate LLM for advanced extraction
  // Placeholder: extract words >4 chars as concepts
  const words = content.match(/\b\w{5,}\b/g) || [];
  return Array.from(new Set(words));
}

async function processFile(file, logger, telemetry) {
  const src = path.join(READY_DIR, file);
  const dest = path.join(CONCEPTS_DIR, file + '.concepts.json');
  try {
    const content = fs.readFileSync(src, 'utf8');
    const concepts = extractConcepts(content);
    fs.writeFileSync(dest, JSON.stringify({ file, concepts }, null, 2));
    logger.info('Extracted concepts', { file, count: concepts.length });
    telemetry.recordMetric('concepts_extracted', concepts.length, { file });
    logger.emit('task:event', { type: 'concepts_extracted', file, count: concepts.length });
    // Mark as done
    fs.renameSync(src, src + '.done');
  } catch (e) {
    logger.error('Error processing file', { file, error: e.message });
    telemetry.recordMetric('extractor_error', 1, { file, error: e.message });
    logger.emit('task:event', { type: 'extractor_error', file, error: e.message });
  }
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function main() {
  if (process.argv.includes('--help')) {
    console.log('Usage: node extractor.js [--help]\nProcesses files in /ready/, extracts concepts, outputs to /concepts/.');
    process.exit(0);
  }
  const logger = new LogOrchestrator();
  const telemetry = new TelemetryManager();
  ensureDir(CONCEPTS_DIR);
  const files = fs.readdirSync(READY_DIR).filter(f => !f.endsWith('.done'));
  for (const file of files) {
    await processFile(file, logger, telemetry);
  }
  logger.info('Extraction run complete', { processed: files.length });
  logger.emit('task:event', { type: 'extraction_complete', processed: files.length });
}

if (require.main === module) main();
// Documentation: All logging and error handling is via orchestrator/telemetry injection. Task events are emitted for traceability. 