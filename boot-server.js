const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const multer = require('multer');
const { spawnSync } = require('child_process');
const { ensureUser, loadTokens } = require('./scripts/core/user-vault');
const { ProviderRouter } = require('./scripts/core/provider-router');
const cheerio = require('cheerio');
const { generateQR } = require('./auth/qr-pairing');
const yaml = require('js-yaml');

const repoRoot = path.resolve(__dirname, '..', '..');
const PORT = process.env.PORT || 3080;
const app = express();
app.use(express.static(path.join(repoRoot, 'frontend')));
app.use('/vault', express.static(path.join(repoRoot, 'vault')));
app.use('/logs', express.static(path.join(repoRoot, 'logs')));
app.use('/vault-prompts', express.static(path.join(repoRoot, 'vault-prompts')));
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
  if (req.query.json) return res.json({ user, qr: qr.uri });
  res.sendFile(path.join(repoRoot, 'frontend', 'start.html'));
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
  res.sendFile(path.join(repoRoot, 'frontend', 'dashboard.html'));
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
  res.sendFile(path.join(repoRoot, 'frontend', 'vault.html'));
});

app.get('/upload', (req, res) => {
  res.sendFile(path.join(repoRoot, 'frontend', 'upload.html'));
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
  res.sendFile(path.join(repoRoot, 'frontend', 'marketplace.html'));
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
  const fFile = path.join(repoRoot,'vault',user,'template-forks.json');
  let arr=[]; if(fs.existsSync(fFile)){ try { arr=JSON.parse(fs.readFileSync(fFile,'utf8')); } catch {} }
  arr.push({ timestamp:new Date().toISOString(), slug });
  fs.writeFileSync(fFile, JSON.stringify(arr,null,2));
  res.send('forked');
});

app.get('/template', (req,res)=>{
  const slug = req.query.slug;
  const user = req.query.user || fingerprint();
  if(!slug) return res.status(400).send('missing');
  const ideaPath = path.join(repoRoot,'approved','ideas',`${slug}.idea.yaml`);
  if(!fs.existsSync(ideaPath)) return res.status(404).send('not found');
  ensureUser(user);
  const reflectionFile = path.join(repoRoot,'vault-prompts',user,'claude-reflection.json');
  const usageFile = path.join(repoRoot,'vault',user,'usage.json');
  const stats = { tokens:0, ideas:0 };
  try { stats.tokens = JSON.parse(fs.readFileSync(usageFile,'utf8')).length; } catch {}
  const ideaDir = path.join(repoRoot,'vault',user,'ideas');
  try { stats.ideas = fs.readdirSync(ideaDir).filter(f=>f.endsWith('.idea.yaml')).length; } catch {}
  const idea = fs.readFileSync(ideaPath,'utf8');
  const reflection = fs.existsSync(reflectionFile)?fs.readFileSync(reflectionFile,'utf8'):null;
  if(req.query.json) return res.json({ slug, idea, reflection, stats });
  res.sendFile(path.join(repoRoot,'frontend','template.html'));
});

app.post('/agent-action', express.json(), (req,res)=>{
  const { action, slug, user } = req.body || {};
  const uid = user || fingerprint();
  ensureUser(uid);
  const logFile = path.join(repoRoot,'vault',uid,'transmission-log.json');
  let arr=[];
  if(fs.existsSync(logFile)){ try{ arr=JSON.parse(fs.readFileSync(logFile,'utf8')); }catch{} }
  const entry = { timestamp:new Date().toISOString(), action, slug };
  arr.push(entry);
  fs.writeFileSync(logFile, JSON.stringify(arr,null,2));
  if(action==='promote') spawnSync('make',['promote','slug='+slug],{cwd:repoRoot});
  if(action==='export') spawnSync('make',['export-agent','slug='+slug],{cwd:repoRoot});
  if(action==='devkit') spawnSync('make',['devkit','user='+uid],{cwd:repoRoot});
  if(action==='vault-video') spawnSync('make',['vault-video','user='+uid],{cwd:repoRoot});
  if(action==='fork') {
    const script = path.join(__dirname,'..','fork-idea.js');
    spawnSync('node',[script,slug,uid],{cwd:repoRoot});
  }
  res.json({ ok:true });
});

app.get('/vault/:user/playback', (req,res)=>{
  res.sendFile(path.join(repoRoot,'frontend','playback.html'));
});

app.get('/remote', (req,res)=>{
  const user = req.query.user || fingerprint();
  ensureUser(user);
  const metaFile = path.join(repoRoot,'vault',user,'device-meta.json');
  const entry = { timestamp:new Date().toISOString(), agent:req.headers['user-agent']||'unknown' };
  let arr=[];
  if(fs.existsSync(metaFile)){ try{ arr=JSON.parse(fs.readFileSync(metaFile,'utf8')); }catch{} }
  arr.push(entry);
  fs.writeFileSync(metaFile, JSON.stringify(arr,null,2));
  if(req.query.json) return res.json({ user });
  res.sendFile(path.join(repoRoot,'frontend','remote.html'));
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
