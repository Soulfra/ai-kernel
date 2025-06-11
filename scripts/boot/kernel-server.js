const express = require('express');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const PORT = process.env.PORT || 3077;
const repoRoot = path.resolve(__dirname, '..', '..');
const app = express();

const statusFile = path.join(repoRoot, 'docs', 'final-kernel-status.md');
const agentsFile = path.join(repoRoot, 'installed-agents.json');
const logsDir = path.join(repoRoot, 'logs');
const docsIndex = path.join(repoRoot, 'docs', 'index.md');
const providerLog = path.join(logsDir, 'provider-activity.json');

function readText(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return ''; }
}
function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return []; }
}

// optional agent package loader
function loadInstallers() {
  const dirs = [path.join(repoRoot, 'input'), path.join(repoRoot, 'install')];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      const full = path.join(dir, f);
      if (f.endsWith('.agent.zip')) {
        spawnSync('unzip', ['-o', full, '-d', repoRoot], { stdio: 'inherit' });
      } else if (f.endsWith('.idea.yaml')) {
        const dest = path.join(repoRoot, 'installed-agents', f);
        fs.copyFileSync(full, dest);
      }
    }
  }
}

loadInstallers();

app.get('/api/keys/status', (req, res) => {
  let latest = {};
  if (fs.existsSync(providerLog)) {
    try { const arr = JSON.parse(fs.readFileSync(providerLog, 'utf8')); latest = arr[arr.length - 1] || {}; } catch {}
  }
  res.json({
    byok: process.env.USE_BYOK === 'true',
    lastProvider: latest.provider || null,
    keySource: latest.keySource || null
  });
});

app.get('/api/agents', (req, res) => {
  res.json(readJson(agentsFile));
});

app.get('/api/docs', (req, res) => {
  res.type('text/markdown').send(readText(docsIndex));
});

app.get('/api/status', (req, res) => {
  const user = req.query.user;
  const { ensureUser, loadTokens } = require('../core/user-vault');
  let tokens = 0;
  let lastIdea = null;
  let lastAgent = null;
  let stats = {};
  if (user) {
    ensureUser(user);
    tokens = loadTokens(user);
    const usageFile = path.join(repoRoot, 'vault', user, 'usage.json');
    if (fs.existsSync(usageFile)) {
      try {
        const arr = JSON.parse(fs.readFileSync(usageFile, 'utf8'));
        const ideaEntry = [...arr].reverse().find(e => e.action === 'run-idea');
        const agentEntry = [...arr].reverse().find(e => e.action && e.action.includes('agent'));
        if (ideaEntry) lastIdea = ideaEntry.idea;
        if (agentEntry) lastAgent = agentEntry.slug || agentEntry.agent;
      } catch {}
    }
    const ideaDir = path.join(repoRoot, 'vault', user, 'ideas');
    const agentDir = path.join(repoRoot, 'vault', user, 'agents');
    stats = {
      ideas: fs.existsSync(ideaDir) ? fs.readdirSync(ideaDir).length : 0,
      agents: fs.existsSync(agentDir) ? fs.readdirSync(agentDir).length : 0
    };
  }
  const out = { tokens, lastIdea, lastAgent, stats };
  const logFile = path.join(logsDir, 'api-status.json');
  let arr = [];
  if (fs.existsSync(logFile)) {
    try { arr = JSON.parse(fs.readFileSync(logFile, 'utf8')); } catch {}
  }
  arr.push({ timestamp: new Date().toISOString(), user });
  fs.writeFileSync(logFile, JSON.stringify(arr, null, 2));
  res.json(out);
});

app.get('/api/generate-qr', (req, res) => {
  const { generateQR } = require('../auth/qr-pairing');
  res.json(generateQR());
});

