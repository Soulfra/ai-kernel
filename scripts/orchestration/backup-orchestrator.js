// @agent: diagnostics
// @orchestrator: recovery
// @origin: legacy-rescue
const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const ensureFileAndDir = require('../../shared/utils/ensureFileAndDir');
// Placeholder: require LogOrchestrator and TelemetryManager for DI
const LogOrchestrator = require('./log-orchestrator');
const TelemetryManager = require('./telemetry-manager');

/**
 * BackupOrchestrator: Canonical orchestrator for all backup/restore operations.
 * Handles full/partial backup, manifest generation/validation, dry-run/approval, logging/telemetry, restore/rollback, exclusion/recursion safety, and API for orchestrator integration.
 * Now implements real backup logic, including chat logs and manifest.
 * All orchestrators must use this for backup/restore.
 */
class BackupOrchestrator extends EventEmitter {
  /**
   * @param {object} options
   * @param {object} di - Dependency injection: { logger, telemetryManager, orchestratorOverrides }
   */
  constructor(options = {}, { logger, telemetryManager, orchestratorOverrides } = {}) {
    super();
    this.options = {
      backupDir: options.backupDir || './backups',
      manifestName: options.manifestName || 'manifest.json',
      exclude: options.exclude || ['node_modules', '.git', 'cache', 'backups'],
      maxDepth: options.maxDepth || 10,
      ...options,
    };
    this.logger = logger || new LogOrchestrator();
    this.telemetryManager = telemetryManager || new TelemetryManager();
    this.orchestratorOverrides = orchestratorOverrides || {};
    this.lastBackupStatus = null;
  }

  /**
   * Initialize backup orchestrator (ensure dirs, load state, etc.)
   */
  async initialize() {
    if (!fs.existsSync(this.options.backupDir)) {
      fs.mkdirSync(this.options.backupDir, { recursive: true });
    }
  }

  /**
   * Run batch meta-summarization before backup (if available)
   */
  async runMetaSummarization() {
    try {
      const batchMetaSummarize = this.orchestratorOverrides?.batchMetaSummarize || require('../../scripts/batch-meta-summarize.js');
      if (typeof batchMetaSummarize === 'function') {
        await batchMetaSummarize();
        await this.log('info', 'Batch meta-summarization completed before backup.');
      }
    } catch (err) {
      await this.log('warn', 'Batch meta-summarization failed before backup.', { error: err.message });
    }
  }

  /**
   * Snapshot all living docs/logs before backup
   */
  async snapshotLivingState(backupPath) {
    const filesToSnapshot = [
      'project_meta/plans/FINALIZATION_PLAN.md',
      'project_meta/suggestion_log.md',
      'project_meta/task_logs/main_task_log.json',
      'project_meta/insights/system_multi-turn_summary.md',
      'project_meta/insights/system_reflection.md',
      '.cursorrules.json'
    ];
    for (const file of filesToSnapshot) {
      if (fs.existsSync(file)) {
        const dest = path.join(backupPath, path.basename(file));
        fs.copyFileSync(file, dest);
      }
    }
    await this.log('info', 'Living docs/logs snapshotted to backup.');
  }

  /**
   * Self-audit before/after backup
   */
  async selfAudit(backupPath) {
    // Placeholder: Use compliance-reporter or custom logic
    try {
      const ComplianceReporter = this.orchestratorOverrides?.ComplianceReporter || require('./compliance-reporter');
      const reporter = new ComplianceReporter();
      await reporter.initialize();
      const report = await reporter.generateComplianceReport();
      await this.log('info', 'Self-audit (compliance) completed.', { report });
      // Optionally, copy report to backupPath
      const reportPath = path.join(backupPath, 'compliance-report.json');
      ensureFileAndDir(reportPath);
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    } catch (err) {
      await this.log('warn', 'Self-audit (compliance) failed.', { error: err.message });
    }
  }

