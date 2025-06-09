---
title: LOG_ORCHESTRATOR
version: 1.0.0
description: Canonical logging orchestrator for the Clarity Engine system. Provides modular, context-aware, machine-readable logging for all orchestrators, agents, and scripts.
lastUpdated: 2025-06-03T04:00:00Z
---

# LogOrchestrator Documentation

## Overview
LogOrchestrator is the canonical logging system for the Clarity Engine. It provides modular, context-rich, JSON-based logging for all orchestrators, agents, and scripts. All logs are machine-readable, linkable, and validated for consistency and non-recursive design.

## API Reference
- `constructor(options)`: Initialize with options (logDir, logLevels, etc.)
- `log(level, message, context)`: Log a message at a given level with context
- `info(message, context)`: Info-level log
- `warn(message, context)`: Warning-level log
- `error(message, context)`: Error-level log
- `debug(message, context)`: Debug-level log
- `fatal(message, context)`: Fatal-level log
- `getLogStats()`: Get log statistics
- `cleanup()`: Close streams and clean up

## Usage Examples
```js
const LogOrchestrator = require('./core/log-orchestrator');
const logger = new LogOrchestrator({ logDir: './logs/debug' });

logger.info('Task started', { taskId: 'task_001', orchestrator: 'MetaOrchestrator' });
logger.error('Task failed', { taskId: 'task_001', error: 'Timeout' });
```

## Best Practices
- Always use LogOrchestrator for all logging (no direct console.log)
- Include context (taskId, orchestrator, file, etc.) in every log
- Use JSON for all logs (machine-readable)
- Rotate and archive logs regularly
- Never create circular dependencies in logging modules

## Validation
- Run `scripts/validate-logging.js` to enforce canonical usage
- CI and pre-commit hooks should block violations

## Exporting & Archiving Logs
- Use CLI or scripts to zip and export logs:
  ```sh
  zip -r debug_logs.zip logs/debug/
  ```
- Logs can be emailed or uploaded for audit/compliance

## Feature Summary Table
| Feature         | How Achieved                                      |
|-----------------|---------------------------------------------------|
| Modular         | Canonical orchestrator, no circular deps          |
| Dynamic         | Context objects, runtime config                   |
| Expandable      | Plugin/config-based outputs, new log levels       |
| Linkable        | taskId, traceId, parentId in every log            |
| Properly logged | JSON, validated, context-rich, machine-readable   |
| Non-recursive   | No self-imports, enforced by validation           |
| Documented      | Examples, API docs, best practices in `/docs/`    |

## Extensibility
- Add new log levels, outputs, or formats via config/plugins
- Integrate with dashboards, RAG, or external systems

---
*For more, see `TELEMETRY_MANAGER.md` and `validate-logging.js`.*

## Implementation

### Core Features
- Multi-level logging (debug, info, warn, error, fatal)
- Log rotation based on size
- Event emission for system monitoring
- JSON-structured log entries
- Automatic log directory creation

### Configuration
```javascript
const options = {
  logDir: './logs',           // Base directory for logs
  maxLogSize: 1024 * 1024,    // Maximum size per log file (1MB)
  maxLogFiles: 5,             // Maximum number of rotated files
  logLevels: ['debug', 'info', 'warn', 'error', 'fatal']
};
```

### Usage Examples

#### Basic Logging
```javascript
const logOrchestrator = new LogOrchestrator(options);
await logOrchestrator.initialize();

// Log at different levels
await logOrchestrator.debug('Debug message');
await logOrchestrator.info('Info message');
await logOrchestrator.warn('Warning message');
await logOrchestrator.error('Error message');
await logOrchestrator.fatal('Fatal message');
```

#### Logging with Metadata
```javascript
await logOrchestrator.info('User action', {
  userId: '123',
  action: 'login',
  timestamp: new Date().toISOString()
});
```

#### Event Handling
```javascript
logOrchestrator.on('log', (logEntry) => {
  // Handle log events
  console.log(`New log entry: ${logEntry.level} - ${logEntry.message}`);
});
```

## Log Format
```json
{
  "timestamp": "2024-03-14T12:00:00.000Z",
  "level": "info",
  "message": "Log message",
  "metadata": {
    "key": "value"
  }
}
```

## Error Handling
- Invalid log levels throw errors
- File system errors are caught and logged
- Rotation errors trigger fallback behavior

## Testing
- Unit tests verify log creation and rotation
- Integration tests check event emission
- Error cases are covered
- File system operations are mocked

## Integration with DebugOrchestrator
```javascript
const debugOrchestrator = new DebugOrchestrator(debugOptions);
logOrchestrator.on('log', (logEntry) => {
  if (logEntry.level === 'error') {
    debugOrchestrator.handleError('log', new Error(logEntry.message));
  }
});
```

## Maintenance
- Regular log cleanup
- Monitoring log directory size
- Checking rotation effectiveness
- Verifying event emission

## Related Components
- DebugOrchestrator
- TaskOrchestrator
- DocumentationOrchestrator

## Version History
- v1.0.0: Initial implementation
- v1.1.0: Added log rotation
- v1.2.0: Enhanced event emission 