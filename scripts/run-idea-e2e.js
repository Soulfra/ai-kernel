const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const ideaDir = path.join(repoRoot, 'ideas');
const ideaFiles = fs
  .readdirSync(ideaDir)
  .filter(f => f.endsWith('.idea.yaml'))
  .map(f => path.join(ideaDir, f));
const status = {};

for (const file of ideaFiles) {
  const slug = path.basename(file, '.idea.yaml');
  const res = spawnSync('node', ['kernel-cli.js', 'run-idea', file, '--use-byok'], {
    cwd: repoRoot,
    env: { ...process.env, PROVIDER: 'none', SIMULATE: 'true' },
    stdio: 'inherit'
  });

  const runtimePath = path.join(repoRoot, 'logs', 'idea-runtime', `${slug}.json`);
  let passed = false;
  if (fs.existsSync(runtimePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(runtimePath, 'utf8'));
      passed = Boolean(data.title && data.executed_at && data.result && data.provider && data.input_summary);
    } catch {}
  }
  status[slug] = passed ? 'pass' : 'fail';
}

fs.writeFileSync(path.join(repoRoot, 'logs', 'idea-e2e-status.json'), JSON.stringify(status, null, 2));

let md = '# Idea Execution Report\n\n';
for (const file of ideaFiles) {
  const slug = path.basename(file, '.idea.yaml');
  const yamlRel = path.relative(path.join(repoRoot, 'docs'), file).replace(/\\/g, '/');
  const logRel = path.relative(path.join(repoRoot, 'docs'), path.join(repoRoot, 'logs', 'idea-runtime', `${slug}.json`)).replace(/\\/g, '/');
  md += `- **${slug}**: ${status[slug]} ([yaml](${yamlRel}), [log](${logRel}))\n`;
}
fs.writeFileSync(path.join(repoRoot, 'docs', 'idea-execution-report.md'), md);
