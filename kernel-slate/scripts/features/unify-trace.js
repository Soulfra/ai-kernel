#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../..');
const decisionFile = path.join(repoRoot, 'docs', 'decision-trace.md');
const chatFile = path.join(repoRoot, 'docs', 'chat-summary.md');
const outFile = path.join(repoRoot, 'docs', 'trace-timeline.json');

function parseDecisionTrace(text) {
  const items = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^## \[(.+?)\] in (.+)$/);
    if (m) {
      const type = m[1];
      const file = m[2];
      const snippet = (lines[i + 1] || '').trim();
      const actionMatch = (lines[i + 2] || '').match(/^\u27a4\s+Suggested:\s*(.+)$/);
      const action = actionMatch ? actionMatch[1] : '';
      items.push({
        source: 'decision-trace',
        type,
        file,
        snippet,
        action,
        ref: file
      });
      i += 2;
    }
  }
  return items;
}

function parseChatSummary(text) {
  const items = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^##\s+Cluster\s+(\S+)/i);
    if (m) {
      const clusterId = m[1];
      const messagesMatch = (lines[i + 1] || '').match(/Messages:\s*(\d+)/i);
      const themesMatch = (lines[i + 2] || '').match(/Key Themes:\s*(.+)/i);
      items.push({
        source: 'chat-summary',
        clusterId,
        messages: messagesMatch ? parseInt(messagesMatch[1], 10) : null,
        themes: themesMatch ? themesMatch[1].trim() : '',
        ref: clusterId
      });
      i += 2;
    }
  }
  return items;
}

function main() {
  const decisionText = fs.existsSync(decisionFile) ? fs.readFileSync(decisionFile, 'utf8') : '';
  const chatText = fs.existsSync(chatFile) ? fs.readFileSync(chatFile, 'utf8') : '';
  const timeline = [
    ...parseDecisionTrace(decisionText),
    ...parseChatSummary(chatText)
  ];

  timeline.sort((a, b) => {
    if (a.timestamp && b.timestamp) {
      return new Date(a.timestamp) - new Date(b.timestamp);
    }
    return a.ref.localeCompare(b.ref);
  });

  fs.writeFileSync(outFile, JSON.stringify(timeline, null, 2));
  console.log(`Wrote ${timeline.length} items to ${outFile}`);
}

if (require.main === module) {
  main();
}
