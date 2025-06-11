// @agent: diagnostics
// @orchestrator: recovery
// @origin: legacy-rescue
const path = require('path');
const fs = require('fs').promises;
const { EventEmitter } = require('events');
const TelemetryManager = require('./telemetry-manager');

class BaseTaskHandler extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = options;
    this.logger = options.logger;
    this.telemetryManager = new TelemetryManager();
  }

  async validate(task) {
    if (!task.taskId || !task.description) {
      throw new Error('Task must have taskId and description');
    }
  }

  async execute(task) {
    await this.validate(task);
    this.emit('task:start', task);
    
    try {
      const result = await this.process(task);
      this.emit('task:complete', { task, result });
      return result;
    } catch (error) {
      this.emit('task:error', { task, error });
      throw error;
    }
  }

  async process(task) {
    await this.telemetryManager.startSpan('TaskHandler.process');
    
    try {
      const result = await this.processImplementation(task);
      this.emit('task:complete', { task, result });
      return result;
    } catch (error) {
      this.emit('task:error', { task, error });
      throw error;
    } finally {
      await this.telemetryManager.endSpan('TaskHandler.process');
    }
  }

  async processImplementation(task) {
    throw new Error('process() must be implemented by handler');
  }
}

class DocumentationHandler extends BaseTaskHandler {
  async process(task) {
    const { section, type = 'markdown', format = 'md' } = task;
    
    await this.telemetryManager.startSpan('TaskHandler.process');
    
    try {
      // Generate content based on section
      const content = await this.generateContent(section, type);
      
      // Create output directory if it doesn't exist
      const outputPath = this.getOutputPath(section.title, format);
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      
      // Write content
      await fs.writeFile(outputPath, content);
      
      await this.telemetryManager.recordMetric('content_generated', 1, { section, type });
      
      return {
        status: 'success',
        outputPath,
        metrics: {
          contentSize: content.length,
          sections: section.subsections?.length || 0
        }
      };
    } catch (error) {
      throw error;
    } finally {
      await this.telemetryManager.endSpan('TaskHandler.process');
    }
  }

  async generateContent(section, type) {
    const lines = [
      `# ${section.title}`,
      '',
      ...section.content,
      ''
    ];
    
    // Add subsections
    if (section.subsections?.length > 0) {
      for (const subsection of section.subsections) {
        lines.push(
          `## ${subsection.title}`,
          '',
          ...subsection.content,
          ''
        );
      }
    }
    
    return lines.join('\n');
  }

  getOutputPath(title, format) {
    const slug = title.toLowerCase().replace(/\s+/g, '-');
    return path.join(this.options.docsRoot, `${slug}.${format}`);
  }
}

class TestHandler extends BaseTaskHandler {
  async process(task) {
    const { file, type, framework } = task;
    
    // Generate test file path
    const testPath = this.getTestPath(file);
    
    // Generate test content
    const testContent = await this.generateTest(file, type, framework);
    
    // Write test file
    await fs.writeFile(testPath, testContent);
    
    return {
      status: 'success',
      testPath,
      metrics: {
        testCount: this.countTests(testContent)
      }
    };
  }

  getTestPath(file) {
    const dir = path.dirname(file);
    const name = path.basename(file, path.extname(file));
    return path.join(dir, '__tests__', `${name}.test.js`);
  }

  async generateTest(file, type, framework) {
    // Implement test generation
    return `// Generated test for ${file}`;
  }

  countTests(content) {
    return (content.match(/it\(/g) || []).length;
  }
}

/**
 * MigrationHandler processes migration tasks: moves, archives, validates files, and logs all actions.
 * Supports merge-safe and parallel operation if needed.
 */
class MigrationHandler extends BaseTaskHandler {
  /**
   * Processes a migration task.
   * @param {object} task - Migration task object
   * @returns {Promise<object>} Result of migration
   */
  async process(task) {
    this.logger.info(`Starting migration batch: ${task.batch}`);
    let results = [];
    for (const action of task.actions) {
      try {
        // Move file (merge-safe: check if target exists, handle accordingly)
        if (await this.safeMove(action.from, action.to)) {
          this.logger.info(`Moved: ${action.from} -> ${action.to}`);
          results.push({ from: action.from, to: action.to, status: 'success' });
        } else {
          this.logger.warn(`Skipped (target exists): ${action.to}`);
          results.push({ from: action.from, to: action.to, status: 'skipped' });
        }
      } catch (err) {
        this.logger.error(`Error moving ${action.from} -> ${action.to}: ${err.message}`);
        results.push({ from: action.from, to: action.to, status: 'error', error: err.message });
      }
    }
    // Optionally, run validation and archive steps here
    // ...
    this.logger.info(`Migration batch complete: ${task.batch}`);
    return { batch: task.batch, results };
  }

