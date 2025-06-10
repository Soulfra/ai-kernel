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
