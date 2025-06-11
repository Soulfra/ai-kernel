// validate-crosslinks.js
// Soulfra Standard: Automated crosslink and documentation health validation

const fs = require('fs');
const path = require('path');

const DOCS = [
  path.join(__dirname, '../../docs/hand-off/SOULFRA_STANDARD_HANDOFF.md'),
  path.join(__dirname, '../../docs/architecture/layer0-soulfra-standard.md'),
  path.join(__dirname, '../../project_meta/insights/finalization_dashboard.md'),
  path.join(__dirname, '../../project_meta/suggestion_log.md'),
  path.join(__dirname, '../../scripts/core/orchestration-router.js'),
  // Add more module/orchestrator docs as needed
];

const REQUIRED_LINKS = [
  'Layer0 Soulfra Standard',
  'Finalization Dashboard',
  'Suggestion Log',
  'Orchestration Router',
  '.cursorrules.json',
  'SOULFRA_STANDARD_HANDOFF.md'
  // Add more as needed
];

const suggestionLogPath = path.join(__dirname, '../../project_meta/suggestion_log.md');

function validateCrosslinks() {
  let issues = [];
  for (const docPath of DOCS) {
    if (!fs.existsSync(docPath)) {
      issues.push({ file: docPath, issue: 'Missing doc file' });
      continue;
    }
    const content = fs.readFileSync(docPath, 'utf8');
    for (const link of REQUIRED_LINKS) {
      if (!content.includes(link)) {
        issues.push({ file: docPath, issue: `Missing crosslink: ${link}` });
      }
    }
    // TODO: Check for broken Markdown/relative links
  }
  // Log results to suggestion log
  if (issues.length > 0) {
    const logEntry = `\n### Crosslink Validation Report (${new Date().toISOString()})\n` +
      issues.map(i => `- [ ] ${i.file}: ${i.issue}`).join('\n');
    fs.appendFileSync(suggestionLogPath, logEntry);
  }
  // Output summary
  if (issues.length > 0) {
    console.log(`Crosslink validation found ${issues.length} issues. See suggestion log for details.`);
  } else {
    console.log('✅ All required crosslinks are present.');
  }
  // TODO: Auto-fixers for missing links
  // TODO: Integrate with CI and snowball script
}

if (require.main === module) {
  validateCrosslinks();
} 