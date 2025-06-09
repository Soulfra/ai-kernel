#!/usr/bin/env node
/**
 * active-suggestions.js
 * CLI utility to aggregate and surface actionable suggestions, TODOs, and errors from logs and living docs.
 *
 * Sources:
 *   - project_meta/suggestion_log.md
 *   - project_meta/plans/FINALIZATION_PLAN.md
 *   - project_meta/insights/ (batch meta-summaries)
 *
 * Outputs a prioritized, actionable list in the terminal.
 * Logs its own run and any errors to LogOrchestrator and the suggestion log.
 */
const fs = require('fs');
const path = require('path');
const logPath = 'project_meta/suggestion_log.md';
const finalizationPlanPath = 'project_meta/plans/FINALIZATION_PLAN.md';
const insightsDir = 'project_meta/insights';
const LogOrchestrator = require('./core/log-orchestrator');
const logger = new LogOrchestrator({ module: 'ActiveSuggestions' });

function logSuggestion(message) {
  const entry = `\n[${new Date().toISOString()}] ${message}`;
  fs.appendFileSync(logPath, entry + '\n');
  logger.info(message);
}

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    logSuggestion(`Error reading file: ${filePath} - ${e.message}`);
    return '';
  }
}

function parseSuggestionLog(content) {
  // Extract timestamped entries and remediation steps
  const entries = [];
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.startsWith('[') && line.includes(']')) {
      entries.push(line.trim());
    }
  }
  return entries;
}

function parseFinalizationPlan(content) {
  // Extract TODOs from the Living TODO List section
  const todos = [];
  const todoSection = content.split('## 3. Living TODO List')[1] || '';
  const lines = todoSection.split('\n');
  let currentCluster = '';
  for (const line of lines) {
    if (line.startsWith('#### ')) {
      currentCluster = line.replace('#### ', '').trim();
    } else if (line.match(/- \[ \]/)) {
      todos.push({ cluster: currentCluster, todo: line.replace('- [ ] ', '').trim() });
    }
  }
  return todos;
}

function parseInsights(dir) {
  // Look for recent batch meta-summaries and lessons learned
  const summaries = [];
  if (!fs.existsSync(dir)) return summaries;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md') || f.endsWith('.log'));
  for (const file of files) {
    const content = readFileSafe(path.join(dir, file));
    if (content.includes('gap') || content.includes('error') || content.includes('remediation')) {
      summaries.push({ file, content });
    }
  }
  return summaries;
}

function outputSuggestions(suggestions, todos, insights) {
  console.log('\n=== ACTIVE SUGGESTIONS & TODOs ===\n');
  if (suggestions.length) {
    console.log('--- Recent Surfaced Gaps & Errors ---');
    suggestions.slice(-10).forEach(s => console.log(s));
    console.log('');
  }
  if (todos.length) {
    console.log('--- Living TODOs (by Cluster) ---');
    let lastCluster = '';
    todos.forEach(({ cluster, todo }) => {
      if (cluster !== lastCluster) {
        console.log(`\n[${cluster}]`);
        lastCluster = cluster;
      }
      console.log('- ' + todo);
    });
    console.log('');
  }
  if (insights.length) {
    console.log('--- Recent Insights & Lessons Learned ---');
    insights.slice(-3).forEach(({ file, content }) => {
      console.log(`\n[${file}]`);
      const lines = content.split('\n').filter(l => l.match(/gap|error|remediation/i));
      lines.slice(0, 5).forEach(l => console.log(l));
    });
    console.log('');
  }
  if (!suggestions.length && !todos.length && !insights.length) {
    console.log('No actionable suggestions, TODOs, or errors found. System is healthy!');
  }
}

function main() {
  try {
    logSuggestion('Active Suggestions CLI run started.');
    const suggestionLog = readFileSafe(logPath);
    const finalizationPlan = readFileSafe(finalizationPlanPath);
    const insights = parseInsights(insightsDir);
    const suggestions = parseSuggestionLog(suggestionLog);
    const todos = parseFinalizationPlan(finalizationPlan);
    outputSuggestions(suggestions, todos, insights);
    logSuggestion('Active Suggestions CLI run completed successfully.');
  } catch (e) {
    logSuggestion('Active Suggestions CLI run failed: ' + e.message);
    logger.error('Active Suggestions CLI run failed', { error: e });
    console.error('Error running Active Suggestions CLI:', e);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
} 