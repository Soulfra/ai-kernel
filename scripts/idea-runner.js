const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { ProviderRouter } = require('./core/provider-router');

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function loadInjector() {
  try {
    return require('./internal/prompt-injector');
  } catch (err) {
    return require('./internal/prompt-injector.example');
  }
}

async function runIdea(input, origin = 'cli') {
  const repoRoot = path.resolve(__dirname, '..');
  let abs;
  if (input.endsWith('.idea.yaml') || input.includes('/')) {
    abs = path.resolve(repoRoot, input);
  } else {
    abs = path.join(repoRoot, 'runtime', 'ideas', `${input}.idea.yaml`);
  }
  if (!fs.existsSync(abs)) throw new Error('Idea file not found');
  const ideaPath = path.relative(repoRoot, abs);
  const idea = yaml.load(fs.readFileSync(abs, 'utf8')) || {};
  const slug = slugify(path.basename(abs, '.idea.yaml'));
  const injector = loadInjector();
  const injected = injector.inject(idea) || {};
  const prompt = injected.prompt || idea.description || '';
  const provider = injected.provider;

  const router = new ProviderRouter();
  const output = await router.route(slug, prompt, { provider });

  const runtimeDir = path.join(repoRoot, 'logs', 'idea-runtime');
  fs.mkdirSync(runtimeDir, { recursive: true });
  const runtimePath = path.join(runtimeDir, `${slug}.json`);
  const runtimeData = {
    title: idea.title || slug,
    executed_at: new Date().toISOString(),
    result: output,
    provider: router.getProvider(slug, { provider }),
    input_summary: prompt.slice(0, 100)
  };
  fs.writeFileSync(runtimePath, JSON.stringify(runtimeData, null, 2));

  const docsDir = path.join(repoRoot, 'docs', 'ideas');
  fs.mkdirSync(docsDir, { recursive: true });
  const docPath = path.join(docsDir, `${slug}-execution.md`);
  const relYaml = path.relative(docsDir, abs).replace(/\\/g, '/');
  const relLog = path.relative(docsDir, runtimePath).replace(/\\/g, '/');
  const md = `# ${idea.title || slug} Execution\n\n**Idea file**: [${ideaPath}](${relYaml})\n**Log file**: [${relLog}](${relLog})\n\n## Output\n\n${output}\n\n## Agents / Followups\n\n${idea.agents_required || 'None'}\n`;
  fs.writeFileSync(docPath, md);

  const summaryFile = path.join(repoRoot, 'logs', 'prompt-routing-summary.json');
  let arr = [];
  if (fs.existsSync(summaryFile)) {
    try { arr = JSON.parse(fs.readFileSync(summaryFile, 'utf8')); } catch {}
  }
  const tokens = (prompt.split(/\s+/) || []).length;
  arr.push({ timestamp: new Date().toISOString(), ideaPath, provider: router.getProvider(slug, { provider }), tokens, origin });
  fs.writeFileSync(summaryFile, JSON.stringify(arr, null, 2));

  const success = Boolean(output);
  return { output, slug, success };
}

module.exports = { runIdea };
