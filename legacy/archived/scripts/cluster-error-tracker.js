/**
 * @file cluster-error-tracker.js
 * @description Parses orchestrator logs and batches.json, clusters errors by type/message/source, and outputs error-clusters.json. Usage: node scripts/cluster-error-tracker.js
 */

const fs = require('fs').promises;
const path = require('path');

const BATCHES_PATH = path.resolve(__dirname, 'batches.json');
const STATUS_PATH = path.resolve(__dirname, 'pipeline-status.json');
const ERROR_CLUSTERS = path.resolve(__dirname, 'error-clusters.json');
const CONSOLIDATION_LOGS_DIR = path.resolve(__dirname, '../logs/consolidation');
const LOGS_DIR = path.resolve(__dirname, '../logs');
const ERROR_CLUSTERS_MD = path.resolve(__dirname, 'error-clusters.md');

function extractErrorCode(message) {
  // Extracts error code like ENOENT, EACCES, etc.
  const match = message && message.match(/([A-Z]{3,10}):/);
  return match ? match[1] : (message ? message.split(':')[0] : 'Unknown');
}

function getRecommendation(code) {
  switch (code) {
    case 'ENOENT': return 'Check for missing or misnamed files.';
    case 'EACCES': return 'Check file or directory permissions.';
    case 'ValidationError': return 'Validate YAML frontmatter or schema.';
    default: return 'Review error details.';
  }
}

async function collectConsolidationErrors() {
  let errors = [];
  try {
    const files = await fs.readdir(CONSOLIDATION_LOGS_DIR);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const fullPath = path.join(CONSOLIDATION_LOGS_DIR, file);
        try {
          const report = JSON.parse(await fs.readFile(fullPath, 'utf8'));
          if (report.analysis && Array.isArray(report.analysis.issues)) {
            for (const issue of report.analysis.issues) {
              errors.push({
                message: issue.error,
                file: fullPath,
                path: issue.path,
                source: 'consolidation',
              });
            }
          }
        } catch {}
      }
    }
  } catch {}
  return errors;
}

async function collectLogErrors() {
  // Scan logs/*/*.log and .json for error lines/entries
  let errors = [];
  async function scanLogFile(filePath) {
    try {
      const ext = path.extname(filePath);
      if (ext === '.log') {
        const lines = (await fs.readFile(filePath, 'utf8')).split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const entry = JSON.parse(line);
            if (entry.level === 'error' || entry.level === 'fatal' || entry.level === 'warn') {
              errors.push({
                message: entry.message,
                timestamp: entry.timestamp,
                file: filePath,
                level: entry.level,
                metadata: entry.metadata,
                source: 'log',
              });
            }
          } catch {}
        }
      } else if (ext === '.json') {
        // Try to parse as array or object with errors
        try {
          const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
          if (Array.isArray(data)) {
            for (const entry of data) {
              if (entry.level === 'error' || entry.level === 'fatal' || entry.level === 'warn') {
                errors.push({
                  message: entry.message,
                  timestamp: entry.timestamp,
                  file: filePath,
                  level: entry.level,
                  metadata: entry.metadata,
                  source: 'log',
                });
              }
            }
          } else if (data.errors || data.issues) {
            for (const entry of (data.errors || data.issues)) {
              errors.push({
                message: entry.message || entry.error,
                timestamp: entry.timestamp,
                file: filePath,
                source: 'log',
              });
            }
          }
        } catch {}
      }
    } catch {}
  }
  async function walk(dir) {
    let files = [];
    try {
      for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) files = files.concat(await walk(full));
        else if (entry.name.endsWith('.log') || entry.name.endsWith('.json')) files.push(full);
      }
    } catch {}
    return files;
  }
  const logFiles = await walk(LOGS_DIR);
  for (const file of logFiles) {
    await scanLogFile(file);
  }
  return errors;
}

