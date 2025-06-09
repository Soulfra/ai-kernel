// @agent: diagnostics
// @orchestrator: recovery
// @origin: legacy-rescue
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

class DependencyAnalyzer {
  constructor(options = {}) {
    this.options = {
      rootDir: process.cwd(),
      excludePatterns: options.excludePatterns || [
        'node_modules',
        '.git',
        'dist',
        'build'
      ],
      fileExtensions: options.fileExtensions || ['.js', '.md', '.json'],
      maxDepth: options.maxDepth || 10,
      ...options
    };
  }

  async analyzeFile(filePath) {
    try {
      const content = await readFile(filePath, 'utf8');
      const fileInfo = {
        path: filePath,
        dependencies: [],
        dependents: [],
        linksTo: [],
        linkedBy: []
      };

      // Analyze JavaScript dependencies
      if (filePath.endsWith('.js')) {
        fileInfo.dependencies = this.extractJsDependencies(content);
      }

      // Analyze Markdown links
      if (filePath.endsWith('.md')) {
        fileInfo.linksTo = this.extractMarkdownLinks(content);
      }

      return fileInfo;
    } catch (error) {
      console.error(`Error analyzing file ${filePath}:`, error);
      return null;
    }
  }

  extractJsDependencies(content) {
    const dependencies = [];
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
    const importRegex = /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;

    let match;
    while ((match = requireRegex.exec(content)) !== null) {
      dependencies.push(match[1]);
    }
    while ((match = importRegex.exec(content)) !== null) {
      dependencies.push(match[1]);
    }

    return dependencies;
  }

  extractMarkdownLinks(content) {
    const links = [];
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const urlRegex = /(https?:\/\/[^\s)]+)/g;

    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      links.push(match[2]);
    }
    while ((match = urlRegex.exec(content)) !== null) {
      links.push(match[1]);
    }

    return links;
  }

  async analyzeDirectory(dirPath, depth = 0) {
    if (depth > this.options.maxDepth) {
      return [];
    }

    const results = [];
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      // Skip excluded patterns
      if (this.options.excludePatterns.some(pattern => 
        entry.name.includes(pattern) || fullPath.includes(pattern)
      )) {
        continue;
      }

      if (entry.isDirectory()) {
        const subResults = await this.analyzeDirectory(fullPath, depth + 1);
        results.push(...subResults);
      } else if (this.options.fileExtensions.some(ext => entry.name.endsWith(ext))) {
        const fileInfo = await this.analyzeFile(fullPath);
        if (fileInfo) {
          results.push(fileInfo);
        }
      }
    }

    return results;
  }

  async buildDependencyGraph() {
    const files = await this.analyzeDirectory(this.options.rootDir);
    const graph = {};

    // Build initial graph
    for (const file of files) {
      graph[file.path] = {
        dependencies: file.dependencies,
        dependents: [],
        linksTo: file.linksTo,
        linkedBy: []
      };
    }

    // Resolve dependencies and build dependents
    for (const [filePath, info] of Object.entries(graph)) {
      for (const dep of info.dependencies) {
        const resolvedPath = this.resolveDependencyPath(filePath, dep);
        if (resolvedPath && graph[resolvedPath]) {
          graph[resolvedPath].dependents.push(filePath);
        }
      }

      for (const link of info.linksTo) {
        const resolvedPath = this.resolveLinkPath(filePath, link);
        if (resolvedPath && graph[resolvedPath]) {
          graph[resolvedPath].linkedBy.push(filePath);
        }
      }
    }

    return graph;
  }

  resolveDependencyPath(filePath, dependency) {
    // Handle relative paths
    if (dependency.startsWith('./') || dependency.startsWith('../')) {
      return path.resolve(path.dirname(filePath), dependency);
    }

    // Handle node_modules
    if (!dependency.startsWith('.') && !dependency.startsWith('/')) {
      return path.join(this.options.rootDir, 'node_modules', dependency);
    }

    return null;
  }

  resolveLinkPath(filePath, link) {
    // Handle relative paths
    if (link.startsWith('./') || link.startsWith('../')) {
      return path.resolve(path.dirname(filePath), link);
    }

    // Handle absolute paths
    if (link.startsWith('/')) {
      return path.join(this.options.rootDir, link);
    }

    return null;
  }

  async generateReport() {
    const graph = await this.buildDependencyGraph();
    const report = {
      timestamp: new Date().toISOString(),
      totalFiles: Object.keys(graph).length,
      files: graph,
      statistics: {
        totalDependencies: 0,
        totalDependents: 0,
        totalLinks: 0,
        filesWithDependencies: 0,
        filesWithDependents: 0,
        filesWithLinks: 0
      }
    };

    // Calculate statistics
    for (const info of Object.values(graph)) {
      if (info.dependencies.length > 0) {
        report.statistics.filesWithDependencies++;
        report.statistics.totalDependencies += info.dependencies.length;
      }
      if (info.dependents.length > 0) {
        report.statistics.filesWithDependents++;
        report.statistics.totalDependents += info.dependents.length;
      }
      if (info.linksTo.length > 0) {
        report.statistics.filesWithLinks++;
        report.statistics.totalLinks += info.linksTo.length;
      }
    }

    return report;
  }
}

module.exports = DependencyAnalyzer; 
