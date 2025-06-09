/**
 * @file update-docs.js
 * @description Parses orchestrator logs and batches.json to update TEST_SUITE_ORCHESTRATION.md and test-run-report.md. Appends a summary for each completed batch. Usage: node scripts/update-docs.js
 */

const fs = require('fs').promises;
const path = require('path');

const BATCHES_PATH = path.resolve(__dirname, 'batches.json');
const ORCH_DOC = path.resolve(__dirname, '../docs/testing/TEST_SUITE_ORCHESTRATION.md');
const TEST_RUN_REPORT = path.resolve(__dirname, '../docs/test-run-report.md');

function formatBatchSummary(batch) {
  const now = new Date().toISOString();
  return `| ${batch.id} | ${batch.type} | ${batch.batch} | ${batch.actions.length} actions | ${batch.user} | ${batch.status} | ${now} |\n`;
}

async function appendToDoc(docPath, content, marker) {
  let doc = await fs.readFile(docPath, 'utf8');
  const idx = doc.lastIndexOf(marker);
  if (idx !== -1) {
    const insertIdx = doc.indexOf('\n', idx) + 1;
    doc = doc.slice(0, insertIdx) + content + doc.slice(insertIdx);
    await fs.writeFile(docPath, doc);
  } else {
    await fs.appendFile(docPath, '\n' + content);
  }
}

async function main() {
  const batches = JSON.parse(await fs.readFile(BATCHES_PATH, 'utf8'));
  const completed = batches.filter(b => b.status === 'done' || b.status === 'completed' || b.status === 'success');
  if (!completed.length) {
    console.log('No completed batches to document.');
    return;
  }
  // Update orchestration doc
  const orchMarker = '|------|';
  const orchContent = completed.map(formatBatchSummary).join('');
  await appendToDoc(ORCH_DOC, orchContent, orchMarker);
  // Update test run report
  const reportContent = completed.map(b => `\n## Batch: ${b.id}\n- Type: ${b.type}\n- Batch: ${b.batch}\n- Actions: ${b.actions.length}\n- User: ${b.user}\n- Status: ${b.status}\n- Timestamp: ${new Date().toISOString()}\n`).join('');
  await fs.appendFile(TEST_RUN_REPORT, reportContent);
  console.log('Docs and test run report updated for completed batches.');
}

if (require.main === module) {
  main().catch(err => {
    console.error('Failed to update docs:', err);
    process.exit(1);
  });
} 