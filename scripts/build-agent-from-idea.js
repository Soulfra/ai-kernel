const fs = require('fs');
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');
const { spawnSync } = require('child_process');
const { ensureUser, logUsage } = require('./core/user-vault');
const { hasSpentAtLeast } = require('./agent/billing-agent');

function buildAgentFromIdea(slug, user) {
  const repoRoot = path.resolve(__dirname, '..');
  ensureUser(user);
  const usageFile = path.join(repoRoot, 'vault', user, 'usage.json');
  try {
    const usage = JSON.parse(fs.readFileSync(usageFile, 'utf8'));
    if (usage.some(e => e.abuse || e.unpaid)) {
      throw new Error('Account blocked due to abuse or unpaid jobs');
    }
  } catch {}
  if (!hasSpentAtLeast(user, 1)) {
    const denyMsg = 'Pay $1 to unlock agent building and exporting features';
    const log = path.join(repoRoot, 'logs', 'export-denied.json');
    let arr = [];
    if (fs.existsSync(log)) { try { arr = JSON.parse(fs.readFileSync(log, 'utf8')); } catch {} }
    arr.push({ timestamp: new Date().toISOString(), user, slug, reason: 'spend-requirement' });
    fs.writeFileSync(log, JSON.stringify(arr, null, 2));
    throw new Error(denyMsg);
  }
  const ideaPath = path.join(repoRoot, 'vault', user, 'ideas', `${slug}.idea.yaml`);
  if (!fs.existsSync(ideaPath)) throw new Error('Idea not found');
  const idea = yaml.load(fs.readFileSync(ideaPath, 'utf8')) || {};

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-'));
  const agentYaml = {
    name: slug,
    description: idea.title || slug,
    entry: 'agent.js',
    version: '0.0.1'
  };
  fs.writeFileSync(path.join(tmpDir, 'agent.yaml'), yaml.dump(agentYaml));
  fs.writeFileSync(
    path.join(tmpDir, 'agent.js'),
    "module.exports = async function () {\n  console.log('TODO implement " + slug + "');\n};\n"
  );

  const readmeSrc = path.join(repoRoot, 'docs', 'ideas', `${slug}.md`);
  if (fs.existsSync(readmeSrc)) {
    fs.copyFileSync(readmeSrc, path.join(tmpDir, 'README.md'));
  }

  const agentsDir = path.join(repoRoot, 'vault', user, 'agents');
  fs.mkdirSync(agentsDir, { recursive: true });
  const zipPath = path.join(agentsDir, `${slug}.agent.zip`);
  spawnSync('zip', ['-j', '-r', zipPath, '.'], { cwd: tmpDir, stdio: 'inherit' });

  const logFile = path.join(repoRoot, 'logs', 'agent-builder-log.json');
  let arr = [];
  if (fs.existsSync(logFile)) {
    try { arr = JSON.parse(fs.readFileSync(logFile, 'utf8')); } catch {}
  }
  arr.push({ timestamp: new Date().toISOString(), user, slug });
  fs.writeFileSync(logFile, JSON.stringify(arr, null, 2));

  logUsage(user, { timestamp: new Date().toISOString(), action: 'build-agent', slug });
  return zipPath;
}

module.exports = { buildAgentFromIdea };
