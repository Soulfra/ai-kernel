const EventEmitter = require('events');
const path = require('path');
const fs = require('fs').promises;
const LogOrchestrator = require('./log-orchestrator');
const DebugOrchestrator = require('./debug-orchestrator');
const TaskOrchestrator = require('./task-orchestrator');
const TelemetryManager = require('./telemetry-manager');
const createLogger = require('./auto-logger');
let yaml;
try {
  const requireOrInstall = require('../utils/requireOrInstall');
  yaml = requireOrInstall('js-yaml');
} catch (err) {
  console.error("Missing dependency 'js-yaml'. Please run `npm install js-yaml`.");
  process.exit(1);
}
const glob = require('glob');
const matter = require('gray-matter');

/**
 * DocumentationOrchestrator
 * Now supports dependency injection for logger and telemetryManager.
 * Usage:
 *   new DocumentationOrchestrator(options, { logger, telemetryManager })
 *   // Defaults to auto-logger and canonical TelemetryManager if not provided
 */
class DocumentationOrchestrator extends EventEmitter {
  /**
   * @param {object} options
   * @param {object} di - Dependency injection: { logger, telemetryManager, orchestratorOverrides }
   * orchestratorOverrides: { [className]: OrchestratorClass }
   */
  constructor(options = {}, { logger, telemetryManager, orchestratorOverrides } = {}) {
    super();
    this.options = {
      docsDir: options.docsDir || './docs',
      templatesDir: options.templatesDir || './docs/templates',
      cacheDir: options.cacheDir || './cache',
      maxConcurrent: options.maxConcurrent || 5,
      enableCaching: options.enableCaching || true,
      enableEnhancement: options.enableEnhancement || true,
      enableTemplates: options.enableTemplates || true,
      enableMetrics: options.enableMetrics || true,
      maxFileLines: options.maxFileLines || 250,
      requiredDocFields: options.requiredDocFields || ['title', 'description', 'lastUpdated', 'version'],
      requiredSections: options.requiredSections || [
        'Overview',
        'Implementation',
        'Testing',
        'Maintenance'
      ],
      ...options
    };

    this.logger = logger || new LogOrchestrator({
      logDir: path.join(__dirname, '../../logs'),
      enableMetrics: true
    });

    this.debugger = new DebugOrchestrator({
      debugDir: path.join(__dirname, '../../debug'),
      enableAutoResolution: true
    });

    this.taskOrchestrator = new TaskOrchestrator({
      taskDir: path.join(this.options.docsDir, 'tasks'),
      maxConcurrent: this.options.maxConcurrent
    });

    this.cache = new Map();
    this.templates = new Map();
    this.documents = new Map();
    this.metrics = new Map();
    this.validationResults = new Map();

    this.telemetryManager = telemetryManager || new TelemetryManager();
    this.orchestratorOverrides = orchestratorOverrides || {};
  }

  async initialize() {
    try {
      await this.logger.initialize();
      await this.debugger.initialize();
      await this.taskOrchestrator.initialize();
      logger.info('Initializing DocumentationOrchestrator');

      await this.telemetryManager.startSpan('DocumentationOrchestrator.initialize');

      // Create necessary directories
      await this.ensureDirectories();

      // Load templates
      await this.loadTemplates();

      // Load existing documents
      await this.loadDocumentation();

      // Validate documentation
      await this.validateDocumentation();

      // Set up document processing
      this.setupDocumentProcessing();

      logger.info('DocumentationOrchestrator initialized', {
        docCount: this.documents.size,
        templateCount: this.templates.size
      });

      await this.telemetryManager.endSpan('DocumentationOrchestrator.initialize');

      this.emit('initialized', {
        docCount: this.documents.size,
        templateCount: this.templates.size
      });
    } catch (error) {
      logger.error('Failed to initialize DocumentationOrchestrator', {
        error: error.message,
        stack: error.stack
      });
      this.emit('error', new Error(`Failed to initialize DocumentationOrchestrator: ${error.message}`));
      throw error;
    }
  }

