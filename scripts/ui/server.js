const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const PORT = process.env.PORT || 3000;
const app = express();

// Directories
const repoRoot = path.join(__dirname, '..', '..');
const inputDir = path.join(repoRoot, 'input');
const tmpDir = path.join(repoRoot, 'tmp');
const agentsFile = path.join(repoRoot, 'installed-agents.json');
const usageFile = path.join(repoRoot, 'usage.json');

// Ensure input directory exists
fs.mkdirSync(inputDir, { recursive: true });
fs.mkdirSync(tmpDir, { recursive: true });

// Multer setup to store original filenames and restrict extensions
const storage = multer.diskStorage({
  destination: tmpDir,
  filename: (req, file, cb) => cb(null, file.originalname),
});
function filter(exts) {
  return (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (exts.includes(ext)) cb(null, true);
    else cb(new Error('Invalid file type'));
  };
}
const chatUpload = multer({ storage, fileFilter: filter(['.txt', '.md', '.json', '.html']) });
const voiceUpload = multer({ storage, fileFilter: filter(['.wav', '.mp3', '.m4a']) });
const agentUpload = multer({ storage, fileFilter: filter(['.yaml', '.yml']) });
const zipUpload = multer({ storage, fileFilter: filter(['.zip']) });

// Utility to safely read JSON
function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
}

app.get('/', (req, res) => {
  const agents = readJson(agentsFile);
  const usage = readJson(usageFile);

  const agentsList = agents
    .map((a) => `<li>${a}</li>`) // assuming array of names
    .join('');
  const usageDisplay = `<pre>${JSON.stringify(usage, null, 2)}</pre>`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Agent Dashboard</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1, h2 { margin-top: 1.5em; }
    form { margin-top: 1em; }
  </style>
</head>
<body>
  <h1>Installed Agents</h1>
  <ul>${agentsList}</ul>

  <h2>Usage Metrics</h2>
  ${usageDisplay}

  <h2>Upload Chatlog</h2>
  <form method="post" action="/upload-chatlog" enctype="multipart/form-data">
    <input type="file" name="file" accept=".txt,.md,.json,.html" required>
    <button type="submit">Upload</button>
  </form>

  <h2>Upload Voice Recording</h2>
  <form method="post" action="/upload-voice" enctype="multipart/form-data">
    <input type="file" name="file" accept=".wav,.mp3,.m4a" required>
    <button type="submit">Upload</button>
  </form>

  <h2>Install Agent</h2>
  <form method="post" action="/install" enctype="multipart/form-data">
    <input type="file" name="file" accept=".yaml,.yml" required>
    <button type="submit">Install</button>
  </form>
</body>
</html>`;
  res.send(html);
});

function run(script, file, res, msg, cleanup = []) {
  const proc = spawn('node', [script, file], { stdio: 'inherit' });
  proc.on('close', code => {
    fs.unlinkSync(file);
    for (const p of cleanup) {
      fs.rmSync(p, { recursive: true, force: true });
    }
    if (code === 0) res.send(msg);
    else res.status(500).send('Error running script');
  });
}

app.post('/upload-chatlog', chatUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded');
  const script = path.join(repoRoot, 'kernel-slate', 'scripts', 'features', 'chatlog-parser', 'from-export.js');
  run(script, req.file.path, res, 'Chatlog processed');
});

app.post('/upload-voice', voiceUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded');
  const script = path.join(repoRoot, 'kernel-slate', 'scripts', 'features', 'record-voice-log.js');
  run(script, req.file.path, res, 'Voice processed');
});

app.post('/install', agentUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded');
  const script = path.join(repoRoot, 'kernel-slate', 'scripts', 'market', 'install-agent.js');
  run(script, req.file.path, res, 'Install started');
});

app.post('/upload', zipUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded');
  const name = req.file.originalname.toLowerCase();
  const outDir = fs.mkdtempSync(path.join(tmpDir, 'zip-'));
  const unzip = spawn('unzip', ['-o', req.file.path, '-d', outDir]);
  unzip.on('close', code => {
    fs.unlinkSync(req.file.path);
    if (code !== 0) {
      fs.rmSync(outDir, { recursive: true, force: true });
      return res.status(500).send('Failed to unzip file');
    }
    if (name.endsWith('.chatlog.zip')) {
      const files = fs.readdirSync(outDir);
      const target = files.find(f => ['.txt', '.md', '.json', '.html'].includes(path.extname(f).toLowerCase()));
      if (!target) {
        fs.rmSync(outDir, { recursive: true, force: true });
        return res.status(400).send('No chatlog found in zip');
      }
      const script = path.join(repoRoot, 'kernel-slate', 'scripts', 'features', 'chatlog-parser', 'from-export.js');
      run(script, path.join(outDir, target), res, 'Chatlog processed', [outDir]);
    } else if (name.endsWith('.agent.zip')) {
      const files = fs.readdirSync(outDir);
      const target = files.find(f => ['agent.yaml', 'agent.yml'].includes(f.toLowerCase()) || ['.yaml', '.yml'].includes(path.extname(f).toLowerCase()));
      if (!target) {
        fs.rmSync(outDir, { recursive: true, force: true });
        return res.status(400).send('No agent.yaml found in zip');
      }
      const script = path.join(repoRoot, 'kernel-slate', 'scripts', 'market', 'install-agent.js');
      run(script, path.join(outDir, target), res, 'Install started', [outDir]);
    } else {
      fs.rmSync(outDir, { recursive: true, force: true });
      res.status(400).send('Unsupported zip file');
    }
  });
});

app.listen(PORT, () => {
  console.log(`UI server running at http://localhost:${PORT}`);
});
