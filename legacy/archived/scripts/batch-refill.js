#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const logPath = 'project_meta/suggestion_log.md';
const debugLogPath = 'project_meta/debug_logs/BATCH_REFILL_DEBUG.log';
const magicGoalListPath = 'project_meta/insights/magic_goal_list.md';
const lessonsPath = 'project_meta/insights/lessons_learned.md';
const dashboardPath = 'project_meta/insights/system_state_dashboard.md';
const handoffChecklistPath = 'project_meta/insights/handoff_checklist.md';
const recoveryChecklistPath = 'project_meta/insights/recovery_checklist.md';
const args = process.argv.slice(2);
const ciMode = args.includes('--ci');
let actions = [];
let gaps = [];
function logSuggestion(message) {
  const entry = `\n[${new Date().toISOString()}] ${message}`;
  fs.appendFileSync(logPath, entry + '\n');
  gaps.push(message);
}
function logDebug(message) {
  const entry = `\n[${new Date().toISOString()}] ${message}`;
  fs.appendFileSync(debugLogPath, entry + '\n');
}
function refillDoc(file, marker, content, desc) {
  try {
    if (!fs.existsSync(file)) {
      logSuggestion(`Batch Refill: Missing ${desc} at ${file}`);
      logDebug(`Missing ${desc} at ${file}`);
      if (ciMode) process.exit(1);
      return;
    }
    let doc = fs.readFileSync(file, 'utf8');
    if (!doc.includes(marker)) {
      logSuggestion(`Batch Refill: Marker missing in ${desc} (${file})`);
      logDebug(`Marker missing in ${desc} (${file})`);
      if (ciMode) process.exit(1);
      return;
    }
    const updated = doc.replace(new RegExp(`${marker}.*`, 's'), `${marker}\n${content}`);
    fs.writeFileSync(file, updated);
    actions.push(`Refilled ${desc} in ${file}`);
    logDebug(`Refilled ${desc} in ${file}`);
  } catch (err) {
    logSuggestion(`Batch Refill Error in ${desc}: ${err.message}`);
    logDebug(`Batch Refill Error in ${desc}: ${err.stack || err.message}`);
    if (ciMode) process.exit(1);
  }
}
// 1. Refill dashboards, docs, checklists
const lessons = fs.existsSync(lessonsPath) ? fs.readFileSync(lessonsPath, 'utf8') : '';
const dashboard = fs.existsSync(dashboardPath) ? fs.readFileSync(dashboardPath, 'utf8') : '';
const handoff = fs.existsSync(handoffChecklistPath) ? fs.readFileSync(handoffChecklistPath, 'utf8') : '';
const recovery = fs.existsSync(recoveryChecklistPath) ? fs.readFileSync(recoveryChecklistPath, 'utf8') : '';
// Example: refill lessons in onboarding doc
const onboardingPath = 'docs/hand-off/SOULFRA_STANDARD_HANDOFF.md';
if (fs.existsSync(onboardingPath)) {
  refillDoc(onboardingPath, '## Latest Lessons Learned', lessons, 'lessons learned');
  refillDoc(onboardingPath, '## System Dashboards & Checklists', dashboard, 'system dashboard');
}
// 2. Update magic goal list lastUpdated
if (fs.existsSync(magicGoalListPath)) {
  let goalList = fs.readFileSync(magicGoalListPath, 'utf8');
  goalList = goalList.replace(/lastUpdated: .*/, `lastUpdated: ${new Date().toISOString()}`);
  fs.writeFileSync(magicGoalListPath, goalList);
  actions.push('Updated magic goal list lastUpdated');
}
// 3. Log and output summary
console.log('\n=== Batch Refill Report ===');
actions.forEach(a => console.log('- ' + a));
if (gaps.length > 0) {
  console.log('\nGaps found:');
  gaps.forEach(g => console.log('- ' + g));
  logSuggestion('Batch Refill: Gaps found, see report.');
} else {
  console.log('All docs and dashboards refilled and up to date.');
} 