const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const multer = require('multer');
const { spawnSync } = require('child_process');
const { ensureUser, loadTokens } = require('../core/user-vault');
const { generateQR } = require('../auth/qr-pairing');
const yaml = require('js-yaml');

const repoRoot = path.resolve(__dirname, '..', '..');
const PORT = process.env.PORT || 3080;
const app = express();
const tmpDir = path.join(repoRoot, 'tmp');
fs.mkdirSync(tmpDir, { recursive: true });
const upload = multer({ dest: tmpDir });
const voiceUpload = multer({
  dest: tmpDir,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.wav', '.m4a'].includes(ext)) cb(null, true);
    else cb(new Error('Invalid'));
  }
});

function fingerprint() {
  const raw = os.hostname() + os.platform() + os.arch();
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 12);
}

function logDevice(user, id) {
  const entry = { timestamp: new Date().toISOString(), user, id,
    host: os.hostname(), platform: os.platform(), arch: os.arch() };
  const logFile = path.join(repoRoot, 'logs', 'device-sync-history.json');
  let arr = [];
  if (fs.existsSync(logFile)) { try { arr = JSON.parse(fs.readFileSync(logFile,'utf8')); } catch {} }
  arr.push(entry);
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  fs.writeFileSync(logFile, JSON.stringify(arr, null, 2));

  const deviceFile = path.join(repoRoot, 'vault', user, 'devices.json');
  let devArr = [];
  if (fs.existsSync(deviceFile)) { try { devArr = JSON.parse(fs.readFileSync(deviceFile,'utf8')); } catch {} }
  devArr.push(entry);
  fs.mkdirSync(path.dirname(deviceFile), { recursive: true });
  fs.writeFileSync(deviceFile, JSON.stringify(devArr, null, 2));
}

app.get('/start', (req, res) => {
  const user = req.query.user || fingerprint();
  ensureUser(user);
  logDevice(user, user);
  const qr = generateQR();
  res.send(`<!DOCTYPE html><html><body><h1>Begin Here</h1><p>Vault: ${user}</p><p>Scan: ${qr.uri}</p></body></html>`);
});

app.get('/dashboard', (req, res) => {
  const user = req.query.user || fingerprint();
  ensureUser(user);
  const tokens = loadTokens(user);
  const queueFile = path.join(repoRoot, 'vault', user, 'job-queue.json');
  let queue = [];
  if (fs.existsSync(queueFile)) { try { queue = JSON.parse(fs.readFileSync(queueFile,'utf8')); } catch {} }
  const tFile = path.join(repoRoot, 'vault-prompts', user, 'claude-transcripts.json');
  let transcript = null;
  if (fs.existsSync(tFile)) {
    try { const arr = JSON.parse(fs.readFileSync(tFile, 'utf8')); transcript = arr.length ? arr[arr.length - 1].text : null; } catch {}
  }
  if (req.query.json) return res.json({ tokens, queue, transcript });
  res.send(`<!DOCTYPE html><html><body><h1>Dashboard</h1><p>Tokens: ${tokens}</p><p>Last Voice: ${transcript || 'none'}</p><pre>${JSON.stringify(queue, null, 2)}</pre></body></html>`);
});

app.get('/vault/:user', (req, res) => {
  const user = req.params.user;
  const base = path.join(repoRoot, 'vault', user);
  const load = file => { if (fs.existsSync(file)) { try { return JSON.parse(fs.readFileSync(file,'utf8')); } catch {} } return []; };
  const listDir = dir => { try { return fs.existsSync(dir) ? fs.readdirSync(dir) : []; } catch { return []; } };
  const out = {
    usage: load(path.join(base,'usage.json')),
    billing: load(path.join(base,'billing-history.json')),
    queued: load(path.join(base,'job-queue.json')),
    voice: load(path.join(base,'voice-log.json')),
    enriched: listDir(path.join(base,'enriched-ideas')),
    backups: (() => { const dir = path.join(repoRoot,'vault-backups');
      return fs.existsSync(dir)?fs.readdirSync(dir).filter(f=>f.startsWith(user)):[]; })()
  };
  if (req.query.json) return res.json(out);
  res.send(`<pre>${JSON.stringify(out, null, 2)}</pre>`);
});

