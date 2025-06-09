const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 3000;
const app = express();

// Directories
const repoRoot = path.join(__dirname, '..', '..');
const inputDir = path.join(repoRoot, 'input');
const agentsFile = path.join(repoRoot, 'installed-agents.json');
const usageFile = path.join(repoRoot, 'usage.json');

// Ensure input directory exists
fs.mkdirSync(inputDir, { recursive: true });

// Multer setup to store original filenames and restrict extensions
const storage = multer.diskStorage({
  destination: inputDir,
  filename: (req, file, cb) => cb(null, file.originalname),
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.txt' || ext === '.json') cb(null, true);
    else cb(new Error('Only .txt or .json files allowed'));
  },
});

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

  <h2>Upload File</h2>
  <form method="post" action="/upload" enctype="multipart/form-data">
    <input type="file" name="file" accept=".txt,.json" required>
    <button type="submit">Upload</button>
  </form>
</body>
</html>`;
  res.send(html);
});

app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded');
  res.send('File uploaded');
});

app.listen(PORT, () => {
  console.log(`UI server running at http://localhost:${PORT}`);
});
