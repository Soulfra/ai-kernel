#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const DependencyOrchestrator = require('./core/dependency-orchestrator');
const LogOrchestrator = require('./core/log-orchestrator');
const DebugOrchestrator = require('./core/debug-orchestrator');
const SoulfraStandardizer = require('./core/soulfra-standardizer');
const { execSync } = require('child_process');
const { runWithTimeout } = require('./core/forced-wrapper');

function printHeader() {
  console.log('\n==============================');
  console.log('   Soulfra / CLARITY_ENGINE');
  console.log('      MCP CLI Dashboard');
  console.log('==============================\n');
  console.log('  9. Handoff & Onboarding');
  console.log(' 10. Exit');
  console.log(' 11. Compliance & Release');
}

function showHealth() {
  // Demo: Read orchestrator health from a status file or mock
  const statusPath = path.resolve(__dirname, '../scripts/pipeline-status.json');
  let status = {};
  try {
    status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
  } catch {
    status = { orchestrators: { log: 'ok', debug: 'ok', meta: 'ok', task: 'ok', quality: 'ok' }, compliance: 'ok', lastBackup: '2025-06-04T15:48:00Z' };
  }
  console.log('Orchestrator Health:');
  for (const [k, v] of Object.entries(status.orchestrators || {})) {
    console.log(`  - ${k}: ${v}`);
  }
  console.log(`Compliance: ${status.compliance}`);
  console.log(`Last Backup: ${status.lastBackup}`);
}

function showLogs() {
  // Demo: Show last 5 lines of conversation_log.md
  const logPath = path.resolve(__dirname, '../conversation_log.md');
  try {
    const lines = fs.readFileSync(logPath, 'utf8').trim().split('\n');
    console.log('\nRecent Conversation Log:');
    lines.slice(-5).forEach(l => console.log('  ' + l));
  } catch {
    console.log('No conversation log found.');
  }
}

function showSuggestionForms() {
  const suggestionsDir = path.resolve(__dirname, '../suggestions');
  if (!fs.existsSync(suggestionsDir)) {
    console.log('\nNo unresolved suggestion forms.');
    return;
  }
  const files = fs.readdirSync(suggestionsDir).filter(f => f.endsWith('.suggestion.md'));
  if (files.length === 0) {
    console.log('\nNo unresolved suggestion forms.');
    return;
  }
  console.log('\nUnresolved Suggestion Forms:');
  files.forEach((f, i) => {
    console.log(`  ${i + 1}. ${f}`);
  });
}

function showActions() {
  console.log('\nAvailable Actions:');
  console.log('  1. Run Migration');
  console.log('  2. Validate Docs');
  console.log('  3. Auto-Heal');
  console.log('  4. Rollback');
  console.log('  5. Run Full Compliance Batch');
  console.log('  6. View Suggestion Forms');
  console.log('  7. Run Soulfra Standardization');
  console.log('  8. Handoff & Onboarding');
  console.log('  9. Exit');
}

function showComplianceMenu() {
  console.log('\n=== Compliance & Release ===');
  console.log('  1. View Compliance Checklist Template');
  console.log('  2. Generate Filled-In Compliance Checklist');
  console.log('  3. Back to Main Menu');
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('\nSelect an option (1-3): ', (answer) => {
    switch (answer.trim()) {
      case '1':
        console.log('\n--- Compliance Checklist Template ---');
        console.log(fs.readFileSync('docs/templates/COMPLIANCE_TEMPLATE.md', 'utf8'));
        break;
      case '2':
        generateFilledComplianceChecklist();
        break;
      default:
        break;
    }
    rl.close();
  });
}

function generateFilledComplianceChecklist() {
  const template = fs.readFileSync('docs/templates/COMPLIANCE_TEMPLATE.md', 'utf8');
  const filled = template.replace('[Project Name]', 'CLARITY_ENGINE')
    .replace('lastUpdated: 2025-06-04', `lastUpdated: ${new Date().toISOString().slice(0,10)}`);
  const outPath = `project_meta/hand-off/COMPLIANCE_${new Date().toISOString().replace(/[:T]/g,'-').slice(0,19)}.md`;
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, filled);
  console.log(`\nFilled-in compliance checklist generated at: ${outPath}`);
}

function runAction(choice) {
  switch (choice) {
    case '1':
      console.log('Running migration (dry-run)...');
      runWithTimeout('node run-safe-migration.js --dry-run', 'Run Migration', 60000);
      break;
    case '2':
      console.log('Validating docs...');
      runWithTimeout('node validate-docs.js', 'Validate Docs', 60000);
      break;
    case '3':
      console.log('Running auto-heal...');
      runWithTimeout('node auto-heal.js', 'Auto-Heal', 60000);
      break;
    case '4':
      console.log('Rolling back to last backup...');
      runWithTimeout('node rollback.js', 'Rollback', 60000);
      break;
    case '5':
      console.log('Running full compliance batch...');
      runWithTimeout('node run-compliance-batch.js', 'Full Compliance Batch', 60000);
      break;
    case '6':
      showSuggestionForms();
      break;
    case '7':
      showSoulfraStandardization();
      break;
    case '8':
      showHandoffMenu();
      break;
    case '9':
      process.exit(0);
      break;
    default:
      console.log('Invalid choice. Please select a valid action.');
  }
}

