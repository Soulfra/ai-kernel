const fs = require('fs');
const path = require('path');
const { ensureUser } = require('../core/user-vault');

function readJson(p) { try { return JSON.parse(fs.readFileSync(p,'utf8')); } catch { return []; } }
function writeJson(p, data) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(data, null, 2)); }

function loadPrompt(file, user) {
  ensureUser(user);
  const base = path.join(path.resolve(__dirname, '..', '..'), 'vault', user);
  const target = path.join(base, 'prompt-extensions.json');
  const arr = readJson(target);
  const content = fs.readFileSync(file, 'utf8');
  arr.push({ type: 'prompt', file: path.basename(file), content, timestamp: new Date().toISOString() });
  writeJson(target, arr);
  console.log('Prompt loaded');
}

function uploadFormat(file, user) {
  ensureUser(user);
  const base = path.join(path.resolve(__dirname, '..', '..'), 'vault', user, 'formats');
  fs.mkdirSync(base, { recursive: true });
  const dest = path.join(base, path.basename(file) + '.json');
  const data = { name: path.basename(file), type: path.extname(file).slice(1), added: new Date().toISOString() };
  writeJson(dest, data);
  const extFile = path.join(path.resolve(__dirname, '..', '..'), 'vault', user, 'prompt-extensions.json');
  const cfg = readJson(extFile);
  cfg.push({ format: dest });
  writeJson(extFile, cfg);
  console.log('Format uploaded');
}

if (require.main === module) {
  const [cmd, file, user] = process.argv.slice(2);
  if (!cmd || !file || !user) {
    console.log('Usage: format-loader.js <load-prompt|upload-format> <file> <user>');
    process.exit(1);
  }
  if (cmd === 'load-prompt') loadPrompt(file, user);
  else if (cmd === 'upload-format') uploadFormat(file, user);
  else {
    console.log('Unknown command');
    process.exit(1);
  }
}

module.exports = { loadPrompt, uploadFormat };
