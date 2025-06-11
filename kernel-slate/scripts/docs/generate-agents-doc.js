const fs = require('fs');
const path = require('path');
const ensureFileAndDir = require('../../shared/utils/ensureFileAndDir');

function groupByType(agents) {
  return agents.reduce((acc, agent) => {
    const { type } = agent;
    if (!acc[type]) acc[type] = [];
    acc[type].push(agent);
    return acc;
  }, {});
}

function generate() {
  const root = path.resolve(__dirname, '..', '..');
  const registryPath = path.join(root, 'agent-registry.json');
  const outPath = path.join(root, 'docs', 'agents.md');

  const data = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
  const agents = data.agents || [];
  const grouped = groupByType(agents);
  const now = new Date().toISOString();

  const lines = [
    '---',
    'title: Agent Registry',
    'description: List of available agents in the CLARITY_ENGINE kernel.',
    `lastUpdated: ${now}`,
    'version: 1.0.0',
    'tags: [agents, registry]',
    'status: living',
    '---',
    '',
    '# Agent Registry',
    ''
  ];

  const typeOrder = ['core', 'feature', 'utility'];
  for (const type of typeOrder) {
    const agentsOfType = grouped[type];
    if (!agentsOfType || !agentsOfType.length) continue;
    lines.push(`## ${type.charAt(0).toUpperCase() + type.slice(1)} Agents`, '');
    for (const ag of agentsOfType) {
      lines.push(`### ${ag.name}`);
      lines.push('');
      lines.push(`- **Path:** \`${ag.path}\``);
      if (ag.description) lines.push(`- **Description:** ${ag.description}`);
      lines.push(`- **CLI Runnable:** ${ag.cli ? 'Yes' : 'No'}`);
      if (ag.uses && ag.uses.length) {
        lines.push(`- **Uses:** ${ag.uses.join(', ')}`);
      }
      lines.push('');
    }
  }

  ensureFileAndDir(outPath);
  fs.writeFileSync(outPath, lines.join('\n'));
  return outPath;
}

if (require.main === module) {
  generate();
}

module.exports = generate;