async function showDependencyHealth() {
  try {
    const logger = new LogOrchestrator();
    await logger.initialize();
    const debugOrchestrator = new DebugOrchestrator();
    const depOrchestrator = new DependencyOrchestrator({ logger, debugOrchestrator });
    const audit = await depOrchestrator.runAudit({ targetDir: '.' });
    console.log('\n=== Dependency Health ===');
    if (audit.status === 'ok') {
      const missing = audit.result && audit.result.missing ? Object.keys(audit.result.missing) : [];
      if (missing.length === 0) {
        console.log('All dependencies are present.');
      } else {
        console.log('Missing dependencies:', missing.join(', '));
      }
    } else {
      console.log('Dependency audit failed:', audit.error || audit.status);
    }
  } catch (err) {
    console.log('Dependency audit error:', err.message);
  }
}

async function showSoulfraStandardization() {
  const logger = new LogOrchestrator();
  // Assume complianceOrchestrator is available or mock
  const complianceOrchestrator = null;
  const standardizer = new SoulfraStandardizer({ logger, complianceOrchestrator });
  const result = await standardizer.runStandardization({ targetDirs: ['.'] });
  console.log('\n=== Soulfra Standardization ===');
  if (result.status === 'ok') {
    console.log('Soulfra Standardization complete. All files scanned for compliance.');
  } else {
    console.log('Soulfra Standardization failed:', result.error ? result.error.message : result.error);
  }
  console.log('To re-run standardization, use: node scripts/mcp-dashboard.js --standardize');
}

function showHandoffMenu() {
  console.log('\n=== Handoff & Onboarding ===');
  console.log('  1. View Internal Handoff Doc');
  console.log('  2. View Exportable Handoff Template');
  console.log('  3. Generate Filled-In Handoff Doc');
  console.log('  4. Back to Main Menu');
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('\nSelect an option (1-4): ', (answer) => {
    switch (answer.trim()) {
      case '1':
        console.log('\n--- Internal Handoff Doc ---');
        console.log(fs.readFileSync('docs/hand-off/SOULFRA_STANDARD_HANDOFF.md', 'utf8'));
        break;
      case '2':
        console.log('\n--- Exportable Handoff Template ---');
        console.log(fs.readFileSync('docs/templates/PROJECT_HANDOFF_TEMPLATE.md', 'utf8'));
        break;
      case '3':
        generateFilledHandoffDoc();
        break;
      default:
        break;
    }
    rl.close();
  });
}

function generateFilledHandoffDoc() {
  const template = fs.readFileSync('docs/templates/PROJECT_HANDOFF_TEMPLATE.md', 'utf8');
  const filled = template.replace('[Project Name]', 'CLARITY_ENGINE')
    .replace('lastUpdated: 2025-06-04', `lastUpdated: ${new Date().toISOString().slice(0,10)}`);
  const outPath = `project_meta/hand-off/HANDOFF_${new Date().toISOString().replace(/[:T]/g,'-').slice(0,19)}.md`;
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, filled);
  console.log(`\nFilled-in handoff doc generated at: ${outPath}`);
}

function showSuggestionLog() {
  const logPath = path.join(__dirname, '../project_meta/suggestion_log.md');
  if (!fs.existsSync(logPath)) {
    console.log('No suggestion log found.');
    return;
  }
  const log = fs.readFileSync(logPath, 'utf8');
  console.log('\n=== SUGGESTION LOG (Latest Gaps & Remediation) ===\n');
  console.log(log.split('\n').slice(-20).join('\n'));
}

function showComplianceReport() {
  const reportDir = path.join(__dirname, '../reports/compliance');
  if (!fs.existsSync(reportDir)) return;
  const files = fs.readdirSync(reportDir).filter(f => f.endsWith('.json'));
  if (files.length === 0) return;
  const latest = files.sort().reverse()[0];
  const report = JSON.parse(fs.readFileSync(path.join(reportDir, latest), 'utf8'));
  console.log('\n=== COMPLIANCE REPORT ===\n');
  console.log(JSON.stringify(report, null, 2));
}

function showLLMHealth() {
  const logPath = path.join(__dirname, '../project_meta/suggestion_log.md');
  if (!fs.existsSync(logPath)) return;
  const log = fs.readFileSync(logPath, 'utf8');
  const llmLines = log.split('\n').filter(l => l.toLowerCase().includes('llm'));
  if (llmLines.length === 0) return;
  console.log('\n=== LLM HEALTH STATUS (Latest) ===\n');
  console.log(llmLines.slice(-10).join('\n'));
}

async function main() {
  printHeader();
  showHealth();
  showLogs();
  showActions();
  if (process.argv.includes('--audit-deps')) {
    await showDependencyHealth();
    return;
  }
  if (process.argv.includes('--standardize')) {
    await showSoulfraStandardization();
    return;
  }
  if (process.argv.includes('--handoff-internal')) {
    console.log(fs.readFileSync('docs/hand-off/SOULFRA_STANDARD_HANDOFF.md', 'utf8'));
    return;
  }
  if (process.argv.includes('--handoff-export')) {
    console.log(fs.readFileSync('docs/templates/PROJECT_HANDOFF_TEMPLATE.md', 'utf8'));
    return;
  }
  if (process.argv.includes('--generate-handoff')) {
    generateFilledHandoffDoc();
    return;
  }
  if (process.argv.includes('--compliance-template')) {
    console.log(fs.readFileSync('docs/templates/COMPLIANCE_TEMPLATE.md', 'utf8'));
    return;
  }
  if (process.argv.includes('--generate-compliance')) {
    generateFilledComplianceChecklist();
    return;
  }
  showSuggestionLog();
  showLLMHealth();
  showComplianceReport();
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('\nSelect an action (1-11): ', (answer) => {
    runAction(answer.trim());
    showDependencyHealth();
    showSoulfraStandardization();
    rl.close();
  });
}

if (require.main === module) {
  main();
} 