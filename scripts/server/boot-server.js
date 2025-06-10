const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const multer = require('multer');
const { spawnSync } = require('child_process');
const { ensureUser, loadTokens } = require('../core/user-vault');
const { ProviderRouter } = require('../core/provider-router');
const cheerio = require('cheerio');
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
  const ideaFile = path.join(repoRoot,'vault',user,'suggested-next.json');
  let idea = null;
  if(fs.existsSync(ideaFile)){ try { idea = JSON.parse(fs.readFileSync(ideaFile,'utf8')); } catch {} }
  const logs = path.join(repoRoot,'logs','chatlog-parser-events.json');
  let logCount = 0; if(fs.existsSync(logs)){ try { logCount = JSON.parse(fs.readFileSync(logs,'utf8')).length; } catch {} }
  if (req.query.json) return res.json({ user, tokens, queue, transcript, idea, logCount });
  const unlocked = require('../agent/billing-agent').hasSpentAtLeast(user, require('../core/admin-rule-engine').loadRules().export_gate || 1);
  res.send(`<!DOCTYPE html><html><body><h1>Dashboard</h1><p><strong>Vault:</strong> ${user}</p><p>Tokens: ${tokens}</p><p>Last Voice: ${transcript || 'none'}</p><p>Logs: ${logCount}</p><pre>${JSON.stringify(queue, null, 2)}</pre>${idea?`<h2>Suggested Idea</h2><pre>${JSON.stringify(idea,null,2)}</pre>`:''}<button onclick="fetch('/audit-vault?user=${user}',{method:'POST'}).then(()=>alert('sent'))">Send vault to Claude</button>${unlocked&&idea?`<p><a href='/marketplace/remix?slug=${idea.slug||'new'}&user=${user}'>Build Agent</a></p>`:''}</body></html>`);
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

function slugify(name){
  return name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

function parseJsonExport(obj){
  const messages = [];
  if(Array.isArray(obj)){ obj.forEach(m=>m&&m.role&&m.content&&messages.push({role:m.role.toLowerCase(),content:m.content,timestamp:m.timestamp||null})); return messages; }
  if(obj.mapping){
    const nodes = Object.values(obj.mapping).filter(n=>n.message);
    nodes.sort((a,b)=>(a.message.create_time||0)-(b.message.create_time||0));
    for(const n of nodes){ const m=n.message; if(!m.author||!m.content) continue; const content=Array.isArray(m.content.parts)?m.content.parts.join('\n'):m.content.text||''; messages.push({role:m.author.role.toLowerCase(),content,timestamp:m.create_time?new Date(m.create_time*1000).toISOString():null}); }
    return messages;
  }
  return messages;
}

function parseFile(p){
  const ext = path.extname(p).toLowerCase();
  let text = '';
  try { text = fs.readFileSync(p,'utf8'); } catch { return []; }
  if(ext==='.md' || ext==='.txt'){ const util=require('../../kernel-slate/scripts/features/chatlog-utils'); return util.parseChatLog(text); }
  if(ext==='.html' || ext==='.chatlog.html' || ext==='.htm'){ const body = cheerio.load(text)('body').text(); const util=require('../../kernel-slate/scripts/features/chatlog-utils'); return util.parseChatLog(body); }
  if(ext==='.json'){ try { const obj=JSON.parse(text); return parseJsonExport(obj); } catch { return []; } }
  return [];
}

function parseZip(zipPath){
  const dir = fs.mkdtempSync(path.join(tmpDir,'zip-'));
  spawnSync('unzip',['-o',zipPath,'-d',dir]);
  const files = fs.readdirSync(dir);
  let out=[];
  for(const f of files){ out = out.concat(parseFile(path.join(dir,f))); }
  return out;
}

app.post('/upload', upload.array('files'), (req, res) => {
  const user = req.query.user || fingerprint();
  ensureUser(user);
  const files = req.files || [];
  const logPath = path.join(repoRoot, 'logs', 'chatlog-parser-events.json');
  let events = [];
  if(fs.existsSync(logPath)) { try { events = JSON.parse(fs.readFileSync(logPath,'utf8')); } catch {} }
  const results = [];
  for(const f of files){
    let messages = [];
    const ext = path.extname(f.originalname).toLowerCase();
    if(ext==='.zip') messages = parseZip(f.path); else messages = parseFile(f.path);
    const slug = slugify(path.basename(f.originalname, ext));
    const outPath = path.join(repoRoot,'vault',user,'uploads',`parsed-chatlog-${slug}.json`);
    fs.mkdirSync(path.dirname(outPath),{recursive:true});
    fs.writeFileSync(outPath, JSON.stringify(messages,null,2));
    events.push({ timestamp:new Date().toISOString(), user, file:f.originalname, parsed: path.relative(repoRoot,outPath), count: messages.length });
    results.push(outPath);
  }
  fs.writeFileSync(logPath, JSON.stringify(events, null, 2));
  const reward = path.join(tmpDir, `upload-${Date.now()}.zip`);
  spawnSync('zip',['-j',reward,...files.map(x=>x.path)]);
  const agent = path.join(__dirname,'..','agent','upload-reward-agent.js');
  spawnSync('node',[agent,reward,reward,'',user],{cwd:repoRoot});
  require('../reflect-vault').reflectVault(user);
  res.json({ parsed: results.map(p=>path.relative(repoRoot,p)) });
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

app.post('/audit-vault', express.json(), async (req,res)=>{
  const user = req.query.user || fingerprint();
  ensureUser(user);
  const read = f=>{ try{ return JSON.parse(fs.readFileSync(f,'utf8')); } catch{ return []; } };
  const data = {
    usage: read(path.join(repoRoot,'vault',user,'usage.json')),
    billing: read(path.join(repoRoot,'vault',user,'billing-history.json')),
    logs: read(path.join(repoRoot,'logs','chatlog-parser-events.json'))
  };
  const router = new ProviderRouter();
  const prompt = `Review the following logs and suggest improvements with optional .idea.yaml:\n${JSON.stringify(data).slice(0,2000)}`;
  const { text } = await router.callAnthropic(prompt);
  const out = path.join(repoRoot,'vault',user,'claude-audit.md');
  fs.writeFileSync(out, text);
  res.json({ ok:true });
});

app.listen(PORT, () => {
  console.log(`Boot server running at http://localhost:${PORT}`);
});
