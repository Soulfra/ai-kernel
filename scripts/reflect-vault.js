const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { ensureUser, loadTokens, logUsage } = require('./core/user-vault');
const { speak } = require('./agent/glyph-agent');

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
  let promptImprovements = tokens < 5 ? 'Shorten prompts to save tokens' : 'Add more context to prompts';

  const reflection = {
    timestamp: new Date().toISOString(),
    user,
    tokens,
    promote_next: ideaSuggestion,
    fine_tune_agent: agentSuggestion,
    prompt_improvements: promptImprovements,
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
  const md = `# Vault Reflection for ${user}\n\n- Tokens: ${tokens}\n- Promote next idea: ${ideaSuggestion || 'n/a'}\n- Agent to fine tune: ${agentSuggestion || 'n/a'}\n- Prompt tips: ${promptImprovements}\n- Low tokens: ${reflection.low_tokens ? 'yes' : 'no'}\n`;
  fs.writeFileSync(mdPath, md);

  try {
    speak(user, 'Vault reflection updated.');
  } catch {}

  logUsage(user, { timestamp: new Date().toISOString(), action: 'reflect-vault' });

  try {
    const promptId = crypto.randomUUID();
    const summary = {
      id: promptId,
      user,
      tokens,
      top_ideas: usage.filter(u => u.idea).slice(-3).map(u => path.basename(u.idea || '', '.idea.yaml')),
      agents_to_build: usage.filter(u => u.slug).slice(-3).map(u => u.slug || u.agent),
      usage_history: usage.slice(-5),
      prompt: 'What idea should this user explore next?'
    };
    const dir = path.join(repoRoot, 'logs', 'vault-prompts');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${promptId}.json`), JSON.stringify(summary, null, 2));
  } catch {}

  return reflection;
}

module.exports = { reflectVault };
