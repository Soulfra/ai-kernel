const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const RULES_PATH = path.join(process.cwd(), '.cursorrules.json');
const rules = JSON.parse(fs.readFileSync(RULES_PATH, 'utf8'));

class DocumentationManager {
  constructor(rootDir) {
    this.rootDir = rootDir;
    this.taskLogPath = path.join(rootDir, 'project_meta/task_logs/documentation_tasks.json');
    this.debugLogPath = path.join(rootDir, 'project_meta/logs/validation_debug.log');
    this.versionPath = path.join(rootDir, 'project_meta/versioning/documentation_versions.json');
    this.archiveDir = path.join(rootDir, 'project_meta/archives');
    this.standards = {
      maxLineCount: rules.maxFileLines || 250,
      requiredFields: rules.requiredDocFields || ['title', 'description', 'lastUpdated', 'version'],
      requiredSections: ['Overview', 'Implementation', 'Maintenance'],
    };
  }

  async runValidation(mode = 'dry-run') {
    console.log(`Running validation in ${mode} mode...`);
    
    // Run validation
    const validationResult = await this.executeValidation(mode);
    
    // Update task log
    await this.updateTaskLog(validationResult);
    
    // Update debug log
    await this.updateDebugLog(validationResult);
    
    // If validation passed, create new version
    if (validationResult.passed === validationResult.totalFiles) {
      await this.createNewVersion(validationResult);
    }
    
    return validationResult;
  }

  async executeValidation(mode) {
    // Execute validation script
    const result = execSync(`npm run validate-docs ${mode === 'live' ? '-- --live' : ''}`).toString();
    return JSON.parse(result);
  }

  async updateTaskLog(validationResult) {
    const taskLog = JSON.parse(fs.readFileSync(this.taskLogPath, 'utf8'));
    
    const newTask = {
      taskId: `doc_${Date.now()}`,
      description: `Documentation validation ${validationResult.mode}`,
      status: validationResult.passed === validationResult.totalFiles ? 'completed' : 'failed',
      priority: 'high',
      createdDate: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      type: 'validation',
      details: validationResult
    };
    
    taskLog.tasks.push(newTask);
    fs.writeFileSync(this.taskLogPath, JSON.stringify(taskLog, null, 2));
  }

  async updateDebugLog(validationResult) {
    const debugLog = `\n## Run ${new Date().toISOString()}
- Mode: ${validationResult.mode}
- Total Files: ${validationResult.totalFiles}
- Passed: ${validationResult.passed}
- Failed: ${validationResult.failed}
- Issues:
  * Missing Fields: ${validationResult.issues.missingFields}
  * Broken Links: ${validationResult.issues.brokenLinks}
  * Circular Dependencies: ${validationResult.issues.circularDeps}
  * Line Count: ${validationResult.issues.lineCount}

### File Details
${validationResult.files.map(file => this.formatFileDetails(file)).join('\n')}

### Validation Steps
${validationResult.steps.join('\n')}

### Next Steps
${validationResult.nextSteps.join('\n')}

---\n`;

    fs.appendFileSync(this.debugLogPath, debugLog);
  }

  async createNewVersion(validationResult) {
    const versionLog = JSON.parse(fs.readFileSync(this.versionPath, 'utf8'));
    const newVersion = this.calculateNextVersion(versionLog.currentVersion);
    
    // Create archive
    const archivePath = await this.createArchive(newVersion);
    const hash = await this.calculateHash(archivePath);
    
    const versionEntry = {
      version: newVersion,
      timestamp: new Date().toISOString(),
      type: 'update',
      description: 'Documentation validation passed',
      changes: validationResult.changes || [],
      validationStatus: {
        totalFiles: validationResult.totalFiles,
        passed: validationResult.passed,
        failed: validationResult.failed
      },
      archivePath,
      hash,
      dependencies: []
    };
    
    versionLog.versions.push(versionEntry);
    versionLog.currentVersion = newVersion;
    versionLog.archives.push({
      version: newVersion,
      timestamp: new Date().toISOString(),
      path: archivePath,
      size: this.getFileSize(archivePath),
      hash,
      contents: this.getArchiveContents()
    });
    
    fs.writeFileSync(this.versionPath, JSON.stringify(versionLog, null, 2));
  }

  calculateNextVersion(currentVersion) {
    const [major, minor, patch] = currentVersion.split('.').map(Number);
    return `${major}.${minor}.${patch + 1}`;
  }

  async createArchive(version) {
    const archivePath = path.join(this.archiveDir, `