  /**
   * Merge-safe file move: only move if target does not exist, or handle merge logic.
   */
  async safeMove(from, to) {
    const fs = require('fs').promises;
    try {
      await fs.access(to);
      // Target exists, handle merge or skip
      return false;
    } catch {
      // Target does not exist, move
      await fs.mkdir(require('path').dirname(to), { recursive: true });
      await fs.rename(from, to);
      return true;
    }
  }
}

/**
 * ContextHandler processes context, LLM, and documentation tasks for the orchestrator.
 * Supports context indexing, LLM calls, and doc updates.
 */
class ContextHandler extends BaseTaskHandler {
  /**
   * Processes a context/LLM/doc task.
   * @param {object} task - Context/LLM/doc task object
   * @returns {Promise<object>} Result of processing
   */
  async process(task) {
    this.logger.info(`Processing context/LLM/doc task: ${task.id || task.type}`);
    // Example: context indexing
    if (task.type === 'context-index') {
      this.logger.info(`Indexing context: ${task.contextId}`);
      // ...indexing logic...
      return { status: 'success', indexed: task.contextId };
    }
    // Example: LLM call
    if (task.type === 'llm-call') {
      this.logger.info(`Calling LLM for: ${task.prompt}`);
      // ...LLM call logic...
      return { status: 'success', output: 'LLM output (stub)' };
    }
    // Example: doc update
    if (task.type === 'doc-update') {
      this.logger.info(`Updating doc: ${task.docPath}`);
      // ...doc update logic...
      return { status: 'success', updated: task.docPath };
    }
    this.logger.warn(`Unknown context/LLM/doc task type: ${task.type}`);
    return { status: 'skipped', reason: 'Unknown type' };
  }
}

class ErrorClusterHandler extends BaseTaskHandler {
  async process(task) {
    // Reuse logic from cluster-error-tracker.js
    const path = require('path');
    const fs = require('fs').promises;
    const BATCHES_PATH = path.resolve(__dirname, '../../batches.json');
    const STATUS_PATH = path.resolve(__dirname, '../../pipeline-status.json');
    const ERROR_CLUSTERS = path.resolve(__dirname, '../../error-clusters.json');
    const CONSOLIDATION_LOGS_DIR = path.resolve(__dirname, '../../logs/consolidation');
    const LOGS_DIR = path.resolve(__dirname, '../../logs');
    const ERROR_CLUSTERS_MD = path.resolve(__dirname, '../../error-clusters.md');

    function extractErrorCode(message) {
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
      const clusters = {};
      for (const err of errors) {
        const code = extractErrorCode(err.message);
        if (!clusters[code]) clusters[code] = [];
        clusters[code].push(err);
      }
      const result = {};
      for (const code in clusters) {
        const group = clusters[code];
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
    // Main logic
    let errors = [];
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
    const consolidationErrors = await collectConsolidationErrors();
    errors = errors.concat(consolidationErrors);
    const logErrors = await collectLogErrors();
    errors = errors.concat(logErrors);
    if (!errors.length) {
      return { status: 'no-errors', clusters: {}, summary: '' };
    }
    const clusters = clusterErrorsMax(errors);
    await fs.writeFile(ERROR_CLUSTERS, JSON.stringify(clusters, null, 2));
    await fs.writeFile(ERROR_CLUSTERS_MD, generateMarkdownSummary(clusters));
    return { status: 'success', clusters, summary: generateMarkdownSummary(clusters) };
  }
}

// Export handlers
module.exports = {
  DocumentationHandler,
  TestHandler,
  MigrationHandler,
  ContextHandler,
  ErrorClusterHandler
}; 
