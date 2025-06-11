const fs = require('fs');
const path = require('path');
const { speak } = require('../agent/glyph-agent');

function readJson(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } }
function writeJson(p, data) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(data, null, 2)); }

function reflect(user) {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const summary = readJson(path.join(repoRoot, 'vault-prompts', user, 'daily-summary.json')) || {};
  const usage = readJson(path.join(repoRoot, 'vault', user, 'usage.json')) || [];
  let ideaImprovement = '';
  if (summary.top_ideas && summary.top_ideas.length) {
    ideaImprovement = `Improve idea ${summary.top_ideas[0]}`;
  }
  let followUp = '';
  let forkAgent = null;
  if (usage.length) {
    const last = usage[usage.length - 1];
    followUp = `Revisit action ${last.action || ''}`;
    forkAgent = last.agent || last.slug || null;
  }
  const suggestion = { timestamp: new Date().toISOString(), idea_improvement: ideaImprovement, follow_up: followUp, fork_agent: forkAgent };
  const outFile = path.join(repoRoot, 'vault', user, 'next-steps.json');
  writeJson(outFile, suggestion);
  const logFile = path.join(repoRoot, 'logs', 'reflection-events.json');
  const log = readJson(logFile) || [];
  log.push({ user, ...suggestion });
  writeJson(logFile, log);
  try { speak(user, 'Next step suggestion ready.'); } catch {}
  return suggestion;
}

if (require.main === module) {
  const user = process.argv[2];
  if (!user) { console.log('Usage: node reflection-agent.js <user>'); process.exit(1); }
  const result = reflect(user);
  console.log(JSON.stringify(result, null, 2));
}

module.exports = { reflect };
