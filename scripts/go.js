const fs = require('fs');
const path = require('path');
const { status, ensureUser } = require('./core/user-vault');
const { spawnSync } = require('child_process');

const user = process.argv[2];
if (!user) {
  console.error('Usage: node scripts/go.js <user>');
  process.exit(1);
}

const repoRoot = path.resolve(__dirname, '..');
ensureUser(user);
const tokens = status(user).tokens;
console.log(`Tokens: ${tokens}`);
if (tokens <= 0) process.exit(0);

const ideaDir = path.join(repoRoot, 'vault', user, 'ideas');
const files = fs.existsSync(ideaDir) ? fs.readdirSync(ideaDir).filter(f => f.endsWith('.idea.yaml')) : [];
if (!files.length) process.exit(0);
files.sort();
const last = files[files.length - 1].replace('.idea.yaml', '');
spawnSync('node', ['kernel-cli.js', 'run-idea', last, '--user', user, '--simulate'], {
  cwd: repoRoot,
  stdio: 'inherit',
  env: { ...process.env }
});
