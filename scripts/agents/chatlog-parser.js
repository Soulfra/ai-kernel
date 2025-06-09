// @agent: diagnostics
// @orchestrator: recovery
// @origin: legacy-rescue
/**
 * Chatlog Parser Feature
 * Usage: node index.js <inputDir> <outputDir>
 * See README.md for details.
 */
const fs = require('fs');
const path = require('path');

function parseChatlog(content) {
  // Extract TODOs and bullet points as ideas
  const lines = content.split(/\r?\n/);
  const ideas = lines.filter(l => l.match(/^(TODO:|[-*] )/i));
  return ideas;
}

function generateDoc(ideas, sourceFile) {
  const now = new Date().toISOString();
  return [
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
    '- [Magic List](../../magic-list.md)',
    '- [Kernel Standards](../../KERNEL_SLATE/docs/standards/kernel-backup-e2e-checklist.md)',
  ].join('\n');
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
      fs.writeFileSync(outPath, doc);
      total++;
      console.log(`Generated: ${outPath}`);
    }
  }
  console.log(`Parsed ${files.length} files, generated ${total} docs.`);
}

module.exports = { parseChatlog, generateDoc }; 
