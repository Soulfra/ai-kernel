const fs = require('fs');
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');
const { spawnSync } = require('child_process');
const { ProviderRouter } = require('./core/provider-router');
const { ensureUser } = require('./core/user-vault');

async function runAgentZip(zipPath, prompt, user) {
  const repoRoot = path.resolve(__dirname, '..');
  ensureUser(user);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-'));
  spawnSync('unzip', ['-o', zipPath, '-d', tmpDir], { stdio: 'inherit' });
  const yamlPath = path.join(tmpDir, 'agent.yaml');
  const jsPath = path.join(tmpDir, 'agent.js');
  if (!fs.existsSync(yamlPath) || !fs.existsSync(jsPath)) {
    throw new Error('Invalid agent package');
  }
  const cfg = yaml.load(fs.readFileSync(yamlPath, 'utf8')) || {};
  const slug = cfg.name || path.basename(zipPath, '.agent.zip');
  const mod = require(jsPath);
  const router = new ProviderRouter();
  const output = await mod(prompt, router);
  const usageFile = path.join(repoRoot, 'vault', user, 'agent-usage.json');
  let arr = [];
  if (fs.existsSync(usageFile)) { try { arr = JSON.parse(fs.readFileSync(usageFile, 'utf8')); } catch {} }
  arr.push({ timestamp: new Date().toISOString(), slug, prompt });
  fs.writeFileSync(usageFile, JSON.stringify(arr, null, 2));
  const logDir = path.join(repoRoot, 'logs', 'agent-execution');
  fs.mkdirSync(logDir, { recursive: true });
  fs.writeFileSync(path.join(logDir, `${slug}.json`), JSON.stringify({ timestamp: new Date().toISOString(), user, slug, prompt, output }, null, 2));
  return output;
}

if (require.main === module) {
  const [zip, ...p] = process.argv.slice(2);
  const prompt = p.join(' ');
  const user = process.env.KERNEL_USER || 'default';
  runAgentZip(zip, prompt, user).then(out => console.log(out)).catch(err => { console.error(err.message); process.exit(1); });
}

module.exports = { runAgentZip };
