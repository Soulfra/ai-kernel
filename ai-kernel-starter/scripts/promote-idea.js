const fs = require('fs');
const path = require('path');
const readline = require('readline-sync');
const { ensureUser } = require('./core/user-vault');

function promoteIdea(slug) {
  const repoRoot = path.resolve(__dirname, '..');
  const srcIdea = path.join(repoRoot, 'runtime', 'ideas', `${slug}.idea.yaml`);
  const dstIdea = path.join(repoRoot, 'approved', 'ideas', `${slug}.idea.yaml`);
  const srcLog = path.join(repoRoot, 'logs', 'idea-runtime', `${slug}.json`);
  const dstLog = path.join(repoRoot, 'logs', 'approved-runtime', `${slug}.json`);
  const srcDoc = path.join(repoRoot, 'docs', 'ideas', `${slug}.md`);
  const dstDoc = path.join(repoRoot, 'docs', 'approved', `${slug}.md`);
  if (!fs.existsSync(srcIdea) || !fs.existsSync(srcLog) || !fs.existsSync(srcDoc)) {
    throw new Error('Required files missing for promotion');
  }
  if (fs.existsSync(dstIdea)) {
    const ans = readline.question('Approved idea exists. Overwrite? [y/N] ');
    if (ans.toLowerCase() !== 'y') return;
  }
  fs.mkdirSync(path.dirname(dstIdea), { recursive: true });
  fs.mkdirSync(path.dirname(dstLog), { recursive: true });
  fs.mkdirSync(path.dirname(dstDoc), { recursive: true });
  fs.renameSync(srcIdea, dstIdea);
  fs.renameSync(srcLog, dstLog);
  fs.renameSync(srcDoc, dstDoc);
  const logFile = path.join(repoRoot, 'logs', 'idea-promotion.json');
  let arr = [];
  if (fs.existsSync(logFile)) {
    try { arr = JSON.parse(fs.readFileSync(logFile, 'utf8')); } catch {}
  }
  arr.push({ slug, promoted_at: new Date().toISOString() });
  fs.writeFileSync(logFile, JSON.stringify(arr, null, 2));

  if (process.env.KERNEL_USER) {
    const user = process.env.KERNEL_USER;
    ensureUser(user);
    const vaultIdeaDir = path.join(repoRoot, 'vault', user, 'ideas');
    fs.mkdirSync(vaultIdeaDir, { recursive: true });
    const vaultIdea = path.join(vaultIdeaDir, `${slug}.idea.yaml`);
    fs.copyFileSync(dstIdea, vaultIdea);
    try { require('./vault-snapshot').snapshotVault(user); } catch {}
  }
}

module.exports = { promoteIdea };
