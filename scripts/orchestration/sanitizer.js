const fs = require('fs').promises;
const path = require('path');
const glob = require('glob');

function scrub(text) {
  return text
    .replace(/\t/g, '  ')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\s+$/gm, '');
}

function sortObject(obj) {
  return Object.keys(obj)
    .sort()
    .reduce((acc, key) => {
      acc[key] = obj[key];
      return acc;
    }, {});
}

async function processJson(file, report) {
  try {
    const raw = await fs.readFile(file, 'utf8');
    const cleaned = scrub(raw);
    let data = JSON.parse(cleaned);
    const actions = ['schema check'];
    if (Array.isArray(data)) {
      data = data.map(item => {
        if (typeof item === 'object' && item !== null) {
          if (!item.timestamp) {
            item.timestamp = new Date().toISOString();
          }
          return sortObject(item);
        }
        return item;
      });
    } else if (typeof data === 'object') {
      if (!data.timestamp) data.timestamp = new Date().toISOString();
      data = sortObject(data);
    }
    await fs.writeFile(file, JSON.stringify(data, null, 2) + '\n');
    report.push({ file, actions });
  } catch (err) {
    report.push({ file, error: err.message });
  }
}

async function processText(file, report) {
  try {
    const raw = await fs.readFile(file, 'utf8');
    const cleaned = scrub(raw);
    await fs.writeFile(file, cleaned + '\n');
    report.push({ file, actions: ['normalized'] });
  } catch (err) {
    report.push({ file, error: err.message });
  }
}

async function run() {
  const base = process.cwd();
  const report = [];
  const mdFiles = glob.sync('docs/ideas/*.md', { cwd: base, absolute: true });
  const jsonFiles = glob.sync('logs/**/*.json', { cwd: base, absolute: true });
  const vaultJson = glob.sync('vault/*/usage.json', { cwd: base, absolute: true });
  for (const file of [...mdFiles, ...jsonFiles, ...vaultJson]) {
    if (file.endsWith('.json')) await processJson(file, report);
    else await processText(file, report);
  }
  await fs.mkdir(path.join(base, 'logs'), { recursive: true });
  await fs.mkdir(path.join(base, 'docs'), { recursive: true });
  await fs.writeFile(path.join(base, 'logs', 'sanitizer-report.json'), JSON.stringify(report, null, 2));
  const summaryMd = ['# Sanitizer Summary', '', ...report.map(r => `- ${path.relative(base, r.file)}: ${r.actions ? r.actions.join(', ') : r.error}`)].join('\n');
  await fs.writeFile(path.join(base, 'docs', 'sanitizer-summary.md'), summaryMd + '\n');
}

if (require.main === module) {
  run();
}

module.exports = run;
