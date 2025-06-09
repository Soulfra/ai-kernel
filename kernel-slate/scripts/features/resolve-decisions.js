#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { Configuration, OpenAIApi } = require('openai');

const repoRoot = path.resolve(__dirname, '../..');
const traceFile = path.join(repoRoot, 'docs', 'trace-timeline.json');
const outputFile = path.join(repoRoot, 'docs', 'resolved-decisions.md');

async function run() {
  if (!fs.existsSync(traceFile)) {
    console.error('Missing trace timeline JSON');
    process.exit(1);
  }
  const timeline = JSON.parse(fs.readFileSync(traceFile, 'utf8'));
  const questions = timeline.filter(t => t.type === 'question');
  const todos = timeline.filter(t => t.type === 'TODO');
  const prompt = `You are an engineering assistant.\n`+
    `Answer the following open questions and consolidate TODOs.\n`+
    `Questions:\n`+
    questions.map(q => `- ${q.snippet} (${q.file})`).join('\n') + '\n' +
    `TODOs:\n`+
    todos.map(t => `- ${t.snippet} (${t.file})`).join('\n');

  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not set for LLM summarization');
    process.exit(1);
  }

  const conf = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
  const openai = new OpenAIApi(conf);
  const resp = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }]
  });
  const answer = resp.data.choices[0].message.content.trim();
  fs.writeFileSync(outputFile, answer);
  console.log(`Wrote ${outputFile}`);
}

if (require.main === module) {
  run().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
