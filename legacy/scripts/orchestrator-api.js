#!/usr/bin/env node
const express = require('express');
const fs = require('fs');
const app = express();
const PORT = process.env.ORCH_API_PORT || 4000;

function safeRead(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return ''; }
}

app.get('/status', (req, res) => {
  try {
    const status = JSON.parse(safeRead('system-status.json'));
    res.json(status);
  } catch {
    res.status(404).json({ error: 'No system status available' });
  }
});

app.get('/sanitizer', (req, res) => {
  try {
    const report = JSON.parse(safeRead('sanitizer-report.json'));
    res.json(report);
  } catch {
    res.status(404).json({ error: 'No sanitizer report available' });
  }
});

app.get('/logs/:type', (req, res) => {
  const type = req.params.type;
  const map = { validation: 'validation.log', test: 'test.log', autoheal: 'autoheal.log' };
  const file = map[type];
  if (!file) return res.status(400).json({ error: 'Invalid log type' });
  const content = safeRead(file);
  if (!content) return res.status(404).json({ error: 'Log not found' });
  res.type('text/plain').send(content);
});

app.listen(PORT, () => {
  console.log(`Orchestrator API running on http://localhost:${PORT}`);
}); 