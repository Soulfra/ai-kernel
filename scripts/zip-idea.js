const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { ensureUser } = require('./core/user-vault');
const { hasSpentAtLeast } = require('./agent/billing-agent');

function zipIdea(ideaPath, user) {
  const repoRoot = path.resolve(__dirname, '..');
  if (user) {
    ensureUser(user);
    if (!hasSpentAtLeast(user, 1)) {
      const log = path.join(repoRoot, 'logs', 'export-denied.json');
      let arr = [];
      if (fs.existsSync(log)) { try { arr = JSON.parse(fs.readFileSync(log, 'utf8')); } catch {} }
      arr.push({ timestamp: new Date().toISOString(), user, action: 'zip-idea' });
      fs.writeFileSync(log, JSON.stringify(arr, null, 2));
      throw new Error('Pay $1 to unlock agent building and exporting features');
    }
  }
  const abs = path.resolve(repoRoot, ideaPath);
  if (!fs.existsSync(abs)) throw new Error('Idea file not found');
  const slug = path.basename(abs, '.idea.yaml');
  const outDir = path.join(repoRoot, 'vault', user || 'default', 'zips');
  fs.mkdirSync(outDir, { recursive: true });
  const zipPath = path.join(outDir, `${slug}.idea.zip`);
  spawnSync('zip', ['-j', zipPath, abs], { stdio: 'inherit' });
  return zipPath;
}

if (require.main === module) {
  const idea = process.argv[2];
  const user = process.argv[3];
  try {
    const out = zipIdea(idea, user);
    console.log(out);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

module.exports = { zipIdea };
