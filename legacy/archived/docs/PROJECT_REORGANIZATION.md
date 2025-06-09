# Project Reorganization

This document outlines the process and components involved in reorganizing the project structure.

## Overview

The project reorganization system is designed to analyze, validate, and execute changes to the project structure while maintaining data integrity and providing comprehensive logging and debugging capabilities.

## Components

### 1. ReorganizationExecutor

The main orchestrator that coordinates the entire reorganization process. Located at `scripts/execute-reorganization.js`.

#### Responsibilities:
- Initializes all required components
- Coordinates the execution of analysis, validation, and migration steps
- Generates comprehensive reports
- Handles error cases and cleanup

#### Usage:
```bash
node scripts/execute-reorganization.js [options]
```

Available options:
- `--dry-run`: Perform analysis and validation without making changes
- `--validate-only`: Only validate the current structure
- `--backup-dir=<path>`: Specify custom backup directory
- `--log-dir=<path>`: Specify custom log directory
- `--debug-dir=<path>`: Specify custom debug directory

### 2. Core Components

#### LogOrchestrator (`scripts/core/log-orchestrator.js`)
- Handles all logging operations
- Provides metrics and analytics
- Manages log rotation and cleanup

#### DebugOrchestrator (`scripts/core/debug-orchestrator.js`)
- Manages debugging information
- Handles error tracking and resolution
- Provides debugging metrics

#### DocumentationConsolidator (`scripts/consolidate-documentation.js`)
- Analyzes and consolidates documentation
- Generates recommendations
- Validates documentation structure

#### Documentation Utilities (`scripts/documentation/`)
- Documentation fixing, enhancement, management, and generation scripts are now located in this folder for canonical organization.

#### OrchestratorMigration (`scripts/core/orchestrator-migration.js`)
- Manages orchestrator migration
- Handles dependency analysis
- Ensures backup creation

#### DocumentationOrchestrator (`scripts/core/documentation-orchestrator.js`)
- Handles documentation orchestration and processing
- Now located in the canonical core folder

## Process Flow

1. **Initialization**
   - Set up logging and debugging
   - Initialize all components
   - Create necessary directories

2. **Analysis**
   - Analyze current project structure
   - Identify dependencies
   - Generate recommendations

3. **Validation**
   - Validate proposed changes
   - Check for potential issues
   - Verify data integrity

4. **Execution**
   - Create backups
   - Consolidate documentation
   - Migrate orchestrators
   - Generate final report

## Output

### Reports
- Located in the specified log directory
- Named `reorganization-report.json`
- Contains:
  - Analysis results
  - Validation status
  - Metrics and statistics
  - Timestamps and execution details

### Logs
- Detailed execution logs
- Error tracking
- Performance metrics

### Debug Information
- Issue tracking
- Resolution attempts
- Debug metrics

## Testing

Tests are located in `tests/unified-migration/` and cover:
- Component initialization
- Execution flow
- Error handling
- Report generation
- Cleanup procedures

Run tests with:
```bash
npm test
```

## Directory Structure

After reorganization:
```
project/
├── scripts/
│   ├── core/
│   │   ├── log-orchestrator.js
│   │   ├── debug-orchestrator.js
│   │   └── orchestrator-migration.js
│   ├── execute-reorganization.js
│   └── consolidate-documentation.js
├── tests/
│   └── unified-migration/
│       ├── execute-reorganization.test.js
│       └── helpers/
├── docs/
│   └── PROJECT_REORGANIZATION.md
├── logs/
│   └── reorganization-report.json
├── debug/
│   └── issues.json
└── backups/
    └── timestamp/
```

## Best Practices

1. **Always run in dry-run mode first**
   ```bash
   node scripts/execute-reorganization.js --dry-run
   ```

2. **Validate changes before execution**
   ```bash
   node scripts/execute-reorganization.js --validate-only
   ```

3. **Review the report before proceeding**
   - Check for warnings and errors
   - Verify recommendations
   - Review metrics

4. **Keep backups**
   - Use custom backup directory for important data
   - Verify backup integrity
   - Maintain backup history

## Troubleshooting

### Common Issues

1. **Initialization Failures**
   - Check directory permissions
   - Verify component dependencies
   - Review log files

2. **Validation Errors**
   - Check for conflicting changes
   - Verify data integrity
   - Review debug information

3. **Execution Failures**
   - Check backup status
   - Review error logs
   - Verify component state

### Getting Help

1. Check the logs in the specified log directory
2. Review debug information in the debug directory
3. Consult the reorganization report
4. Check component-specific documentation

## Contributing

1. Follow the existing code structure
2. Add tests for new functionality
3. Update documentation
4. Follow error handling patterns
5. Maintain logging standards

## Support

For issues and questions:
1. Check the documentation
2. Review logs and debug information
3. Consult the reorganization report
4. Contact the development team

## Logging and Telemetry Standards

- **All logging (info, error, warn, etc.) must go through the canonical `LogOrchestrator` (`scripts/core/log-orchestrator.js`).**
- **Direct use of `console.log`, `console.error`, or `console.warn` is prohibited** except in explicitly allowed demo/example files (see validation script).
- **All orchestrators and major scripts must import and use the canonical logger.**
- **A validation script (`scripts/validate-logging.js`) is provided to enforce this rule.**
- **Telemetry and span tracking should use the canonical `TelemetryManager` where appropriate.**

### Validation

Run the following to check for logging violations:

```bash
node scripts/validate-logging.js
```

This will fail with a nonzero exit code if any direct logging is found outside allowed files, or if orchestrators are missing the canonical logger.

## Archive & Deprecation

All deprecated or duplicate files are moved to an `/archive/` directory within their module or component. Actions are logged in the debug/task logs. For details on the archiving process, restoration, and best practices, see [ARCHIVE.md](../../ARCHIVE.md). 