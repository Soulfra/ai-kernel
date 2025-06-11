#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '../..');
const timelineFile = path.join(repoRoot, 'docs', 'trace-timeline.json');
const mdFile = path.join(repoRoot, 'docs', 'report.md');
const pdfFile = path.join(repoRoot, 'docs', 'report.pdf');

function loadTimeline() {
  if (!fs.existsSync(timelineFile)) return [];
  const data = JSON.parse(fs.readFileSync(timelineFile, 'utf8'));
  return data.sort((a, b) => {
    if (a.timestamp && b.timestamp) {
      return new Date(a.timestamp) - new Date(b.timestamp);
    }
    return String(a.ref).localeCompare(String(b.ref));
  });
}

function group(items) {
  const groups = { chat: [], decisions: [], todos: [], questions: [] };
  for (const item of items) {
    if (item.source === 'chat-summary') groups.chat.push(item);
    else if (item.type === 'TODO') groups.todos.push(item);
    else if (item.type === 'question') groups.questions.push(item);
    else groups.decisions.push(item);
  }
  return groups;
}

function renderMarkdown(groups) {
  const mk = [];
  mk.push('# Trace Report\n');
  for (const [name, items] of Object.entries(groups)) {
    const title =
      name === 'chat'
        ? 'Chat Derived'
        : name === 'decisions'
        ? 'Code Decisions'
        : name === 'todos'
        ? 'TODOs'
        : 'Open Questions';
    mk.push(`## ${title} (${items.length})`);
    items.forEach(it => {
      mk.push(`- **${it.ref || it.file}** - ${it.snippet || ''}`);
    });
    mk.push('');
  }
  return mk.join('\n');
}

async function pushToNotion(content) {
  if (!process.env.NOTION_API_KEY) return;
  const fetch = global.fetch || (await import('node-fetch')).default;
  await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    },
    body: JSON.stringify({
      parent: { type: 'page_id', page_id: process.env.NOTION_PARENT || '' },
      properties: { title: { title: [{ text: { content: 'Trace Report' } }] } },
      children: [{ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content } }] } }]
    })
  }).catch(err => console.error('Failed to push to Notion:', err.message));
}

async function main() {
  const timeline = loadTimeline();
  const groups = group(timeline);
  const md = renderMarkdown(groups);
  fs.writeFileSync(mdFile, md);
  console.log(`Wrote ${mdFile}`);
  try {
    execSync(`npx markdown-pdf ${mdFile} -o ${pdfFile}`);
    console.log(`Wrote ${pdfFile}`);
  } catch (err) {
    console.warn('PDF generation skipped:', err.message);
  }
  await pushToNotion(md);
}

if (require.main === module) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
