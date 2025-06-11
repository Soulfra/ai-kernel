/**
 * @file update-context-index.js
 * @description Parses completed context/LLM/doc tasks from batches.json and updates context-index.json. Appends a summary for each completed context/LLM/doc task. Usage: node scripts/update-context-index.js
 */

const fs = require('fs').promises;
const path = require('path');

const BATCHES_PATH = path.resolve(__dirname, 'batches.json');
const CONTEXT_INDEX = path.resolve(__dirname, '../docs/context-index.json');

function formatContextEntry(task) {
  const now = new Date().toISOString();
  return {
    id: task.id,
    type: task.type,
    contextId: task.contextId || null,
    docPath: task.docPath || null,
    prompt: task.prompt || null,
    user: task.user,
    status: task.status,
    timestamp: now
  };
}

async function main() {
  const batches = JSON.parse(await fs.readFile(BATCHES_PATH, 'utf8'));
  const contextTasks = batches.filter(b =>
    (b.type === 'context-index' || b.type === 'llm-call' || b.type === 'doc-update') &&
    (b.status === 'done' || b.status === 'completed' || b.status === 'success')
  );
  if (!contextTasks.length) {
    console.log('No completed context/LLM/doc tasks to index.');
    return;
  }
  let index = [];
  try {
    index = JSON.parse(await fs.readFile(CONTEXT_INDEX, 'utf8'));
  } catch {}
  for (const task of contextTasks) {
    index.push(formatContextEntry(task));
  }
  await fs.writeFile(CONTEXT_INDEX, JSON.stringify(index, null, 2));
  console.log('Context/documentation index updated.');
}

if (require.main === module) {
  main().catch(err => {
    console.error('Failed to update context index:', err);
    process.exit(1);
  });
} 