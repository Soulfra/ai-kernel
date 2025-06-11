#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { ensureUser, getVaultPath } = require('../core/user-vault');

function loadJSON(file, def) {
  if (fs.existsSync(file)) {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
  }
  return def;
}

function curate(user) {
  const repoRoot = path.resolve(__dirname, '..', '..');
  ensureUser(user);
  const vault = getVaultPath(user);
  const dailyPath = path.join(vault, 'daily.md');
  const usagePath = path.join(vault, 'usage.json');
  const tokensPath = path.join(vault, 'tokens.json');
  const reflectionPath = path.join(repoRoot, 'vault-prompts', user, 'claude-reflection.json');

  const usage = loadJSON(usagePath, []);
  const tokens = loadJSON(tokensPath, { tokens: 0 }).tokens || 0;
  const reflection = loadJSON(reflectionPath, []);

  const ideaDir = path.join(vault, 'ideas');
  const agentDir = path.join(vault, 'agents');
  let ideaFiles = [];
  if (fs.existsSync(ideaDir)) {
    ideaFiles = fs.readdirSync(ideaDir).filter(f => f.endsWith('.idea.yaml'));
  }
  let unexported = ideaFiles.filter(f => {
    const slug = f.replace(/\.idea\.yaml$/, '');
    const zip = path.join(agentDir, `${slug}.agent.zip`);
    return !fs.existsSync(zip);
  });
  const suggestDevkit = unexported.length >= 3;

  const agentZips = fs.existsSync(agentDir) ? fs.readdirSync(agentDir).filter(f => f.endsWith('.agent.zip')) : [];
  const unpaid = tokens <= 0 && agentZips.length > 0;

  const forkFile = path.join(vault, 'template-forks.json');
  const forks = loadJSON(forkFile, []);
  const remixDetected = forks.length > 0;

  const claudeFailed = reflection.length === 0;

  const report = {
    timestamp: new Date().toISOString(),
    tokens,
    ideas: ideaFiles.length,
    unexported: unexported.length,
    agent_zips: agentZips.length,
    remix: remixDetected,
    claude_failed: claudeFailed,
    suggest_devkit: suggestDevkit,
    unpaid
  };

  const reportMd = `# Vault Curation Report\n\n- Tokens: ${tokens}\n- Ideas: ${ideaFiles.length}\n- Unexported: ${unexported.length}\n- Agent zips: ${agentZips.length}\n- Remix detected: ${remixDetected ? 'yes' : 'no'}\n- Claude failed: ${claudeFailed ? 'yes' : 'no'}\n`;
  fs.writeFileSync(path.join(vault, 'curation-report.md'), reportMd);
  fs.writeFileSync(path.join(vault, 'next-actions.json'), JSON.stringify({ suggest_devkit: suggestDevkit, unpaid, remix: remixDetected, rerun_claude: claudeFailed }, null, 2));

  if (unpaid) {
    fs.writeFileSync(path.join(vault, 'unpaid.json'), JSON.stringify({ timestamp: new Date().toISOString() }, null, 2));
  }

  const curationHist = path.join(vault, 'curation-history.json');
  let hist = loadJSON(curationHist, []);
  hist.push(report);
  fs.writeFileSync(curationHist, JSON.stringify(hist, null, 2));

  const globalLog = path.join(repoRoot, 'logs', 'vault-curator-events.json');
  let gl = loadJSON(globalLog, []);
  gl.push({ user, ...report });
  fs.mkdirSync(path.dirname(globalLog), { recursive: true });
  fs.writeFileSync(globalLog, JSON.stringify(gl, null, 2));

  console.log('**Cal Riven**: _"You\'ve got ' + unexported.length + ' agents with remix potential. Want me to prep a DevKit or fork them into a new session?"_');
}

if (require.main === module) {
  const user = process.argv[2] || 'default';
  curate(user);
}

module.exports = { curate };
