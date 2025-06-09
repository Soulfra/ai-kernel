const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

const RULES_PATH = path.join(process.cwd(), '.cursorrules.json');
const rules = JSON.parse(fs.readFileSync(RULES_PATH, 'utf8'));

class DependencyReporter {
  constructor(options = {}) {
    this.requiredFields = rules.requiredDocFields || ['title', 'description', 'lastUpdated', 'version'];
    this.options = {
      outputDir: path.join(process.cwd(), 'project_meta', 'reports'),
      reportName: 'dependency-report',
      format: 'json',
      ...options
    };
  }

  async ensureOutputDir() {
    try {
      await mkdir(this.options.outputDir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  async generateJsonReport(dependencyGraph) {
    const report = {
      metadata: {
        generatedAt: new Date().toISOString(),
        totalFiles: Object.keys(dependencyGraph).length,
        reportVersion: '1.0.0'
      },
      files: dependencyGraph,
      statistics: {
        totalDependencies: 0,
        totalDependents: 0,
        totalLinks: 0,
        filesWithDependencies: 0,
        filesWithDependents: 0,
        filesWithLinks: 0,
        circularDependencies: []
      }
    };

    // Calculate statistics
    for (const [filePath, info] of Object.entries(dependencyGraph)) {
      if (info.dependencies && info.dependencies.length > 0) {
        report.statistics.filesWithDependencies++;
        report.statistics.totalDependencies += info.dependencies.length;
      }
      if (info.dependents && info.dependents.length > 0) {
        report.statistics.filesWithDependents++;
        report.statistics.totalDependents += info.dependents.length;
      }
      if (info.linksTo && info.linksTo.length > 0) {
        report.statistics.filesWithLinks++;
        report.statistics.totalLinks += info.linksTo.length;
      }
    }

    // Detect circular dependencies
    report.statistics.circularDependencies = this.detectCircularDependencies(dependencyGraph);

    return report;
  }

  detectCircularDependencies(graph) {
    const circularDeps = [];
    const visited = new Set();
    const recursionStack = new Set();

    const dfs = (filePath) => {
      if (!graph[filePath] || !graph[filePath].dependencies) {
        return false;
      }

      visited.add(filePath);
      recursionStack.add(filePath);

      for (const dep of graph[filePath].dependencies) {
        if (!visited.has(dep)) {
          if (dfs(dep)) {
            return true;
          }
        } else if (recursionStack.has(dep)) {
          circularDeps.push({
            cycle: Array.from(recursionStack).slice(recursionStack.has(dep)),
            files: [filePath, dep]
          });
          return true;
        }
      }

      recursionStack.delete(filePath);
      return false;
    };

    for (const filePath of Object.keys(graph)) {
      if (!visited.has(filePath)) {
        dfs(filePath);
      }
    }

    return circularDeps;
  }

  async generateMarkdownReport(dependencyGraph) {
    const report = await this.generateJsonReport(dependencyGraph);
    let markdown = `# Dependency Analysis Report\n\n`;
    markdown += `Generated at: ${report.metadata.generatedAt}\n\n`;

    // Summary
    markdown += `## Summary\n\n`;
    markdown += `- Total Files: ${report.metadata.totalFiles}\n`;
    markdown += `- Files with Dependencies: ${report.statistics.filesWithDependencies}\n`;
    markdown += `- Files with Dependents: ${report.statistics.filesWithDependents}\n`;
    markdown += `- Files with Links: ${report.statistics.filesWithLinks}\n`;
    markdown += `- Total Dependencies: ${report.statistics.totalDependencies}\n`;
    markdown += `- Total Dependents: ${report.statistics.totalDependents}\n`;
    markdown += `- Total Links: ${report.statistics.totalLinks}\n\n`;

    // Circular Dependencies
    if (report.statistics.circularDependencies.length > 0) {
      markdown += `## Circular Dependencies\n\n`;
      for (const cycle of report.statistics.circularDependencies) {
        markdown += `### Cycle ${cycle.files.join(' → ')}\n\n`;
        markdown += `Files involved:\n`;
        for (const file of cycle.cycle) {
          markdown += `- ${file}\n`;
        }
        markdown += '\n';
      }
    }

    // File Details
    markdown += `## File Details\n\n`;
    for (const [filePath, info] of Object.entries(report.files)) {
      markdown += `### ${filePath}\n\n`;
      
      if (info.dependencies && info.dependencies.length > 0) {
        markdown += `#### Dependencies\n`;
        for (const dep of info.dependencies) {
          markdown += `- ${dep}\n`;
        }
        markdown += '\n';
      }

      if (info.dependents && info.dependents.length > 0) {
        markdown += `#### Dependents\n`;
        for (const dep of info.dependents) {
          markdown += `- ${dep}\n`;
        }
        markdown += '\n';
      }

      if (info.linksTo && info.linksTo.length > 0) {
        markdown += `#### Links To\n`;
        for (const link of info.linksTo) {
          markdown += `- ${link}\n`;
        }
        markdown += '\n';
      }

      if (info.linkedBy && info.linkedBy.length > 0) {
        markdown += `#### Linked By\n`;
        for (const link of info.linkedBy) {
          markdown += `- ${link}\n`;
        }
        markdown += '\n';
      }
    }

    return markdown;
  }

  async saveReport(dependencyGraph) {
    await this.ensureOutputDir();

    const timestamp = new Date().toISOString().split('T')[0];
    const baseFileName = `${this.options.reportName}-${timestamp}`;

    if (this.options.format === 'json' || this.options.format === 'both') {
      const jsonReport = await this.generateJsonReport(dependencyGraph);
      const jsonPath = path.join(this.options.outputDir, `${baseFileName}.json`);
      await writeFile(jsonPath, JSON.stringify(jsonReport, null, 2));
    }

    if (this.options.format === 'markdown' || this.options.format === 'both') {
      const markdownReport = await this.generateMarkdownReport(dependencyGraph);
      const mdPath = path.join(this.options.outputDir, `${baseFileName}.md`);
      await writeFile(mdPath, markdownReport);
    }
  }
}

module.exports = DependencyReporter; 