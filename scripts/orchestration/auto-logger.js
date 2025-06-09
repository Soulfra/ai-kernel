// @agent: diagnostics
// @orchestrator: recovery
// @origin: legacy-rescue
/**
 * auto-logger.js
 * Modular utility for universal, context-rich logging via LogOrchestrator.
 *
 * Usage:
 *   const logger = require('./auto-logger')('TaskManager');
 *   logger.info('Task started', { taskId });
 *
 * - <250 lines, no circular dependencies
 * - Auto-injects orchestrator/module context
 * - Exports: info, warn, error, debug, fatal
 */
const LogOrchestrator = require('./log-orchestrator');
const fs = require('fs');
const logPath = 'project_meta/suggestion_log.md';
const debugLogPath = 'project_meta/debug_logs/AUTO_LOGGER_DEBUG.log';
const args = process.argv.slice(2);
const ciMode = args.includes('--ci');

function createLogger(moduleName, options = {}) {
  const logger = new LogOrchestrator(options);
  function withContext(level) {
    return (message, meta = {}) => {
      const context = Object.assign({}, meta, { module: moduleName });
      return logger[level](message, context);
    };
  }
  return {
    info: withContext('info'),
    warn: withContext('warn'),
    error: withContext('error'),
    debug: withContext('debug'),
    fatal: withContext('fatal')
  };
}

function logSuggestion(message) {
  const entry = `\n[${new Date().toISOString()}] ${message}`;
  fs.appendFileSync(logPath, entry + '\n');
}

function logDebug(message) {
  const entry = `\n[${new Date().toISOString()}] ${message}`;
  fs.appendFileSync(debugLogPath, entry + '\n');
}

module.exports = { createLogger, logSuggestion, logDebug, ciMode }; 
