#!/usr/bin/env node
/**
 * magic-list-engine.js
 * Aggregates actionable items from all feedback/insight sources, clusters/deduplicates/tags, and outputs a single actionable list.
 * Sources: conversation logs, debug logs, suggestion logs, archiving/batch summaries, living TODOs, user feedback.
 * Outputs to terminal and project_meta/insights/magic_list_dashboard.md. Logs its own run and errors.
 */
const fs = require('fs');
const path = require('path');
const logPath = 'project_meta/suggestion_log.md';
const dashboardPath = 'project_meta/insights/magic_list_dashboard.md';
const finalizationPlanPath = 'project_meta/plans/FINALIZATION_PLAN.md';
const magicGoalListPath = 'project_meta/insights/magic_goal_list.md';
const debugLogPath = 'project_meta/debug_logs/DEBUG_LOG_jest_zzz-file-operations_discovery.md';
const convoLogPath = 'project_meta/insights/conversation_log.md';
const batchSummaryDir = 'project_meta/insights';
const LogOrchestrator = require('./core/log-orchestrator');
const logger = new LogOrchestrator({ module: 'MagicListEngine' });

function logSuggestion(message) {
  const entry = `\n[${new Date().toISOString()}] ${message}`;
  fs.appendFileSync(logPath, entry + '\n');
  logger.info(message);
}
function readFileSafe(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); } catch (e) { logSuggestion(`Error reading file: ${filePath} - ${e.message}`); return ''; }
}
function parseItemsFromContent(content, regex, tag) {
  const items = [];
  const lines = content.split('\n');
  for (const line of lines) {
    if (regex.test(line)) items.push({ text: line.trim(), tag });
  }
  return items;
}
function parseBatchSummaries(dir) {
  const items = [];
  if (!fs.existsSync(dir)) return items;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md') || f.endsWith('.log'));
  for (const file of files) {
    const content = readFileSafe(path.join(dir, file));
    if (content.includes('gap') || content.includes('error') || content.includes('remediation')) {
      items.push({ text: `[${file}] ${content.split('\n').find(l => l.match(/gap|error|remediation/i)) || ''}`.trim(), tag: 'batch' });
    }
  }
  return items;
}
function deduplicateAndCluster(items) {
  const seen = new Set();
  const clusters = {};
  for (const item of items) {
    const key = item.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (!clusters[item.tag]) clusters[item.tag] = [];
    clusters[item.tag].push(item.text);
  }
  return clusters;
}
function outputMagicList(clusters) {
  let out = '\n=== MAGIC LIST (Unified Actionable Items) ===\n';
  for (const tag in clusters) {
    out += `\n--- ${tag.toUpperCase()} ---\n`;
    clusters[tag].forEach(item => { out += '- ' + item + '\n'; });
  }
  if (Object.keys(clusters).length === 0) out += 'No actionable items found. System is healthy!\n';
  console.log(out);
  fs.writeFileSync(dashboardPath, out);
}
function main() {
  try {
    logSuggestion('Magic List Engine run started.');
    const items = [];
    // Suggestion log
    items.push(...parseItemsFromContent(readFileSafe(logPath), /^\[.*\]/, 'suggestion'));
    // Debug log
    items.push(...parseItemsFromContent(readFileSafe(debugLogPath), /error|fail|gap|remediation/i, 'debug'));
    // Conversation log
    items.push(...parseItemsFromContent(readFileSafe(convoLogPath), /TODO|gap|error|remediation/i, 'conversation'));
    // Finalization plan TODOs
    items.push(...parseItemsFromContent(readFileSafe(finalizationPlanPath), /- \[ \]/, 'todo'));
    // Magic goal list TODOs
    items.push(...parseItemsFromContent(readFileSafe(magicGoalListPath), /- \[ \]/, 'goal'));
    // Batch summaries
    items.push(...parseBatchSummaries(batchSummaryDir));
    const clusters = deduplicateAndCluster(items);
    outputMagicList(clusters);
    logSuggestion('Magic List Engine run completed successfully.');
  } catch (e) {
    logSuggestion('Magic List Engine run failed: ' + e.message);
    logger.error('Magic List Engine run failed', { error: e });
    console.error('Error running Magic List Engine:', e);
    process.exit(1);
  }
}
if (require.main === module) { main(); } 