const fs = require('fs');
const path = require('path');

function compile() {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const logsDir = path.join(repoRoot, 'logs');
  const outJson = path.join(logsDir, 'daily-rollup.json');
  const outMd = path.join(repoRoot, 'docs', 'rollup-summary.md');
  const now = Date.now();
  const entries = [];
  if (fs.existsSync(logsDir)) {
    for (const f of fs.readdirSync(logsDir)) {
      const p = path.join(logsDir, f);
      if (!fs.statSync(p).isFile()) continue;
      const m = fs.statSync(p).mtime.getTime();
      if (now - m > 24 * 60 * 60 * 1000) continue;
      const lines = fs.readFileSync(p, 'utf8').split('\n').slice(-20).join('\n');
      entries.push({ file: f, snippet: lines });
    }
  }
  fs.writeFileSync(outJson, JSON.stringify(entries, null, 2));
  const mdParts = ['# Daily Log Rollup', ''];
  for (const e of entries) {
    mdParts.push(`### ${e.file}\n\n\`\`\`\n${e.snippet}\n\`\`\``);
  }
  fs.mkdirSync(path.dirname(outMd), { recursive: true });
  fs.writeFileSync(outMd, mdParts.join('\n'));
}

if (require.main === module) compile();

module.exports = { compile };