app.post('/api/pair', express.json(), (req, res) => {
  const { id, referrer } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id required' });
  try {
    const { pair } = require('../auth/qr-pairing');
    pair(id, referrer);
    res.json({ paired: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/run', express.json(), (req, res) => {
  const cmdStr = req.body && req.body.cmd;
  if (!cmdStr) return res.status(400).json({ error: 'cmd required' });
  const parts = cmdStr.split(/\s+/);
  const proc = spawnSync('node', ['kernel-cli.js', ...parts], { cwd: repoRoot, encoding: 'utf8' });
  res.json({ status: proc.status, output: proc.stdout + proc.stderr });
});

app.post('/api/run-idea', express.json(), async (req, res) => {
  const ideaPath = req.body && req.body.path;
  if (!ideaPath) return res.status(400).json({ error: 'path required' });
  const byok = req.body && req.body.byok;
  const user = req.query.user;
  const prevByok = process.env.USE_BYOK;
  const prevUser = process.env.KERNEL_USER;
  if (byok) process.env.USE_BYOK = 'true';
  if (user) {
    process.env.KERNEL_USER = user;
    const { ensureUser, loadEnv } = require('../core/user-vault');
    ensureUser(user);
    if (byok) loadEnv(user);
  }
  try {
    const { runIdea } = require('../idea-runner');
    const result = await runIdea(ideaPath, 'api', user);
    const logFile = path.join(logsDir, 'api-executions.json');
    let arr = [];
    if (fs.existsSync(logFile)) {
      try { arr = JSON.parse(fs.readFileSync(logFile, 'utf8')); } catch {}
    }
    arr.push({ timestamp: new Date().toISOString(), idea: ideaPath, user });
    fs.writeFileSync(logFile, JSON.stringify(arr, null, 2));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (prevByok !== undefined) process.env.USE_BYOK = prevByok; else delete process.env.USE_BYOK;
    if (prevUser !== undefined) process.env.KERNEL_USER = prevUser; else delete process.env.KERNEL_USER;
  }
});

app.get('/status', (req, res) => {
  if (req.query.json) {
    const { generateQR } = require('../auth/qr-pairing');
    res.json({ ok: true, timestamp: new Date().toISOString(), samplePair: generateQR().uri });
  } else {
    res.type('text/markdown').send(readText(statusFile));
  }
});

app.get('/agents', (req, res) => {
  res.json(readJson(agentsFile));
});

app.get('/logs', (req, res) => {
  const files = fs.readdirSync(logsDir).filter(f => !f.startsWith('.'));
  const out = {};
  for (const f of files) {
    const p = path.join(logsDir, f);
    out[f] = readText(p).split('\n').slice(-20).join('\n');
  }
  res.json(out);
});

app.get('/admin/rules', (req, res) => {
  const file = path.join(repoRoot, 'rules', 'admin-rules.json');
  if (req.query.json) res.json(readJson(file));
  else res.type('text/plain').send(readText(file));
});

app.get('/admin/contributions', (req, res) => {
  const file = path.join(logsDir, 'upload-contributions.json');
  if (req.query.json) res.json(readJson(file));
  else res.send(`<pre>${readText(file)}</pre>`);
});

app.get('/admin/flagged', (req, res) => {
  const file = path.join(logsDir, 'flagged.json');
  if (req.query.json) res.json(readJson(file));
  else res.send(`<pre>${readText(file)}</pre>`);
});

app.get('/admin/users', (req, res) => {
  const vaultRoot = path.join(repoRoot, 'vault');
  let list = [];
  if (fs.existsSync(vaultRoot)) {
    for (const user of fs.readdirSync(vaultRoot)) {
      const usage = readJson(path.join(vaultRoot, user, 'usage.json')) || [];
      let tokens = 0;
      try { tokens = readJson(path.join(vaultRoot, user, 'tokens.json')).tokens || 0; } catch {}
      list.push({ user, runs: usage.length, tokens });
    }
  }
  if (req.query.json) return res.json(list);
  res.send(`<pre>${JSON.stringify(list, null, 2)}</pre>`);
});

app.get('/run/:cmd', (req, res) => {
  const cmd = req.params.cmd;
  const allowed = ['verify', 'shrinkwrap', 'devkit'];
  if (!allowed.includes(cmd)) return res.status(400).json({ error: 'Invalid' });
  const proc = spawnSync('node', ['kernel-cli.js', cmd], { cwd: repoRoot, encoding: 'utf8' });
  res.json({ status: proc.status, output: proc.stdout + proc.stderr });
});

app.listen(PORT, () => {
  console.log(`Kernel server running at http://localhost:${PORT}`);
});

process.on('exit', () => {
  const user = process.env.KERNEL_USER;
  if (user) {
    try {
      require('../reflect-vault')(user);
      require('../scan-usage-summary').scanUsageSummary(user);
      require('../run-jobs').runJobs(user).catch(() => {});
    } catch {}
  }
});
