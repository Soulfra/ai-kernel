const fs = require('fs');
const path = require('path');
const { ensureUser, loadTokens, logUsage } = require('./core/user-vault');

function reflectVault(user) {
  const repoRoot = path.resolve(__dirname, '..');
  ensureUser(user);
  const vaultBase = path.join(repoRoot, 'vault', user);
  const usagePath = path.join(vaultBase, 'usage.json');
  const runtimeDir = path.join(repoRoot, 'logs', 'idea-runtime');

  let usage = [];
  if (fs.existsSync(usagePath)) {
    try { usage = JSON.parse(fs.readFileSync(usagePath, 'utf8')); } catch {}
  }

  const lastIdeaEntry = [...usage].reverse().find(u => u.action === 'run-idea');
  const lastAgentEntry = [...usage].reverse().find(u => u.action && u.action.includes('agent'));
  const tokens = loadTokens(user);

  let ideaSuggestion = lastIdeaEntry ? path.basename(lastIdeaEntry.idea || '', '.idea.yaml') : null;
  let agentSuggestion = lastAgentEntry ? lastAgentEntry.slug || lastAgentEntry.agent : null;

  const reflection = {
    timestamp: new Date().toISOString(),
    user,
    tokens,
    promote_next: ideaSuggestion,
    fine_tune_agent: agentSuggestion,
    low_tokens: tokens < 5
  };

  const logFile = path.join(repoRoot, 'logs', 'vault-reflection.json');
  let arr = [];
  if (fs.existsSync(logFile)) {
    try { arr = JSON.parse(fs.readFileSync(logFile, 'utf8')); } catch {}
  }
  arr.push(reflection);
  fs.writeFileSync(logFile, JSON.stringify(arr, null, 2));

  const docDir = path.join(repoRoot, 'docs', 'vault');
  fs.mkdirSync(docDir, { recursive: true });
  const mdPath = path.join(docDir, `${user}-next.md`);
  const md = `# Vault Reflection for ${user}\n\n- Tokens: ${tokens}\n- Promote next idea: ${ideaSuggestion || 'n/a'}\n- Agent to fine tune: ${agentSuggestion || 'n/a'}\n- Low tokens: ${reflection.low_tokens ? 'yes' : 'no'}\n`;
  fs.writeFileSync(mdPath, md);

  logUsage(user, { timestamp: new Date().toISOString(), action: 'reflect-vault' });
  return reflection;
}

module.exports = { reflectVault };
