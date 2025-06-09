#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

async function fetchJson(url) {
  const fetch = global.fetch || (await import('node-fetch')).default;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'agent-market', Authorization: `token ${process.env.GITHUB_TOKEN || ''}` }
  });
  return res.json();
}

async function main() {
  const searchUrl = 'https://api.github.com/search/code?q=filename:agent.yaml+stars:%3E5';
  const data = await fetchJson(searchUrl);
  const repos = [];
  if (Array.isArray(data.items)) {
    data.items.forEach(item => {
      const repo = item.repository;
      if (repo.stargazers_count > 5 && !repos.find(r => r.full_name === repo.full_name)) {
        repos.push({ full_name: repo.full_name, url: repo.html_url, stars: repo.stargazers_count });
      }
    });
  }
  const docsDir = path.resolve(__dirname, '../../docs');
  const outJson = path.join(docsDir, 'available-agents.json');
  const outHtml = path.join(docsDir, 'market.html');
  fs.writeFileSync(outJson, JSON.stringify(repos, null, 2));
  const list = repos.map(r => `<li><a href="${r.url}">${r.full_name}</a> (${r.stars}★)</li>`).join('\n');
  const html = `<!doctype html><html><body><h1>Available Agents</h1><ul>${list}</ul></body></html>`;
  fs.writeFileSync(outHtml, html);
  console.log(`Wrote ${outJson} and ${outHtml}`);
}

if (require.main === module) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
