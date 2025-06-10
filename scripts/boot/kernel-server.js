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
  const prev = process.env.USE_BYOK;
  if (byok) process.env.USE_BYOK = 'true';
  try {
    const { runIdea } = require('../idea-runner');
    const result = await runIdea(ideaPath, 'api');
    const logFile = path.join(logsDir, 'api-executions.json');
    let arr = [];
    if (fs.existsSync(logFile)) {
      try { arr = JSON.parse(fs.readFileSync(logFile, 'utf8')); } catch {}
    }
    arr.push({ timestamp: new Date().toISOString(), idea: ideaPath });
    fs.writeFileSync(logFile, JSON.stringify(arr, null, 2));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (prev !== undefined) process.env.USE_BYOK = prev; else delete process.env.USE_BYOK;
  }
});

app.get('/status', (req, res) => {
  res.type('text/markdown').send(readText(statusFile));
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
