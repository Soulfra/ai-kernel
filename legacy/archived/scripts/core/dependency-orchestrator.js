const { EventEmitter } = require('events');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class DependencyOrchestrator extends EventEmitter {
  constructor({ logger, debugOrchestrator } = {}) {
    super();
    this.logger = logger;
    this.debugOrchestrator = debugOrchestrator;
  }

  log(level, message, meta = {}) {
    if (this.logger && this.logger.initialize) {
      this.logger.initialize();
    }
    if (this.logger && this.logger[level]) this.logger[level](message, meta);
    this.emit('log', { level, message, meta });
  }

  async runAudit({ targetDir = '.', fallbackScript = null } = {}) {
    this.log('info', `Starting dependency audit for ${targetDir}`);
    let depcheckResult = null;
    try {
      execSync(`npx depcheck ${targetDir} --json > depcheck-result.json`, { stdio: 'inherit' });
      depcheckResult = JSON.parse(fs.readFileSync('depcheck-result.json', 'utf8'));
      this.log('info', 'depcheck completed', { depcheckResult });
    } catch (err) {
      this.log('warn', 'depcheck failed, attempting fallback', { error: err.message });
      if (fallbackScript) {
        try {
          execSync(`node ${fallbackScript} ${targetDir}`, { stdio: 'inherit' });
          depcheckResult = JSON.parse(fs.readFileSync('depcheck-result.json', 'utf8'));
        } catch (fallbackErr) {
          this.log('error', 'Fallback dependency audit failed', { error: fallbackErr.message });
          if (this.debugOrchestrator) this.debugOrchestrator.handleError(fallbackErr, 'DependencyOrchestrator');
          return { status: 'error', error: fallbackErr };
        }
      } else {
        if (this.debugOrchestrator) this.debugOrchestrator.handleError(err, 'DependencyOrchestrator');
        return { status: 'error', error: err };
      }
    }
    // Auto-install missing dependencies
    if (depcheckResult && depcheckResult.missing && Object.keys(depcheckResult.missing).length > 0) {
      for (const pkg of Object.keys(depcheckResult.missing)) {
        try {
          this.log('info', `Auto-installing missing dependency: ${pkg}`);
          execSync(`npm install ${pkg} --save --yes`, { stdio: 'inherit' });
        } catch (installErr) {
          this.log('error', `Failed to auto-install ${pkg}`, { error: installErr.message });
          if (this.debugOrchestrator) this.debugOrchestrator.handleError(installErr, 'DependencyOrchestrator');
        }
      }
    }
    this.log('info', 'Dependency audit complete');
    return { status: 'ok', result: depcheckResult };
  }
}

module.exports = DependencyOrchestrator; 