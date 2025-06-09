#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const yaml = require(require.resolve('js-yaml', { paths: [path.resolve(__dirname, '..', '..', 'kernel-slate')] }));

function validate(doc) {
  return doc && doc.name && doc.description && doc.file;
}

async function pushToGitHub(owner, repo, dest, content, token, branch = 'main') {
  const fetch = global.fetch || (await import('node-fetch')).default;
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${dest}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `token ${token}`,
      'User-Agent': 'agent-market',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: `Add agent ${path.basename(dest)}`,
      content: Buffer.from(content).toString('base64'),
      branch
    })
  });
  if (!res.ok) throw new Error(`GitHub upload failed: ${res.status}`);
  return res.json();
}

async function main() {
  const [yamlPath, catArg, usage] = process.argv.slice(2);
  if (!yamlPath || !catArg || !usage) {
    console.error('Usage: node register-agent.js path/to/agent.yaml <category> <usage-summary>');
    process.exit(1);
  }
  const full = path.resolve(yamlPath);
  if (!fs.existsSync(full)) {
    console.error('File not found:', full);
    process.exit(1);
  }
  const doc = yaml.load(fs.readFileSync(full, 'utf8'));
  if (!validate(doc)) {
    console.error('Invalid agent.yaml - must include name, description and file');
    process.exit(1);
  }
  const categories = catArg ? catArg.split(',').map(s => s.trim()).filter(Boolean) : [];

  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.MARKET_REPO || 'agent-market';
  const branch = process.env.MARKET_BRANCH || 'main';
  const token = process.env.GITHUB_TOKEN;
  if (!owner || !token) {
    console.error('GITHUB_OWNER and GITHUB_TOKEN env vars are required');
    process.exit(1);
  }

  const destPath = `agents/${path.basename(yamlPath)}`;
  await pushToGitHub(owner, repo, destPath, fs.readFileSync(full), token, branch);

  const repoRoot = path.resolve(__dirname, '..', '..');
  const docsFile = path.join(repoRoot, 'kernel-slate/docs/available-agents.json');
  const list = fs.existsSync(docsFile) ? JSON.parse(fs.readFileSync(docsFile, 'utf8')) : [];
  list.push({
    name: doc.name,
    repo: `${owner}/${repo}`,
    path: destPath,
    url: `https://github.com/${owner}/${repo}/blob/${branch}/${destPath}`,
    categories,
    usage: usage || ''
  });
  fs.writeFileSync(docsFile, JSON.stringify(list, null, 2));
  console.log(`Registered ${doc.name} and updated ${docsFile}`);
}

if (require.main === module) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { main };
