// soulfra-snowball.js
// Soulfra Standard: Full E2E automation, validation, backup, spiral-out, and triage
// Usage: node scripts/core/soulfra-snowball.js [--dry-run]

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const isDryRun = process.argv.includes('--dry-run');
const runLogPath = path.join(__dirname, '../../logs/snowball-run.log');
const suggestionLogPath = path.join(__dirname, '../../project_meta/suggestion_log.md');
const triage = [];
const steps = [
  {
    cmd: 'npm run backrun',
    desc: 'Soulfra Backrunner (hash/validate logs)'
  },
  {
    cmd: 'npm run update-dashboard',
    desc: 'Update Finalization Dashboard'
  },
  {
    cmd: 'node scripts/core/backup-orchestrator.js',
    desc: 'Run Backup Orchestrator'
  },
  {
    cmd: 'npm run validate-crosslinks',
    desc: 'Validate Documentation Crosslinks'
  }
  // Add more steps as needed
];

function logRun(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(runLogPath, line);
}

function appendSuggestionLog(msg) {
  const entry = `\n### Soulfra Snowball Run (${new Date().toISOString()})\n${msg}\n`;
  fs.appendFileSync(suggestionLogPath, entry);
}

function run(cmd, desc) {
  if (isDryRun) {
    const dryMsg = `[DRY RUN] Would run: ${cmd}  # ${desc}`;
    console.log(dryMsg);
    logRun(dryMsg);
    return { status: 'dry-run', desc };
  }
  console.log(`\n=== ${desc} ===`);
  logRun(`START: ${desc}`);
  try {
    execSync(cmd, { stdio: 'inherit' });
    console.log(`✅ ${desc} complete.`);
    logRun(`SUCCESS: ${desc}`);
    return { status: 'success', desc };
  } catch (err) {
    const errMsg = `❌ ${desc} failed: ${err.message}`;
    console.error(errMsg);
    logRun(`FAIL: ${desc} - ${err.message}`);
    triage.push({ step: desc, error: err.message });
    return { status: 'fail', desc, error: err.message };
  }
}

function main() {
  const results = [];
  for (const step of steps) {
    results.push(run(step.cmd, step.desc));
  }
  // Triage summary
  let triageSummary = '';
  if (triage.length > 0) {
    triageSummary = '\n#### Triage Summary\n' + triage.map(t => `- [ ] ${t.step}: ${t.error}`).join('\n');
    logRun('TRIAGE: ' + triageSummary.replace(/\n/g, ' | '));
  }
  // Suggestion log summary
  const summary = results.map(r => `- ${r.status === 'success' ? '[x]' : '[ ]'} ${r.desc}${r.error ? ' - ' + r.error : ''}`).join('\n') + triageSummary;
  appendSuggestionLog(summary);
  // Optionally auto-commit and push if all steps succeed
  // if (!isDryRun && triage.length === 0) {
  //   run('git add . && git commit -m "Soulfra snowball: auto-update" && git push', 'Auto-commit and push');
  // }
  if (isDryRun) {
    console.log('\n[DRY RUN] Soulfra Snowball complete. No commands were executed.');
  } else {
    console.log('\n🎉 Soulfra Snowball complete. Check the dashboard, suggestion log, run log, and backup for surfaced issues and next steps.');
    if (triage.length > 0) {
      console.log('\n⚠️  Triage summary:');
      triage.forEach(t => console.log(`- ${t.step}: ${t.error}`));
    }
  }
}

if (require.main === module) {
  main();
} 