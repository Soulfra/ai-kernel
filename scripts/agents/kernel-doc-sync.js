#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const docsDir = path.join(repoRoot, 'docs');
const logsDir = path.join(repoRoot, 'logs');
fs.mkdirSync(logsDir, { recursive: true });
const reportPath = path.join(logsDir, 'doc-sync-report.json');
const readmePath = path.join(docsDir, 'README.md');

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function writeIfChanged(file, content) {
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === content) return false;
  fs.writeFileSync(file, content);
  return true;
}

function firstComment(file) {
  const lines = read(file).split(/\r?\n/);
  for (const line of lines) {
    if (line.startsWith('#!')) continue;
    const m = line.match(/^\s*(?:\/\/|#|\*)\s*(.+)/);
    if (m) return m[1].trim();
    if (line.trim()) break;
  }
  return 'No summary available.';
}

function gatherScripts() {
  const dirs = [path.join(repoRoot, 'scripts'), path.join(repoRoot, 'kernel-slate', 'scripts')];
  const files = [];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    const stack = [dir];
    while (stack.length) {
      const d = stack.pop();
      for (const f of fs.readdirSync(d)) {
        const p = path.join(d, f);
        if (fs.statSync(p).isDirectory()) stack.push(p);
        else if (p.endsWith('.js')) files.push(p);
      }
    }
  }
  return files;
}

function parseCLICommands() {
  const cliFile = path.join(repoRoot, 'scripts', 'cli', 'kernel-cli.js');
  const content = read(cliFile);
  const cmds = [];
  const regex = /case '\s*([^']+)'/g;
  let m;
  while ((m = regex.exec(content))) cmds.push(m[1]);
  if (content.includes('release-check')) cmds.push('release-check');
  return cmds;
}

function parseMakeTargets() {
  const makeFile = path.join(repoRoot, 'Makefile');
  const txt = read(makeFile);
  const targets = [];
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^(\w[\w-]+):/);
    if (m) targets.push(m[1]);
  }
  return targets;
}

function toDocName(name) {
  return name.replace(/[\/]/g, '-').replace(/\.js$/, '') + '.md';
}

function main() {
  const scripts = gatherScripts();
  const cliCommands = parseCLICommands();
  const makeTargets = parseMakeTargets();

  const report = { created: [], updated: [], skipped: [] };
  const generated = [];

  // handle scripts
  for (const file of scripts) {
    const rel = path.relative(repoRoot, file);
    const docName = toDocName(rel);
    const docPath = path.join(docsDir, docName);
    const summary = firstComment(file);
    const content = `# ${rel}\n\n**Summary**: ${summary}\n\n**Usage**:\n\n\`\`\`bash\nnode ${rel}\n\`\`\`\n\n**Files**:\n- ${rel}\n`;
    const existed = fs.existsSync(docPath);
    const changed = writeIfChanged(docPath, content);
    if (changed) {
      if (existed) report.updated.push(docName); else report.created.push(docName);
    } else {
      report.skipped.push(docName);
    }
    generated.push(docName);
  }

  // handle CLI commands
  for (const cmd of cliCommands) {
    const docName = toDocName('cli-' + cmd);
    const docPath = path.join(docsDir, docName);
    const summary = `Documentation for CLI command \`${cmd}\``;
    const usage = `node scripts/cli/kernel-cli.js ${cmd}`;
    const content = `# ${cmd}\n\n**Summary**: ${summary}\n\n**Usage**:\n\n\`\`\`bash\n${usage}\n\`\`\`\n`;
    const existed = fs.existsSync(docPath);
    const changed = writeIfChanged(docPath, content);
    if (changed) {
      if (existed) report.updated.push(docName); else report.created.push(docName);
    } else {
      report.skipped.push(docName);
    }
    generated.push(docName);
  }

  // handle Make targets
  for (const tgt of makeTargets) {
    const docName = toDocName('make-' + tgt);
    const docPath = path.join(docsDir, docName);
    const summary = `Documentation for Make target \`${tgt}\``;
    const usage = `make ${tgt}`;
    const content = `# ${tgt}\n\n**Summary**: ${summary}\n\n**Usage**:\n\n\`\`\`bash\n${usage}\n\`\`\`\n`;
    const existed = fs.existsSync(docPath);
    const changed = writeIfChanged(docPath, content);
    if (changed) {
      if (existed) report.updated.push(docName); else report.created.push(docName);
    } else {
      report.skipped.push(docName);
    }
    generated.push(docName);
  }

  // update README
  const start = '<!-- doc-sync start -->';
  const end = '<!-- doc-sync end -->';
  let readme = read(readmePath);
  if (!readme.includes(start)) readme += `\n${start}\n${end}\n`;
  const pre = readme.split(start)[0];
  const post = readme.split(end)[1] || '';
  const list = generated.map(f => `- [${f}](./${f})`).join('\n');
  readme = `${pre}${start}\n${list}\n${end}${post}`;
  fs.writeFileSync(readmePath, readme);

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
}

if (require.main === module) main();
