const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

const RULES_PATH = path.join(process.cwd(), '.cursorrules.json');
const rules = JSON.parse(fs.readFileSync(RULES_PATH, 'utf8'));

// Regex patterns for parsing
const requireRegex = /require\((['"`])(.*?)\1\)/g;
const importRegex = /import(?:(?:\s*\{\s*[^}]*\s*\})|(?:\s*\*\s*as\s*\w+))?\s*from\s*(['"`])(.*?)\1;/g;
const mdLinkRegex = /\[([^\]]+)\]\(([^)]+?\.md)\)/g;

class DependencyAnalyzer {
  constructor(options = {}) {
    this.options = {
      rootDir: process.cwd(),
      ignoreDirs: ['node_modules', '.git', 'backups', 'CLARITY_ENGINE_DOCS'], // Added CLARITY_ENGINE_DOCS to ignore for self-references
      reportPath: path.join(process.cwd(), 'dependency-report.json'),
      chunkSize: 50, // Process files in chunks to manage memory
      ...options,
    };
    this.fileList = [];
    this.dependencyMap = new Map(); // Stores comprehensive details for each file
  }

  async analyze() {
    console.log('Deeply analyzing file dependencies...');
    this.fileList = await this.getAllFiles(this.options.rootDir);
    console.log(`Found ${this.fileList.length} files to analyze.`);

    // Initialize map entries for all files
    for (const filePath of this.fileList) {
      this.dependencyMap.set(filePath, {
        filePath,
        dependencies: new Set(),
        dependents: new Set(),
        linksTo: new Set(),
        linkedBy: new Set(),
        contentHash: '' // Placeholder for potential future use
      });
    }

    // Process files in chunks
    for (let i = 0; i < this.fileList.length; i += this.options.chunkSize) {
      const chunk = this.fileList.slice(i, i + this.options.chunkSize);
      console.log(`Analyzing chunk ${Math.floor(i / this.options.chunkSize) + 1} of ${Math.ceil(this.fileList.length / this.options.chunkSize)} (${chunk.length} files)`);
      await Promise.all(chunk.map(filePath => this.analyzeFile(filePath)));
    }

    const report = this.generateReport();
    await fs.writeFile(this.options.reportPath, JSON.stringify(report, null, 2));
    console.log(`Comprehensive dependency report saved to: ${this.options.reportPath}`);
    return report;
  }

  async analyzeFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const fileData = this.dependencyMap.get(filePath);

      // Analyze JS/TS dependencies
      if (filePath.endsWith('.js') || filePath.endsWith('.ts')) {
        this.parseCodeDependencies(filePath, content, fileData);
      }

      // Analyze Markdown links
      if (filePath.endsWith('.md')) {
        this.parseMarkdownLinks(filePath, content, fileData);
      }

    } catch (error) {
      console.warn(`Could not analyze file ${filePath}: ${error.message}`);
      // Ensure fileData exists if map was populated
      const fileData = this.dependencyMap.get(filePath) || {}; 
      fileData.error = error.message;
    }
  }

  parseCodeDependencies(filePath, content, fileData) {
    const currentDir = path.dirname(filePath);
    let match;

    // Parse require()
    while ((match = requireRegex.exec(content)) !== null) {
      this.addDependency(filePath, match[2], currentDir, fileData.dependencies, 'dependency');
    }
    // Parse import from ''
    while ((match = importRegex.exec(content)) !== null) {
      this.addDependency(filePath, match[2], currentDir, fileData.dependencies, 'dependency');
    }
  }

  parseMarkdownLinks(filePath, content, fileData) {
    const currentDir = path.dirname(filePath);
    let match;
    while ((match = mdLinkRegex.exec(content)) !== null) {
      this.addDependency(filePath, match[2], currentDir, fileData.linksTo, 'link');
    }
  }

  addDependency(sourcePath, targetSpecifier, currentDir, sourceSet, type) {
    if (targetSpecifier.startsWith('.')) { // Relative path
      const targetPath = path.resolve(currentDir, targetSpecifier);
      if (this.dependencyMap.has(targetPath)) {
        sourceSet.add(targetPath);
        const targetData = this.dependencyMap.get(targetPath);
        if (type === 'dependency') {
          targetData.dependents.add(sourcePath);
        } else if (type === 'link') {
          targetData.linkedBy.add(sourcePath);
        }
      }
    }
    // Could add handling for module (node_modules) or absolute paths if needed
  }

  generateReport() {
    const filesReport = [];
    for (const [filePath, data] of this.dependencyMap.entries()) {
      filesReport.push({
        filePath: path.relative(this.options.rootDir, filePath), // Make paths relative for readability
        dependencies: Array.from(data.dependencies).map(p => path.relative(this.options.rootDir, p)),
        dependents: Array.from(data.dependents).map(p => path.relative(this.options.rootDir, p)),
        linksTo: Array.from(data.linksTo).map(p => path.relative(this.options.rootDir, p)),
        linkedBy: Array.from(data.linkedBy).map(p => path.relative(this.options.rootDir, p)),
        error: data.error || null
      });
    }
    
    // Basic conflict detection (can be expanded)
    const conflicts = []; 
    filesReport.forEach(file => {
        file.dependencies.forEach(dep => {
            const depFile = filesReport.find(f => f.filePath === dep);
            if (depFile && depFile.dependencies.includes(file.filePath)) {
                if (!conflicts.some(c => (c.files.includes(file.filePath) && c.files.includes(dep)))){
                    conflicts.push({type: 'circular_dependency', files: [file.filePath, dep]});
                }
            }
        });
    });

    return {
      reportTimestamp: new Date().toISOString(),
      totalFilesAnalyzed: this.fileList.length,
      files: filesReport,
      conflicts,
      // Recommendations can be generated based on conflicts or other patterns
      recommendations: conflicts.length > 0 ? ['Review circular dependencies.'] : [] 
    };
  }

  async getAllFiles(dir) {
    const results = [];
    const stack = [path.resolve(dir)]; // Start with the absolute root directory
    const processedDirs = new Set(); // To avoid issues with symlinks causing loops

    while (stack.length > 0) {
      const currentDir = stack.pop();

      if (processedDirs.has(currentDir)) {
        continue;
      }
      processedDirs.add(currentDir);

      let list;
      try {
        list = await fs.readdir(currentDir, { withFileTypes: true });
      } catch (error) {
        console.warn(`Could not read directory ${currentDir}: ${error.message}`);
        continue; // Skip this directory if not readable
      }

      for (const dirent of list) {
        if (this.options.ignoreDirs.includes(dirent.name)) {
          continue;
        }
        const fullPath = path.resolve(currentDir, dirent.name);
        if (dirent.isDirectory()) {
          // Check if the full path of the directory is in ignoreDirs (more robust)
          // This requires ignoreDirs to potentially contain relative paths from root like 'src/ignore'
          // For now, sticking to dirent.name for simplicity as per original logic.
          // If more complex ignore patterns are needed, this check can be enhanced.
          stack.push(fullPath);
        } else {
          results.push(fullPath);
        }
      }
    }
    return results;
  }
}

// If run directly for testing
if (require.main === module) {
  console.log('Running DependencyAnalyzer directly...');
  const analyzer = new DependencyAnalyzer({
    rootDir: process.cwd(), // Or specify a different root for testing
    // Example: ignoreDirs: ['node_modules', '.git', 'backups', 'some_other_dir']
  });
  analyzer.analyze()
    .then(() => console.log('Direct analysis complete.'))
    .catch(err => console.error('Direct analysis failed:', err));
}

module.exports = { DependencyAnalyzer }; // Export class for use by other modules 