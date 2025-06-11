/**
 * Chatlog Parser Feature
 * Usage: node index.js <inputDir> <outputDir>
 * Parses chat logs to extract TODOs and bullet points.
 * Generates Markdown docs with YAML frontmatter.
 */
const fs = require('fs');
const path = require('path');
const ensureFileAndDir = require('../../../shared/utils/ensureFileAndDir');

function parseChatlog(content) {
  const lines = content.split(/\r?\n/);
  return lines.filter(l => l.match(/^(TODO:|[-*] )/i));
}

function generateDoc(ideas, sourceFile) {
  const now = new Date().toISOString();
  const body = [
    '---',
    `title: Chatlog Ideas from ${path.basename(sourceFile)}`,
    'description: Ideas and TODOs extracted from chat logs.',
    `lastUpdated: ${now}`,
    'version: 0.1.0',
    '---',
    '# Ideas and TODOs',
    '',
    ...ideas.map(i => '- ' + i.replace(/^[-*] /, '').replace(/^TODO:/i, '').trim()),
    '',
    '## Source',
    `- [Original chatlog](${sourceFile})`,
    '',
    '## Crosslinks',
    '- [Documentation Automation](../../docs/standards/documentation-automation.md)'
  ];
  return body.join('\n');
}

if (require.main === module) {
  const [inputDir, outputDir] = process.argv.slice(2);
  if (!inputDir || !outputDir) {
    console.error('Usage: node index.js <inputDir> <outputDir>');
    process.exit(1);
  }
  fs.mkdirSync(outputDir, { recursive: true });
  const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.txt') || f.endsWith('.md'));
  let total = 0;
  for (const file of files) {
    const content = fs.readFileSync(path.join(inputDir, file), 'utf-8');
    const ideas = parseChatlog(content);
    if (ideas.length) {
      const doc = generateDoc(ideas, file);
      const outPath = path.join(outputDir, file.replace(/\.(txt|md)$/i, '.ideas.md'));
      ensureFileAndDir(outPath);
      fs.writeFileSync(outPath, doc);
      console.log(`Generated: ${outPath}`);
      total++;
    }
  }
  console.log(`Parsed ${files.length} files, generated ${total} docs.`);
}

module.exports = { parseChatlog, generateDoc };
