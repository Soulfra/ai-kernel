const fs = require('fs');
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');

function scanIdeas(dir) {
  const list = [];
  if (!fs.existsSync(dir)) return list;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.idea.yaml')) continue;
    const slug = path.basename(file, '.idea.yaml');
    try {
      const data = yaml.load(fs.readFileSync(path.join(dir, file), 'utf8')) || {};
      list.push({ title: data.title || slug, tokens: data.tokens || 1, link: path.relative('docs', path.join(dir, file)).replace(/\\/g, '/') });
    } catch {}
  }
  return list;
}

function scanAgents(vaultRoot) {
  const items = [];
  if (!fs.existsSync(vaultRoot)) return items;
  for (const user of fs.readdirSync(vaultRoot)) {
    const aDir = path.join(vaultRoot, user, 'agents');
    if (!fs.existsSync(aDir)) continue;
    for (const file of fs.readdirSync(aDir)) {
      if (!file.endsWith('.agent.zip')) continue;
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-'));
      try {
        require('child_process').spawnSync('unzip', ['-o', path.join(aDir, file), '-d', tmp]);
        const doc = yaml.load(fs.readFileSync(path.join(tmp, 'agent.yaml'), 'utf8')) || {};
        items.push({ title: doc.name || file, tokens: doc.tokens || 1, link: path.relative('docs', path.join(aDir, file)).replace(/\\/g, '/') });
      } catch {}
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }
  return items;
}

function main(user) {
  const repoRoot = path.resolve(__dirname, '..');
  const ideasDir = path.join(repoRoot, 'approved', 'ideas');
  const vaultRoot = path.join(repoRoot, 'vault');
  const items = [...scanIdeas(ideasDir), ...scanAgents(vaultRoot)];
  const mdLines = ['# Agent Marketplace', ''];
  for (const it of items) {
    mdLines.push(`- **${it.title}** - ${it.tokens} tokens - [use](${it.link})`);
  }
  const mdPath = path.join(repoRoot, 'docs', 'marketplace.md');
  fs.writeFileSync(mdPath, mdLines.join('\n'));
  const logPath = path.join(repoRoot, 'logs', 'marketplace-index.json');
  fs.writeFileSync(logPath, JSON.stringify(items, null, 2));
}

if (require.main === module) main();

module.exports = { main };
