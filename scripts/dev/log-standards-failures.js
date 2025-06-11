const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const reportPath = path.join(repoRoot, 'kernel-slate', 'logs', 'kernel-standards-report.json');
const failuresPath = path.join(repoRoot, 'kernel-slate', 'logs', 'standards-failures.json');
const mdPath = path.join(repoRoot, 'kernel-slate', 'docs', 'kernel-standards-status.md');

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const failures = [];

if (report.cli && report.cli.missing && report.cli.missing.length) {
  report.cli.missing.forEach(cmd => {
    failures.push({
      category: 'CLI',
      message: `missing CLI command ${cmd}`,
      file: 'kernel-slate/scripts/cli/kernel-cli.js'
    });
  });
}
if (report.agent) {
  if (report.agent.notDoc && report.agent.notDoc.length) {
    report.agent.notDoc.forEach(name => {
      failures.push({
        category: 'AGENT',
        message: `agent ${name} missing documentation`,
        file: `agent-templates/${name}.yaml`
      });
    });
  }
  if (report.agent.notAvail && report.agent.notAvail.length) {
    report.agent.notAvail.forEach(name => {
      failures.push({
        category: 'AGENT',
        message: `agent ${name} not listed in available-agents.json`,
        file: 'kernel-slate/docs/available-agents.json'
      });
    });
  }
}
if (report.docs) {
  if (report.docs.extra && report.docs.extra.length) {
    report.docs.extra.forEach(file => {
      failures.push({
        category: 'DOC',
        message: `doc ${file} not referenced in doc-sync-report.json`,
        file: `kernel-slate/docs/${file}`
      });
    });
  }
  if (report.docs.deadLinks && report.docs.deadLinks.length) {
    report.docs.deadLinks.forEach(link => {
      failures.push({
        category: 'DOC',
        message: `broken link ${link}`,
        file: 'kernel-slate/docs/README.md'
      });
    });
  }
}

fs.writeFileSync(failuresPath, JSON.stringify(failures, null, 2));

let md = '# Kernel Standards Status\n\n';
if (failures.length === 0) {
  md += 'All checks passed.\n';
} else {
  md += 'Failures:\n';
  failures.forEach(f => {
    md += `- **${f.category}** ${f.message} (${f.file})\n`;
  });
}
fs.writeFileSync(mdPath, md);
