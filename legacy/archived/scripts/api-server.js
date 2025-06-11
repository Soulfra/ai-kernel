// API Server: REST endpoints for clusters, docs, analytics, and submission
const express = require('express');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const CLUSTERS_FILE = process.env.CLUSTERS_FILE || './clusters/clusters.json';
const INDEX_FILE = process.env.INDEX_FILE || './index/index.json';
const LOG_FILE = process.env.LOG_FILE || './logs/api-server.log';

function log(message) {
  const entry = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, entry);
}

function loadJson(file) {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const app = express();
app.use(express.json());

app.get('/api/clusters', (req, res) => {
  log('GET /api/clusters');
  res.json(loadJson(CLUSTERS_FILE));
});

app.get('/api/docs', (req, res) => {
  log('GET /api/docs');
  res.json(loadJson(INDEX_FILE));
});

app.get('/api/analytics', (req, res) => {
  log('GET /api/analytics');
  // TODO: Add real analytics
  res.json({ status: 'ok', message: 'Analytics placeholder' });
});

app.post('/api/submit', (req, res) => {
  log('POST /api/submit');
  // TODO: Save submitted knowledge, validate, and trigger intake
  res.json({ status: 'ok', message: 'Submission placeholder' });
});

app.post('/api/vote', (req, res) => {
  log('POST /api/vote');
  // TODO: Record vote in clusters
  res.json({ status: 'ok', message: 'Vote placeholder' });
});

app.listen(PORT, () => {
  log(`API server started on port ${PORT}`);
  console.log(`API server running at http://localhost:${PORT}`);
});
// TODO: Add authentication, error handling, and more endpoints 