#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../..');
const timelineFile = path.join(repoRoot, 'docs', 'trace-timeline.json');
const outputHtml = path.join(repoRoot, 'docs', 'timeline.html');

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

function groupItems(items) {
  const groups = {
    chatDerived: [],
    codeDecisions: [],
    todos: [],
    openQuestions: []
  };
  for (const item of items) {
    if (item.source === 'chat-summary') {
      groups.chatDerived.push(item);
    } else if (item.type && item.type.toLowerCase() === 'todo') {
      groups.todos.push(item);
    } else if (item.type && item.type.toLowerCase() === 'question') {
      groups.openQuestions.push(item);
    } else {
      groups.codeDecisions.push(item);
    }
  }
  return groups;
}

function renderGroup(title, id, items) {
  const rows = items
    .map(i => `<li><code>${i.ref || i.file}</code> - ${i.snippet || ''}</li>`) 
    .join('\n');
  return `\n<details open>\n  <summary>${title} (${items.length})</summary>\n  <ul id="${id}">\n    ${rows}\n  </ul>\n</details>`;
}

function buildHtml(groups) {
  const { chatDerived, codeDecisions, todos, openQuestions } = groups;
  const body = [
    renderGroup('Chat Derived', 'chat', chatDerived),
    renderGroup('Code Decisions', 'decisions', codeDecisions),
    renderGroup('TODOs', 'todos', todos),
    renderGroup('Open Questions', 'questions', openQuestions)
  ].join('\n');

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Trace Timeline</title>
<style>
body{font-family:Arial,Helvetica,sans-serif;margin:20px;}
input{padding:5px;width:50%;margin-bottom:10px;}
details{margin-bottom:15px;}
summary{cursor:pointer;font-weight:bold;}
</style>
</head>
<body>
<h1>Trace Timeline</h1>
<input type="text" id="search" placeholder="Search..." oninput="filter(this.value)">
${body}
<script>
function filter(t){t=t.toLowerCase();['chat','decisions','todos','questions'].forEach(function(id){document.querySelectorAll('#'+id+' li').forEach(function(li){li.style.display=li.textContent.toLowerCase().includes(t)?'':'none';});});}
</script>
</body>
</html>`;
  return html;
}

function main() {
  const timeline = loadTimeline();
  const html = buildHtml(groupItems(timeline));
  fs.writeFileSync(outputHtml, html);
  console.log(`Timeline dashboard written to ${outputHtml}`);
}

if (require.main === module) {
  main();
}
