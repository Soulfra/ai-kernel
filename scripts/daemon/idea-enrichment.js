const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

function loadJson(file) { try { return JSON.parse(fs.readFileSync(file,'utf8')); } catch { return []; } }

function enrichIdeas() {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const vaultRoot = path.join(repoRoot, 'vault');
  if (!fs.existsSync(vaultRoot)) return;
  for (const user of fs.readdirSync(vaultRoot)) {
    const ideaDir = path.join(vaultRoot, user, 'ideas');
    if (!fs.existsSync(ideaDir)) continue;
    for (const file of fs.readdirSync(ideaDir)) {
      if (!file.endsWith('.idea.yaml')) continue;
      const full = path.join(ideaDir, file);
      let doc = {};
      try { doc = yaml.load(fs.readFileSync(full,'utf8')) || {}; } catch {}
      if (doc.status === 'draft' || doc.flag === 'improve') {
        const usage = loadJson(path.join(vaultRoot, user, 'usage.json'));
        doc.improvement = `Consider refining based on ${usage.length} actions`;
        const outYaml = path.join(vaultRoot, user, 'enriched-ideas', file);
        fs.mkdirSync(path.dirname(outYaml), { recursive: true });
        fs.writeFileSync(outYaml, yaml.dump(doc));
        const slug = path.basename(file, '.idea.yaml');
        const docDir = path.join(repoRoot, 'docs', 'enriched');
        fs.mkdirSync(docDir, { recursive: true });
        fs.writeFileSync(path.join(docDir, `${slug}.md`), `# ${doc.title || slug}\n\nImproved idea generated.`);
      }
    }
  }
}

if (require.main === module) enrichIdeas();

module.exports = { enrichIdeas };