function clusterErrorsMax(errors) {
  // Cluster by error code, then by message substring
  const clusters = {};
  for (const err of errors) {
    const code = extractErrorCode(err.message);
    if (!clusters[code]) clusters[code] = [];
    clusters[code].push(err);
  }
  // Add metadata to each cluster
  const result = {};
  for (const code in clusters) {
    const group = clusters[code];
    // Sort by timestamp if available
    group.sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
    result[code] = {
      count: group.length,
      example: group[0].message,
      sources: group.map(e => ({ file: e.file, path: e.path, id: e.id, batch: e.batch, user: e.user, source: e.source, timestamp: e.timestamp })),
      firstOccurrence: group[0].timestamp,
      lastOccurrence: group[group.length - 1].timestamp,
      recommendation: getRecommendation(code)
    };
  }
  return result;
}

function generateMarkdownSummary(clusters) {
  let md = `# Error Clusters\n\n`;
  for (const code in clusters) {
    const c = clusters[code];
    md += `## ${code} (${c.count})\n`;
    md += `- **Recommendation:** ${c.recommendation}\n`;
    md += `- **Example:** \`${c.example}\`\n`;
    if (c.firstOccurrence) md += `- **First Occurrence:** ${c.firstOccurrence}\n`;
    if (c.lastOccurrence) md += `- **Last Occurrence:** ${c.lastOccurrence}\n`;
    if (c.sources && c.sources.length) {
      md += `- **First Source:** \`${JSON.stringify(c.sources[0])}\`\n`;
    }
    md += '\n';
  }
  return md;
}

async function main() {
  let errors = [];
  // Parse batches.json for failed/error tasks
  try {
    const batches = JSON.parse(await fs.readFile(BATCHES_PATH, 'utf8'));
    for (const b of batches) {
      if (b.status === 'error' || b.status === 'failed') {
        errors.push({
          id: b.id,
          type: b.type,
          message: b.error || (b.result && b.result.error) || 'Unknown error',
          batch: b.batch,
          user: b.user,
          source: 'batch',
          timestamp: b.timestamp
        });
      }
    }
  } catch {}
  // Parse pipeline-status.json for last error
  try {
    const status = JSON.parse(await fs.readFile(STATUS_PATH, 'utf8'));
    if (status.status === 'error' && status.error) {
      errors.push({
        id: status.step,
        type: 'pipeline',
        message: status.error,
        source: 'pipeline',
        user: null,
        timestamp: status.timestamp
      });
    }
  } catch {}
  // Parse consolidation logs
  const consolidationErrors = await collectConsolidationErrors();
  errors = errors.concat(consolidationErrors);
  // Parse all logs/*/*.log and .json
  const logErrors = await collectLogErrors();
  errors = errors.concat(logErrors);
  if (!errors.length) {
    console.log('No errors to cluster.');
    return;
  }
  const clusters = clusterErrorsMax(errors);
  await fs.writeFile(ERROR_CLUSTERS, JSON.stringify(clusters, null, 2));
  await fs.writeFile(ERROR_CLUSTERS_MD, generateMarkdownSummary(clusters));
  // Test mode: print summary
  if (process.argv.includes('--test')) {
    for (const code in clusters) {
      const c = clusters[code];
      console.log(`\n[${code}] (${c.count}) - ${c.recommendation}`);
      console.log(`  Example: ${c.example}`);
      if (c.firstOccurrence) console.log(`  First Occurrence: ${c.firstOccurrence}`);
      if (c.lastOccurrence) console.log(`  Last Occurrence: ${c.lastOccurrence}`);
      if (c.sources && c.sources.length) {
        console.log(`  First source:`, c.sources[0]);
      }
    }
  } else {
    console.log(`Clustered ${errors.length} errors into ${Object.keys(clusters).length} groups in ${ERROR_CLUSTERS}`);
    console.log(`Markdown summary written to ${ERROR_CLUSTERS_MD}`);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('Failed to cluster errors:', err);
    process.exit(1);
  });
} 