  async ensureDirectories() {
    const directories = [
      this.options.docsDir,
      this.options.templatesDir,
      this.options.cacheDir,
      path.join(this.options.docsDir, 'tasks')
    ];

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error;
        }
      }
    }
  }

  async loadTemplates() {
    const templateFiles = await glob('**/*.md', { cwd: this.options.templatesDir });
    for (const file of templateFiles) {
      const content = await fs.readFile(path.join(this.options.templatesDir, file), 'utf8');
      this.templates.set(file, content);
    }
  }

  async loadDocumentation() {
    const docFiles = await glob('**/*.md', { cwd: this.options.docsDir });
    for (const file of docFiles) {
      const content = await fs.readFile(path.join(this.options.docsDir, file), 'utf8');
      const { data, content: markdown } = matter(content);
      this.documents.set(file, { frontmatter: data, content: markdown });
    }
  }

  async validateDocumentation() {
    for (const [file, doc] of this.documents) {
      const validation = {
        hasRequiredFields: this.validateRequiredFields(doc.frontmatter),
        hasValidFrontmatter: this.validateFrontmatter(doc.frontmatter),
        hasValidContent: this.validateContent(doc.content),
        hasValidLinks: await this.validateLinks(doc.content, file),
        isWithinLineLimit: this.validateLineLimit(doc.content)
      };
      this.validationResults.set(file, validation);
    }
  }

  validateRequiredFields(frontmatter) {
    return this.options.requiredDocFields.every(field => frontmatter[field]);
  }

  validateFrontmatter(frontmatter) {
    try {
      return typeof frontmatter === 'object' && frontmatter !== null;
    } catch {
      return false;
    }
  }

  validateContent(content) {
    return content && content.length > 0;
  }

  async validateLinks(content, currentFile) {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const links = [...content.matchAll(linkRegex)].map(match => match[2]);
    const results = [];
    
    for (const link of links) {
      if (link.startsWith('http')) continue;
      
      const targetPath = path.resolve(path.dirname(path.join(this.options.docsDir, currentFile)), link);
      try {
        await fs.access(targetPath);
        results.push({ link, valid: true });
      } catch {
        results.push({ link, valid: false });
      }
    }
    
    return results.every(r => r.valid);
  }

  validateLineLimit(content) {
    return content.split('\n').length <= this.options.maxFileLines;
  }

  setupDocumentProcessing() {
    // Process documents in the queue
    setInterval(() => this.processDocumentQueue(), 1000);
  }

  async generateDocumentation(params) {
    const { template, targetPath, data } = params;
    
    if (!this.templates.has(template)) {
      throw new Error(`Template ${template} not found`);
    }
    
    const templateContent = this.templates.get(template);
    const frontmatter = {
      ...data,
      lastUpdated: new Date().toISOString(),
      version: '1.0.0'
    };
    
    const content = matter.stringify(templateContent, frontmatter);
    const fullPath = path.join(this.options.docsDir, targetPath);
    
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content);
    
    this.logger.info('Generated documentation', {
      template,
      targetPath,
      data
    });
    
    return { path: targetPath, content };
  }

  async updateDocumentation(params) {
    const { targetPath, updates } = params;
    
    if (!this.documents.has(targetPath)) {
      throw new Error(`Document ${targetPath} not found`);
    }
    
    const doc = this.documents.get(targetPath);
    const updatedFrontmatter = {
      ...doc.frontmatter,
      ...updates.frontmatter,
      lastUpdated: new Date().toISOString()
    };
    
    const content = matter.stringify(updates.content || doc.content, updatedFrontmatter);
    const fullPath = path.join(this.options.docsDir, targetPath);
    
    await fs.writeFile(fullPath, content);
    
    this.logger.info('Updated documentation', {
      targetPath,
      updates
    });
    
    return { path: targetPath, content };
  }

  async processDocument(document, type, context = {}) {
    const cacheKey = this.generateCacheKey(document, type, context);
    
    if (this.options.enableCaching) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        logger.info('Cache hit', { type, cacheKey });
        return cached;
      }
    }

    let processedDocument = document;

    if (this.options.enableTemplates) {
      processedDocument = await this.processTemplate(processedDocument, type, context);
    }

    if (this.options.enableEnhancement) {
      processedDocument = await this.enhanceDocument(processedDocument, type);
    }

    if (this.options.enableCaching) {
      this.cache.set(cacheKey, processedDocument);
    }

    logger.info('Document processed', {
      type,
      originalLength: document.length,
      processedLength: processedDocument.length
    });

    await this.telemetryManager.endSpan('DocumentationOrchestrator.processDocument');

    return processedDocument;
  }

  async processTemplate(document, type, context) {
    const template = this.templates.get(`${type}.template`);
    if (!template) {
      return document;
    }

    // Replace template variables with context values
    let processed = template;
    for (const [key, value] of Object.entries(context)) {
      processed = processed.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    return processed;
  }

  async enhanceDocument(document, type) {
    // Implement document enhancement logic
    // This could include:
    // - Adding metadata
    // - Formatting
    // - Link validation
    // - Content validation
    await this.telemetryManager.recordMetric('document_enhanced', 1, { type });
    return document;
  }

  generateCacheKey(document, type, context) {
    const contextString = JSON.stringify(context);
    return `${type}-${document.length}-${contextString}`;
  }

  async validateDocument(document, type) {
    const taskId = await this.taskOrchestrator.addTask({
      type: 'validation',
      action: 'validate',
      document,
      documentType: type
    });

    return this.taskOrchestrator.getTask(taskId);
  }

  async migrateDocument(document, type, targetType) {
    const taskId = await this.taskOrchestrator.addTask({
      type: 'migration',
      action: 'migrate',
      document,
      sourceType: type,
      targetType
    });

    return this.taskOrchestrator.getTask(taskId);
  }

  async saveDocument(name, content) {
    const filePath = path.join(this.options.docsDir, name);
    await fs.writeFile(filePath, content);
    this.documents.set(name, content);
    logger.info('Document saved', { name });
  }

  getDocument(name) {
    return this.documents.get(name);
  }

  getTemplate(name) {
    return this.templates.get(name);
  }

  getMetrics() {
    return {
      totalDocuments: this.documents.size,
      totalTemplates: this.templates.size,
      cacheSize: this.cache.size,
      ...this.taskOrchestrator.getMetrics()
    };
  }

  async cleanup() {
    logger.info('Cleaning up DocumentationOrchestrator');
    
    await this.taskOrchestrator.cleanup();
    await this.logger.cleanup();
    await this.debugger.cleanup();
    this.removeAllListeners();
    this.documents.clear();
    this.templates.clear();
    this.validationResults.clear();
  }
}

module.exports = DocumentationOrchestrator; 