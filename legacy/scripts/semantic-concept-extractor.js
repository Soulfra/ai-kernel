#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_FILE = path.join(ROOT_DIR, 'project_meta', 'semantic_concept_map.json');
const INCLUDE_EXT = ['.md', '.markdown', '.json', '.js'];
const MAX_FILE_SIZE = 1024 * 1024; // 1MB

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules' && file !== '.git') {
        walk(fullPath, fileList);
      }
    } else if (INCLUDE_EXT.includes(path.extname(file))) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function extractMarkdownConcepts(content, filePath) {
  const concepts = [];
  // YAML frontmatter
  const frontmatterMatch = content.match(/^---([\s\S]*?)---/);
  if (frontmatterMatch) {
    try {
      const meta = yaml.load(frontmatterMatch[1]);
      if (meta && typeof meta === 'object') {
        for (const [k, v] of Object.entries(meta)) {
          concepts.push({ type: 'frontmatter', key: k, value: v, file: filePath });
        }
      }
    } catch {}
  }
  // Headings
  const headingRegex = /^#+\s+(.*)$/gm;
  let m;
  while ((m = headingRegex.exec(content))) {
    concepts.push({ type: 'heading', value: m[1], file: filePath });
  }
  // Markdown links
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  while ((m = linkRegex.exec(content))) {
    concepts.push({ type: 'link', text: m[1], target: m[2], file: filePath });
  }
  // Repeated phrases (naive, for demo)
  const words = content.split(/\W+/).filter(w => w.length > 3);
  const freq = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;
  for (const [w, count] of Object.entries(freq)) {
    if (count > 3) concepts.push({ type: 'repeated', value: w, count, file: filePath });
  }
  return concepts;
}

function extractJsonConcepts(content, filePath) {
  const concepts = [];
  try {
    const obj = JSON.parse(content);
    function recurse(o, pathArr = []) {
      if (typeof o === 'object' && o !== null) {
        for (const [k, v] of Object.entries(o)) {
          concepts.push({ type: 'json_key', key: k, path: [...pathArr, k].join('.'), file: filePath });
          recurse(v, [...pathArr, k]);
        }
      }
    }
    recurse(obj);
  } catch {}
  return concepts;
}

function extractJsConcepts(content, filePath) {
  const concepts = [];
  // Imports/requires
  const importRegex = /import\s+.*?from\s+['"](.*?)['"]/g;
  let m;
  while ((m = importRegex.exec(content))) {
    concepts.push({ type: 'import', target: m[1], file: filePath });
  }
  const requireRegex = /require\(['"](.*?)['"]\)/g;
  while ((m = requireRegex.exec(content))) {
    concepts.push({ type: 'require', target: m[1], file: filePath });
  }
  // Exported functions/classes
  const exportRegex = /export\s+(function|class)\s+(\w+)/g;
  while ((m = exportRegex.exec(content))) {
    concepts.push({ type: 'export', kind: m[1], name: m[2], file: filePath });
  }
  return concepts;
}

function extractConcepts(filePath) {
  if (fs.statSync(filePath).size > MAX_FILE_SIZE) return [];
  const ext = path.extname(filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  if (ext === '.md' || ext === '.markdown') return extractMarkdownConcepts(content, filePath);
  if (ext === '.json') return extractJsonConcepts(content, filePath);
  if (ext === '.js') return extractJsConcepts(content, filePath);
  return [];
}

function main() {
  const allFiles = walk(ROOT_DIR);
  const conceptMap = [];
  for (const file of allFiles) {
    const concepts = extractConcepts(file);
    for (const c of concepts) conceptMap.push(c);
  }
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(conceptMap, null, 2));
  console.log(`Extracted ${conceptMap.length} concepts from ${allFiles.length} files.`);
  // TODO: Integrate with clustering, density analysis, and ledger logging
}

if (require.main === module) main(); 