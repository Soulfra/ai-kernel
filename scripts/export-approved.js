const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { hasSpentAtLeast } = require('./agent/billing-agent');

function exportApproved() {
  const repoRoot = path.resolve(__dirname, '..');
  const approvedDir = path.join(repoRoot, 'approved', 'ideas');
  if (!fs.existsSync(approvedDir)) return;
  const user = process.env.KERNEL_USER;
  if (user && !hasSpentAtLeast(user, 1)) {
    const deny = 'Pay $1 to unlock agent building and exporting features';
    const log = path.join(repoRoot, 'logs', 'export-denied.json');
    let arr = [];
    if (fs.existsSync(log)) { try { arr = JSON.parse(fs.readFileSync(log, 'utf8')); } catch {} }
    arr.push({ timestamp: new Date().toISOString(), user, action: 'export-approved' });
    fs.writeFileSync(log, JSON.stringify(arr, null, 2));
    throw new Error(deny);
  }
  const buildDir = path.join(repoRoot, 'build', 'approved-ideas');
  fs.mkdirSync(buildDir, { recursive: true });
  const files = fs.readdirSync(approvedDir).filter(f => f.endsWith('.idea.yaml'));
  for (const file of files) {
    const slug = path.basename(file, '.idea.yaml');
    const idea = path.join(approvedDir, file);
    const log = path.join(repoRoot, 'logs', 'approved-runtime', `${slug}.json`);
    const summary = path.join(repoRoot, 'docs', 'approved', `${slug}.md`);
    const exec = path.join(repoRoot, 'docs', 'ideas', `${slug}-execution.md`);
    const zipPath = path.join(buildDir, `${slug}.idea.zip`);
    const args = ['-j', zipPath, idea];
    [log, summary, exec].forEach(p => { if (fs.existsSync(p)) args.push(p); });
    spawnSync('zip', args, { cwd: repoRoot, stdio: 'inherit' });
  }
}

if (require.main === module) exportApproved();

module.exports = { exportApproved };
