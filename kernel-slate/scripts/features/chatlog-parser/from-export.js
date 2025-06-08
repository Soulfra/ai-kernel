#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { parseChatLog, messagesToConcepts } = require('../chatlog-utils');
const { SemanticEngine } = require('../../core/semantic-engine');
const { clusterConcepts, writeClusterSummary } = require('../cluster-utils');
const linkSequential = require('../link-sequential');

function parseJsonExport(obj) {
  const messages = [];
  if (Array.isArray(obj)) {
    obj.forEach(m => {
      if (m && m.role && m.content) {
        messages.push({ role: m.role.toLowerCase(), content: m.content, timestamp: m.timestamp || null });
      }
    });
    return messages;
  }
  if (obj.mapping) {
    const nodes = Object.values(obj.mapping).filter(n => n.message);
    nodes.sort((a, b) => (a.message.create_time || 0) - (b.message.create_time || 0));
    for (const n of nodes) {
      const m = n.message;
      if (!m.author || !m.content) continue;
      const content = Array.isArray(m.content.parts) ? m.content.parts.join('\n') : m.content.text || '';
      messages.push({
        role: m.author.role.toLowerCase(),
        content,
        timestamp: m.create_time ? new Date(m.create_time * 1000).toISOString() : null
      });
    }
    return messages;
  }
  if (Array.isArray(obj.conversations)) {
    for (const conv of obj.conversations) {
      if (!Array.isArray(conv.messages)) continue;
      for (const m of conv.messages) {
        if (!m.author || !m.content) continue;
        const content = Array.isArray(m.content.parts) ? m.content.parts.join('\n') : m.content.text || m.content;
        messages.push({
          role: m.author.role.toLowerCase(),
          content,
          timestamp: m.create_time ? new Date(m.create_time * 1000).toISOString() : null
        });
      }
    }
    return messages;
  }
  throw new Error('Unsupported JSON structure');
}

function parseHtmlExport(html) {
  const $ = cheerio.load(html);
  const text = $('body').text();
  return parseChatLog(text);
}

(async () => {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node from-export.js <file>');
    process.exit(1);
  }
  let raw;
  try {
    raw = fs.readFileSync(path.resolve(file), 'utf-8');
  } catch (err) {
    console.error(`[!] Failed to read ${file}: ${err.message}`);
    process.exit(1);
  }
  const ext = path.extname(file).toLowerCase();
  let messages = [];
  try {
    if (ext === '.txt' || ext === '.md') {
      messages = parseChatLog(raw);
    } else if (ext === '.json') {
      const data = JSON.parse(raw);
      messages = parseJsonExport(data);
    } else if (ext === '.html' || ext === '.htm') {
      messages = parseHtmlExport(raw);
    } else {
      throw new Error('Unsupported file format');
    }
  } catch (err) {
    console.error(`[!] Failed to parse file: ${err.message}`);
    process.exit(1);
  }

  if (!messages.length) {
    console.log('[!] No messages found.');
    process.exit(0);
  }
  console.log(`[✓] Parsed ${messages.length} messages`);

  const concepts = messagesToConcepts(messages);
  const engine = new SemanticEngine({
    vectorStore: {},
    graphStore: {},
    embedding: {},
    clustering: { minClusterSize: 2, minSamples: 1 },
    relationship: {},
    validation: {}
  });

  for (const c of concepts) {
    await engine.addConcept(c);
  }
  console.log('[✓] Added to engine');

  const clusters = await clusterConcepts(concepts, engine);
  console.log(`[✓] Clustered into ${clusters.length} groups`);

  await linkSequential(concepts, engine);
  if (concepts.length > 1) {
    console.log(`[✓] Linked ${concepts.length - 1} relationships`);
  } else {
    console.log('[✓] Linked 0 relationships');
  }

  const summaryOut = path.resolve(__dirname, '..', '..', 'docs', 'chat-summary.md');
  writeClusterSummary(engine, summaryOut);
  console.log(`[✓] Wrote summary to ${path.relative(process.cwd(), summaryOut)}`);
})();
