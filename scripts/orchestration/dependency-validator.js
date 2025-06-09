// @agent: diagnostics
// @orchestrator: recovery
// @origin: legacy-rescue
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const access = promisify(fs.access);
const stat = promisify(fs.stat);

class DependencyValidator {
  constructor(options = {}) {
    this.options = {
      rootDir: process.cwd(),
      validateLinks: true,
      validateDependencies: true,
      validateCircular: true,
      ...options
    };
  }

  async validateDependencyGraph(graph) {
    const validationResults = {
      timestamp: new Date().toISOString(),
      totalFiles: Object.keys(graph).length,
      validFiles: 0,
      invalidFiles: 0,
      issues: {
        missingDependencies: [],
        missingLinks: [],
        circularDependencies: [],
        invalidPaths: []
      }
    };

    for (const [filePath, info] of Object.entries(graph)) {
      const fileValidation = await this.validateFile(filePath, info, graph);
      
      if (fileValidation.isValid) {
        validationResults.validFiles++;
      } else {
        validationResults.invalidFiles++;
        Object.entries(fileValidation.issues).forEach(([issueType, issues]) => {
          validationResults.issues[issueType].push(...issues);
        });
      }
    }

    return validationResults;
  }

  async validateFile(filePath, fileInfo, graph) {
    const validation = {
      filePath,
      isValid: true,
      issues: {
        missingDependencies: [],
        missingLinks: [],
        circularDependencies: [],
        invalidPaths: []
      }
    };

    // Validate file exists
    try {
      await access(filePath, fs.constants.F_OK);
    } catch (error) {
      validation.isValid = false;
      validation.issues.invalidPaths.push({
        path: filePath,
        error: 'File does not exist'
      });
      return validation;
    }

    // Validate dependencies
    if (this.options.validateDependencies) {
      for (const dep of fileInfo.dependencies) {
        const resolvedPath = this.resolveDependencyPath(filePath, dep);
        if (!resolvedPath || !(await this.pathExists(resolvedPath))) {
          validation.isValid = false;
          validation.issues.missingDependencies.push({
            file: filePath,
            dependency: dep,
            resolvedPath
          });
        }
      }
    }

    // Validate links
    if (this.options.validateLinks) {
      for (const link of fileInfo.linksTo) {
        const resolvedPath = this.resolveLinkPath(filePath, link);
        if (!resolvedPath || !(await this.pathExists(resolvedPath))) {
          validation.isValid = false;
          validation.issues.missingLinks.push({
            file: filePath,
            link,
            resolvedPath
          });
        }
      }
    }

    // Validate circular dependencies
    if (this.options.validateCircular) {
      const circularDeps = this.detectCircularDependenciesForFile(filePath, fileInfo, graph);
      if (circularDeps.length > 0) {
        validation.isValid = false;
        validation.issues.circularDependencies.push(...circularDeps);
      }
    }

    return validation;
  }

  async pathExists(path) {
    try {
      await access(path, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
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

  detectCircularDependenciesForFile(filePath, fileInfo, graph) {
    const circularDeps = [];
    const visited = new Set();
    const recursionStack = new Set();

    const dfs = (currentPath) => {
      visited.add(currentPath);
      recursionStack.add(currentPath);

      const currentInfo = graph[currentPath];
      for (const dep of currentInfo.dependencies) {
        const resolvedPath = this.resolveDependencyPath(currentPath, dep);
        if (!resolvedPath || !graph[resolvedPath]) continue;

        if (!visited.has(resolvedPath)) {
          if (dfs(resolvedPath)) {
            return true;
          }
        } else if (recursionStack.has(resolvedPath)) {
          circularDeps.push({
            cycle: Array.from(recursionStack).slice(recursionStack.has(resolvedPath)),
            files: [currentPath, resolvedPath]
          });
          return true;
        }
      }

      recursionStack.delete(currentPath);
      return false;
    };

    dfs(filePath);
    return circularDeps;
  }

  async generateValidationReport(validationResults) {
    const report = {
      timestamp: validationResults.timestamp,
      summary: {
        totalFiles: validationResults.totalFiles,
        validFiles: validationResults.validFiles,
        invalidFiles: validationResults.invalidFiles,
        totalIssues: Object.values(validationResults.issues).reduce(
          (sum, issues) => sum + issues.length,
          0
        )
      },
      issues: validationResults.issues,
      recommendations: this.generateRecommendations(validationResults)
    };

    return report;
  }

  generateRecommendations(validationResults) {
    const recommendations = [];

    // Missing dependencies recommendations
    if (validationResults.issues.missingDependencies.length > 0) {
      recommendations.push({
        type: 'missing_dependencies',
        description: 'Fix missing dependencies',
        actions: [
          'Check if dependencies are installed',
          'Verify import paths',
          'Update package.json if needed'
        ]
      });
    }

    // Missing links recommendations
    if (validationResults.issues.missingLinks.length > 0) {
      recommendations.push({
        type: 'missing_links',
        description: 'Fix broken links',
        actions: [
          'Update link paths',
          'Create missing files',
          'Remove broken links'
        ]
      });
    }

    // Circular dependencies recommendations
    if (validationResults.issues.circularDependencies.length > 0) {
      recommendations.push({
        type: 'circular_dependencies',
        description: 'Resolve circular dependencies',
        actions: [
          'Refactor code to break circular dependencies',
          'Consider using dependency injection',
          'Move shared code to a common module'
        ]
      });
    }

    // Invalid paths recommendations
    if (validationResults.issues.invalidPaths.length > 0) {
      recommendations.push({
        type: 'invalid_paths',
        description: 'Fix invalid file paths',
        actions: [
          'Check file paths for typos',
          'Ensure files exist in the correct location',
          'Update references to moved files'
        ]
      });
    }

    return recommendations;
  }
}

module.exports = DependencyValidator; 