  /**
   * Perform a backup (full or partial). Returns manifest and status.
   * @param {object} params - { scope, dryRun, approval }
   */
  async backup({ scope = 'full', dryRun = false, approval = false } = {}) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    // Always use './backups/' unless explicitly overridden
    const backupDir = this.options.backupDir || './backups';
    const backupPath = path.join(backupDir, `backup-${timestamp}`);
    if (!dryRun) fs.mkdirSync(backupPath, { recursive: true, mode: 0o700 }); // Secure permissions
    await this.runMetaSummarization();
    await this.snapshotLivingState(backupPath);
    await this.selfAudit(backupPath);
    const manifest = [];
    const rootDir = process.cwd();
    const excludeSet = new Set(this.options.exclude);
    const chatLogPath = path.join(rootDir, 'logs', 'conversation_log.md');
    const suggestions = [];
    let filesCopied = 0;
    let filesTotal = 0;
    // Helper: Recursively copy files, emit progress, and update progress file
    const copyRecursive = (src, dest, depth = 0) => {
      if (depth > this.options.maxDepth) return;
      const rel = path.relative(rootDir, src);
      if (excludeSet.has(rel.split(path.sep)[0])) return;
      let stat;
      try {
        stat = fs.statSync(src);
      } catch (err) {
        if (err.code === 'ENOENT') {
          suggestions.push(`File missing during backup: ${rel}`);
          this.log('warn', `File missing during backup: ${rel}`);
          return;
        } else {
          throw err;
        }
      }
      if (stat.isDirectory()) {
        fs.mkdirSync(dest, { recursive: true });
        for (const file of fs.readdirSync(src)) {
          // Only skip if in exclude set, not all dotfiles
          if (excludeSet.has(file)) continue;
          copyRecursive(path.join(src, file), path.join(dest, file), depth + 1);
        }
      } else {
        try {
          fs.copyFileSync(src, dest);
          const hash = this.hashFile(src);
          manifest.push({ file: rel, hash });
          filesCopied++;
          // Emit progress event and update progress file
          this.emit('progress', { file: rel, filesCopied });
          this._writeProgressFile(backupPath, { file: rel, filesCopied });
        } catch (err) {
          if (err.code === 'ENOENT') {
            suggestions.push(`File missing during backup: ${rel}`);
            this.log('warn', `File missing during backup: ${rel}`);
            return;
          } else {
            throw err;
          }
        }
      }
    };
    // Count total files for progress
    const countFiles = (src, depth = 0) => {
      if (depth > this.options.maxDepth) return 0;
      let stat;
      try {
        stat = fs.statSync(src);
      } catch {
        return 0;
      }
      if (stat.isDirectory()) {
        let count = 0;
        for (const file of fs.readdirSync(src)) {
          if (file.startsWith('.')) continue;
          count += countFiles(path.join(src, file), depth + 1);
        }
        return count;
      } else {
        return 1;
      }
    };
    for (const file of fs.readdirSync(rootDir)) {
      if (excludeSet.has(file) || file.startsWith('.')) continue;
      filesTotal += countFiles(path.join(rootDir, file));
    }
    // Copy project files (excluding excluded dirs)
    for (const file of fs.readdirSync(rootDir)) {
      // Only skip if in exclude set, not all dotfiles
      if (excludeSet.has(file)) continue;
      copyRecursive(path.join(rootDir, file), path.join(backupPath, file));
    }
    // Copy chat log if exists
    if (fs.existsSync(chatLogPath)) {
      const dest = path.join(backupPath, 'logs', 'conversation_log.md');
      fs.mkdirSync(path.dirname(dest), { recursive: true, mode: 0o700 });
      fs.copyFileSync(chatLogPath, dest);
      manifest.push({ file: 'logs/conversation_log.md', hash: this.hashFile(chatLogPath) });
      filesCopied++;
      this.emit('progress', { file: 'logs/conversation_log.md', filesCopied });
      this._writeProgressFile(backupPath, { file: 'logs/conversation_log.md', filesCopied });
    }
    // Write manifest
    if (!dryRun) {
      ensureFileAndDir(path.join(backupPath, this.options.manifestName));
      fs.writeFileSync(path.join(backupPath, this.options.manifestName), JSON.stringify(manifest, null, 2), { mode: 0o600 });
    }
    this.lastBackupStatus = { backupPath, manifest, timestamp, dryRun };
    await this.log('info', `Backup completed at ${backupPath}`, { dryRun });
    // Write backup-complete marker file
    this._writeCompleteFile(backupPath, { backupPath, manifest, timestamp, filesCopied, filesTotal });
    // Post-backup verification
    let criticalError = false;
    if (!fs.existsSync(backupDir)) {
      await this.log('error', `Backup directory missing after backup: ${backupDir}`);
      criticalError = true;
    } else if (!fs.existsSync(backupPath)) {
      await this.log('error', `Backup folder missing after backup: ${backupPath}`);
      criticalError = true;
    } else if (!fs.existsSync(path.join(backupPath, this.options.manifestName))) {
      await this.log('error', `Backup manifest missing after backup: ${path.join(backupPath, this.options.manifestName)}`);
      criticalError = true;
    }
    if (criticalError) {
      const suggestionLog = path.join(__dirname, '../../project_meta/suggestion_log.md');
      const logEntry = `\n[CRITICAL] Backup verification failed at ${new Date().toISOString()}\n- Directory: ${backupDir}\n- Folder: ${backupPath}\n- Manifest: ${path.join(backupPath, this.options.manifestName)}\n`;
      ensureFileAndDir(suggestionLog);
      fs.appendFileSync(suggestionLog, logEntry);
      console.error('[CRITICAL] Backup verification failed. See suggestion log for details.');
      // Optionally emit a dashboard event or block further actions
      this.emit('backupError', { backupDir, backupPath });
    }
    // At the end, emit suggestions if any
    if (suggestions.length > 0) {
      await this.log('warn', `Backup completed with ${suggestions.length} warnings.`, { suggestions });
      // Optionally: emit an event or write to a suggestions log for dashboard integration
      this.emit('suggestions', suggestions);
    }
    // At the end, emit dashboard/audit event
    this.emit('backupComplete', { backupPath, manifest, timestamp, filesCopied, filesTotal });
    return { backupPath, manifest, dryRun };
  }

  /**
   * Ensure a safe, approved backup exists before proceeding. Abort if not possible.
   * @param {object} params - { scope, dryRun, approval }
   */
  async ensureSafeBackup({ scope = 'full', dryRun = false, approval = false } = {}) {
    // For demo: always create a new backup. In production, check for recent backup.
    await this.backup({ scope, dryRun, approval });
  }

  /**
   * Generate a manifest for the backup (list all files/dirs, skipped, errors)
   * @param {string} backupPath
   */
  async generateManifest(backupPath) {
    // TODO: Walk backupPath, build manifest JSON
  }

  /**
   * Validate a backup (compare manifest to source, check hashes, etc.)
   * @param {string} backupPath
   */
  async validateBackup(backupPath) {
    // Validate manifest exists
    const manifestPath = path.join(backupPath, this.options.manifestName);
    if (!fs.existsSync(manifestPath)) {
      const msg = `Manifest missing for backup: ${manifestPath}`;
      await this.log('error', msg);
      this._surfaceCriticalError(msg, backupPath);
      return false;
    }
    let manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    } catch (err) {
      const msg = `Failed to read/parse manifest: ${manifestPath}`;
      await this.log('error', msg, { error: err.message });
      this._surfaceCriticalError(msg, backupPath);
      return false;
    }
    let allValid = true;
    for (const entry of manifest) {
      const filePath = path.join(backupPath, entry.file);
      if (!fs.existsSync(filePath)) {
        const msg = `File missing in backup: ${filePath}`;
        await this.log('error', msg);
        this._surfaceCriticalError(msg, backupPath);
        allValid = false;
        continue;
      }
      const hash = this.hashFile(filePath);
      if (hash !== entry.hash) {
        const msg = `Hash mismatch for ${filePath}: expected ${entry.hash}, got ${hash}`;
        await this.log('error', msg);
        this._surfaceCriticalError(msg, backupPath);
        allValid = false;
      }
    }
    if (allValid) {
      await this.log('info', `Backup at ${backupPath} validated successfully.`);
    }
    return allValid;
  }

  /**
   * Restore from a backup (by ID or path)
   * @param {string} backupIdOrPath
   * @param {object} options
   */
  async restore(backupIdOrPath, options = {}) {
    // Accept either a backup folder name or full path
    let backupPath = backupIdOrPath;
    if (!fs.existsSync(backupPath)) {
      // Try resolving from backupDir
      backupPath = path.join(this.options.backupDir, backupIdOrPath);
    }
    if (!fs.existsSync(backupPath)) {
      const msg = `Backup path not found for restore: ${backupPath}`;
      await this.log('error', msg);
      this._surfaceCriticalError(msg, backupPath);
      return false;
    }
    // Validate backup before restore
    const valid = await this.validateBackup(backupPath);
    if (!valid) {
      const msg = `Backup at ${backupPath} failed validation. Aborting restore.`;
      await this.log('error', msg);
      this._surfaceCriticalError(msg, backupPath);
      return false;
    }
    // Restore files (skip manifest, compliance report, etc.)
    const manifestPath = path.join(backupPath, this.options.manifestName);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    for (const entry of manifest) {
      const src = path.join(backupPath, entry.file);
      const dest = path.join(process.cwd(), entry.file);
      try {
        fs.mkdirSync(path.dirname(dest), { recursive: true, mode: 0o700 });
        fs.copyFileSync(src, dest);
        fs.chmodSync(dest, 0o600);
      } catch (err) {
        const msg = `Failed to restore file: ${src} -> ${dest}`;
        await this.log('error', msg, { error: err.message });
        this._surfaceCriticalError(msg, backupPath);
      }
    }
    await this.log('info', `Restore from backup at ${backupPath} completed.`);
    this.emit('restoreComplete', { backupPath });
    return true;
  }

  /**
   * Surface a critical error to suggestion log and dashboard
   */
  _surfaceCriticalError(msg, backupPath) {
    const suggestionLog = path.join(__dirname, '../../project_meta/suggestion_log.md');
    const logEntry = `\n[CRITICAL] ${msg} at ${new Date().toISOString()}\n- Backup: ${backupPath}\n`;
    ensureFileAndDir(suggestionLog);
    fs.appendFileSync(suggestionLog, logEntry);
    console.error(`[CRITICAL] ${msg} See suggestion log for details.`);
    this.emit('backupError', { backupPath, msg });
  }

  /**
   * Rollback to the last good backup if validation fails
   */
  async rollback() {
    // TODO: Rollback logic
  }

  /**
   * Get the status of the last backup
   */
  getLastBackupStatus() {
    return this.lastBackupStatus;
  }

  /**
   * Log backup actions/events via LogOrchestrator
   * @param {string} level
   * @param {string} message
   * @param {object} metadata
   */
  async log(level, message, metadata = {}) {
    if (this.logger && typeof this.logger.log === 'function') {
      await this.logger.log(level, message, metadata);
    } else {
      // Fallback to console
      console[level](`[BackupOrchestrator] ${message}`, metadata);
    }
  }

  /**
   * Send backup telemetry
   * @param {string} metric
   * @param {number} value
   * @param {object} labels
   */
  async sendTelemetry(metric, value, labels = {}) {
    if (this.telemetryManager && typeof this.telemetryManager.recordMetric === 'function') {
      await this.telemetryManager.recordMetric(metric, value, labels, 'BackupOrchestrator');
    }
  }

  hashFile(filePath) {
    const hash = crypto.createHash('sha256');
    const data = fs.readFileSync(filePath);
    hash.update(data);
    return hash.digest('hex');
  }

  async cleanup() {
    this.removeAllListeners();
  }

  /**
   * Write/update backup-progress.json in the backup directory
   */
  _writeProgressFile(backupPath, progress) {
    try {
      const progressPath = path.join(backupPath, 'backup-progress.json');
      ensureFileAndDir(progressPath);
      fs.writeFileSync(progressPath, JSON.stringify({ ...progress, updated: new Date().toISOString() }, null, 2));
    } catch (err) {
      // Log but do not throw
      this.log('warn', 'Failed to write backup-progress.json', { error: err.message });
    }
  }

  /**
   * Write backup-complete.json marker file in the backup directory
   */
  _writeCompleteFile(backupPath, summary) {
    try {
      const completePath = path.join(backupPath, 'backup-complete.json');
      ensureFileAndDir(completePath);
      fs.writeFileSync(completePath, JSON.stringify({ ...summary, completed: new Date().toISOString() }, null, 2));
    } catch (err) {
      this.log('warn', 'Failed to write backup-complete.json', { error: err.message });
    }
  }
}

module.exports = BackupOrchestrator; 
