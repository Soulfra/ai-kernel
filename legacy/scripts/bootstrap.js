#!/usr/bin/env node
const { execSync } = require('child_process');

function runStep(cmd, desc, opts = {}) {
  if (opts.skip) return;
  console.log(`\n=== ${desc} ===`);
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch (e) {
    if (!opts.allowFail) throw e;
    console.warn(`Step failed but continuing: ${desc}`);
  }
}

function main() {
  runStep('node scripts/dependency-orchestrator.js', 'Dependency Orchestrator');
  runStep('node scripts/editor-config-orchestrator.js', 'Editor Config Orchestrator');
  runStep('node scripts/sanitizer-orchestrator.js docs/', 'Sanitizer Orchestrator');
  runStep('node scripts/auto-heal.js docs/', 'Auto-Heal');
  runStep('node scripts/generate-missing-docs.js docs/', 'Generate Missing Docs');
  runStep('node scripts/orchestrator-test-harness.js scripts/core/tests', 'Orchestrator Test Harness');
  runStep('node scripts/update-system-status.js', 'Update System Status', { allowFail: true });
  console.log('\nTo start the Orchestrator API server for dashboards or chatops, run:');
  console.log('  node scripts/orchestrator-api.js');
}

if (require.main === module) main(); 