app.get('/upload', (req, res) => {
  res.send(`<!DOCTYPE html><html><body><h1>Upload</h1><form method='post' enctype='multipart/form-data'><input type='file' name='files' multiple><button>Upload</button></form></body></html>`);
});

app.post('/upload', upload.array('files'), (req, res) => {
  const user = req.query.user || fingerprint();
  ensureUser(user);
  const files = req.files || [];
  const logPath = path.join(repoRoot, 'logs', 'upload-events.json');
  let arr = [];
  if (fs.existsSync(logPath)) { try { arr = JSON.parse(fs.readFileSync(logPath,'utf8')); } catch {} }
  arr.push({ timestamp: new Date().toISOString(), user, files: files.map(f => f.originalname) });
  fs.writeFileSync(logPath, JSON.stringify(arr, null, 2));
  res.send('uploaded');
});

app.post('/voice-upload', voiceUpload.single('file'), (req, res) => {
  const user = req.query.user || fingerprint();
  ensureUser(user);
  if (!req.file) return res.status(400).send('No file');
  const script = path.join(__dirname, '..', 'agent', 'claude-voice.js');
  const out = spawnSync('node', [script, req.file.path, user], { cwd: repoRoot });
  if (out.status === 0) return res.send('processed');
  res.status(500).send('error');
});

const yaml = require('js-yaml');

function logMarket(event) {
  const logFile = path.join(repoRoot, 'logs', 'marketplace-activity.json');
  let arr = [];
  if (fs.existsSync(logFile)) { try { arr = JSON.parse(fs.readFileSync(logFile, 'utf8')); } catch {} }
  arr.push({ timestamp: new Date().toISOString(), ...event });
  fs.writeFileSync(logFile, JSON.stringify(arr, null, 2));
}

app.get('/marketplace', (req, res) => {
  const user = req.query.user || fingerprint();
  const ideasDir = path.join(repoRoot, 'approved', 'ideas');
  const files = fs.existsSync(ideasDir) ? fs.readdirSync(ideasDir).filter(f => f.endsWith('.idea.yaml')) : [];
  const list = files.map(f => {
    const data = (() => { try { return yaml.load(fs.readFileSync(path.join(ideasDir,f),'utf8'))||{}; } catch { return {}; }})();
    const creator = data.creator || 'unknown';
    const hash = crypto.createHash('sha256').update(creator).digest('hex').slice(0,8);
    const slug = path.basename(f,'.idea.yaml');
    return { slug, title: data.title || slug, creator: hash };
  });
  logMarket({ user, event:'view', count:list.length });
  if (req.query.json) return res.json(list);
  const rows = list.map(i=>`<tr><td>${i.title}</td><td>${i.creator}</td><td><a href="/marketplace/remix?slug=${i.slug}&user=${user}">Start with this idea</a></td></tr>`).join('');
  res.send(`<!DOCTYPE html><html><body><h1>Marketplace</h1><table border='1'><tr><th>Idea</th><th>Creator</th><th></th></tr>${rows}</table></body></html>`);
});

app.get('/marketplace/remix', (req,res)=>{
  const user = req.query.user || fingerprint();
  const slug = req.query.slug;
  if (!slug) return res.status(400).send('missing');
  const src = path.join(repoRoot,'approved','ideas',`${slug}.idea.yaml`);
  if (!fs.existsSync(src)) return res.status(404).send('not found');
  ensureUser(user);
  const dst = path.join(repoRoot,'vault',user,'ideas',`${slug}.idea.yaml`);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src,dst);
  logMarket({ user, event:'remix', slug });
  res.send('forked');
});

app.listen(PORT, () => {
  console.log(`Boot server running at http://localhost:${PORT}`);
});
