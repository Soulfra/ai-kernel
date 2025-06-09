const path = require('path');
const fs = require('fs').promises;
const { EventEmitter } = require('events');

class DocumentationConsolidator extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      docsRoot: options.docsRoot || 'docs',
      scriptsRoot: options.scriptsRoot || 'scripts',
      logDir: options.logDir || 'logs/consolidation',
      ...options
    };
    this.orchestrators = new Map();
    this.analysis = {
      orchestrators: [],
      dependencies: new Map(),
      uniqueFeatures: new Set(),
      issues: []
    };
  }

  async initialize() {
    await fs.mkdir(this.options.logDir, { recursive: true });
    this.emit('initialized');
  }

  async analyzeOrchestrators() {
    const orchestratorPaths = [
      'scripts/core/documentation-orchestrator.js',
      'scripts/unified-migration/core/document-processor.js',
      'scripts/generation/orchestration/document-orchestrator.js',
      'scripts/unified-migration/orchestrator.js'
    ];

    for (const orchestratorPath of orchestratorPaths) {
      try {
        const content = await fs.readFile(orchestratorPath, 'utf8');
        const analysis = this.analyzeFile(content, orchestratorPath);
        this.analysis.orchestrators.push(analysis);
        this.emit('orchestrator:analyzed', { path: orchestratorPath, analysis });
      } catch (error) {
        this.analysis.issues.push({
          path: orchestratorPath,
          error: error.message
        });
        this.emit('error', { path: orchestratorPath, error });
      }
    }

    return this.analysis;
  }

  analyzeFile(content, filePath) {
    const analysis = {
      path: filePath,
      size: content.length,
      imports: this.extractImports(content),
      exports: this.extractExports(content),
      methods: this.extractMethods(content),
      dependencies: this.extractDependencies(content),
      uniqueFeatures: this.extractUniqueFeatures(content)
    };

    return analysis;
  }

  extractImports(content) {
    const imports = [];
    const importRegex = /require\(['"]([^'"]+)['"]\)/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    return imports;
  }

  extractExports(content) {
    const exports = [];
    const exportRegex = /module\.exports\s*=\s*{([^}]+)}/g;
    let match;
    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(...match[1].split(',').map(e => e.trim()));
    }
    return exports;
  }

  extractMethods(content) {
    const methods = [];
    const methodRegex = /async\s+(\w+)\s*\(/g;
    let match;
    while ((match = methodRegex.exec(content)) !== null) {
      methods.push(match[1]);
    }
    return methods;
  }

  extractDependencies(content) {
    const dependencies = new Set();
    const depRegex = /this\.(\w+)/g;
    let match;
    while ((match = depRegex.exec(content)) !== null) {
      dependencies.add(match[1]);
    }
    return Array.from(dependencies);
  }

  extractUniqueFeatures(content) {
    const features = new Set();
    // Add patterns to identify unique features
    if (content.includes('validateDocumentation')) features.add('validation');
    if (content.includes('generateDocumentation')) features.add('generation');
    if (content.includes('processDocumentation')) features.add('processing');
    return Array.from(features);
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      analysis: this.analysis,
      recommendations: this.generateRecommendations()
    };

    const reportPath = path.join(
      this.options.logDir,
      `consolidation-report-${Date.now()}.json`
    );
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    return report;
  }

  generateRecommendations() {
    const recommendations = {
      keep: [],
      archive: [],
      merge: [],
      refactor: []
    };

    for (const orchestrator of this.analysis.orchestrators) {
      if (orchestrator.path.includes('core/documentation-orchestrator.js')) {
        recommendations.keep.push({
          path: orchestrator.path,
          reason: 'Current main orchestrator'
        });
      } else if (orchestrator.uniqueFeatures.length > 0) {
        recommendations.merge.push({
          path: orchestrator.path,
          features: orchestrator.uniqueFeatures
        });
      } else {
        recommendations.archive.push({
          path: orchestrator.path,
          reason: 'No unique features'
        });
      }
    }

    return recommendations;
  }
}

// Main execution
async function main() {
  const consolidator = new DocumentationConsolidator();
  
  consolidator.on('initialized', () => {
    console.log('Documentation Consolidator initialized');
  });

  consolidator.on('orchestrator:analyzed', ({ path, analysis }) => {
    console.log(`Analyzed orchestrator: ${path}`);
  });

  consolidator.on('error', ({ path, error }) => {
    console.error(`Error analyzing ${path}:`, error);
  });

  try {
    await consolidator.initialize();
    const analysis = await consolidator.analyzeOrchestrators();
    const report = await consolidator.generateReport();
    
    console.log('\nConsolidation Report:');
    console.log('===================');
    console.log(`Total orchestrators analyzed: ${analysis.orchestrators.length}`);
    console.log(`Issues found: ${analysis.issues.length}`);
    console.log('\nRecommendations:');
    console.log(JSON.stringify(report.recommendations, null, 2));
  } catch (error) {
    console.error('Error during consolidation:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = DocumentationConsolidator; 