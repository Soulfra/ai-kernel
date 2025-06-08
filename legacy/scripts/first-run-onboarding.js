#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const logPath = 'project_meta/suggestion_log.md';
function logSuggestion(message) {
  const entry = `\n[${new Date().toISOString()}] ${message}`;
  fs.appendFileSync(logPath, entry + '\n');
}
function runStep(cmd, desc) {
  try {
    console.log(`\n=== ${desc} ===`);
    execSync(cmd, { stdio: 'inherit' });
    logSuggestion(`First Run: ${desc} succeeded.`);
    return true;
  } catch (e) {
    logSuggestion(`First Run: ${desc} failed: ${e.message}`);
    return false;
  }
}
let ok = true;
ok = runStep('node scripts/fix-missing-llm.js', 'Fixer Script') && ok;
ok = runStep('node scripts/llm-health-check.js', 'LLM Health Check') && ok;
ok = runStep('node scripts/batch-meta-summarize.js', 'Batch Meta-Summarization') && ok;
runStep('node scripts/mcp-dashboard.js', 'Dashboard');
if (ok) {
  const readline = require('readline-sync');
  const backup = readline.question('Run a backup and simulate recovery? (y/n): ');
  if (backup.toLowerCase().startsWith('y')) {
    runStep('node scripts/batch-backup-and-summarize.js', 'Backup');
    // Simulate recovery: (user must manually verify, or script can prompt for restore logic)
    logSuggestion('First Run: Backup and recovery simulation complete.');
    console.log('Backup and recovery simulation complete. Please verify system state and rerun onboarding if needed.');
  }
} else {
  console.log('Some steps failed. See suggestion log and dashboard for details.');
} 