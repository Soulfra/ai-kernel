const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const LogOrchestrator = require('./log-orchestrator');
const TelemetryManager = require('./telemetry-manager');
const BackupOrchestrator = require('./backup-orchestrator');
const logOrchestrator = new LogOrchestrator();

class QualityOrchestrator extends EventEmitter {
  /**
   * @param {object} options
   * @param {object} di - Dependency injection: { logger, telemetryManager, orchestratorOverrides, backupOrchestrator }
   * orchestratorOverrides: { [className]: OrchestratorClass }
   */
  constructor(options = {}, { logger, telemetryManager, orchestratorOverrides, backupOrchestrator } = {}) {
    super();
    this.options = {
      metricsDir: options.metricsDir || './logs/metrics',
      thresholdConfig: options.thresholdConfig || {
        errorRate: 0.05,          // 5% error rate threshold
        responseTime: 1000,       // 1 second response time threshold
        memoryUsage: 0.8,         // 80% memory usage threshold
        cpuUsage: 0.7,            // 70% CPU usage threshold
        diskSpace: 0.9            // 90% disk space threshold
      },
      checkInterval: options.checkInterval || 60000, // 1 minute
      retentionPeriod: options.retentionPeriod || 2592000000, // 30 days
      analysisConfig: options.analysisConfig || {},
      ...options
    };
    this.logger = logger || new LogOrchestrator({
      logDir: path.join(__dirname, '../../logs/metrics'),
      enableMetrics: true
    });
    this.telemetryManager = telemetryManager || new TelemetryManager();
    this.orchestratorOverrides = orchestratorOverrides || {};
    this.backupOrchestrator = backupOrchestrator || new BackupOrchestrator(this.options, { logger: this.logger, telemetryManager: this.telemetryManager });
    this.metrics = new Map();
    this.issues = new Map();
    this.suggestions = new Map();
    this.isMonitoring = false;
  }

  async initialize() {
    try {
      await fs.mkdir(this.options.metricsDir, { recursive: true });
      await this.loadHistoricalMetrics();
      this.startMonitoring();
      await this.telemetryManager.startSpan('QualityOrchestrator.initialize');
      this.emit('initialized', { status: 'success' });
      await this.telemetryManager.endSpan('QualityOrchestrator.initialize');
    } catch (error) {
      this.emit('error', {
        type: 'initialization',
        error: error.message
      });
      throw error;
    }
  }

  async loadHistoricalMetrics() {
    try {
      const files = await fs.readdir(this.options.metricsDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(
            path.join(this.options.metricsDir, file),
            'utf8'
          );
          const metrics = JSON.parse(content);
          this.metrics.set(file.replace('.json', ''), metrics);
        }
      }
    } catch (error) {
      this.emit('error', {
        type: 'metrics_loading',
        error: error.message
      });
    }
  }

  startMonitoring() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(
      () => this.checkSystemHealth(),
      this.options.checkInterval
    );
  }

  async checkSystemHealth() {
    try {
      const metrics = await this.collectMetrics();
      await this.analyzeMetrics(metrics);
      await this.saveMetrics(metrics);
      await this.cleanupOldMetrics();
    } catch (error) {
      this.emit('error', {
        type: 'health_check',
        error: error.message
      });
    }
  }

  async collectMetrics() {
    const metrics = {
      timestamp: new Date().toISOString(),
      system: {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        uptime: process.uptime()
      },
      performance: {
        responseTimes: [],
        errorRates: [],
        throughput: 0
      },
      resources: {
        diskSpace: await this.getDiskSpace(),
        activeConnections: 0
      }
    };

    await this.telemetryManager.recordMetric('quality_metrics_collected', 1);
    return metrics;
  }

  async getDiskSpace() {
    // This is a placeholder - implement actual disk space checking
    return {
      total: 0,
      used: 0,
      free: 0
    };
  }

  async analyzeMetrics(metrics) {
    const issues = [];
    const suggestions = [];

    // Check error rate
    if (metrics.performance.errorRates.length > 0) {
      const avgErrorRate = metrics.performance.errorRates.reduce((a, b) => a + b) / 
                          metrics.performance.errorRates.length;
      if (avgErrorRate > this.options.thresholdConfig.errorRate) {
        issues.push({
          type: 'error_rate',
          severity: 'high',
          message: `Error rate (${avgErrorRate}) exceeds threshold (${this.options.thresholdConfig.errorRate})`
        });
        suggestions.push({
          type: 'error_rate',
          action: 'review_error_logs',
          priority: 'high'
        });
      }
    }

    // Check response time
    if (metrics.performance.responseTimes.length > 0) {
      const avgResponseTime = metrics.performance.responseTimes.reduce((a, b) => a + b) / 
                             metrics.performance.responseTimes.length;
      if (avgResponseTime > this.options.thresholdConfig.responseTime) {
        issues.push({
          type: 'response_time',
          severity: 'medium',
          message: `Average response time (${avgResponseTime}ms) exceeds threshold (${this.options.thresholdConfig.responseTime}ms)`
        });
        suggestions.push({
          type: 'response_time',
          action: 'optimize_critical_paths',
          priority: 'medium'
        });
      }
    }

    // Check memory usage
    const memoryUsage = metrics.system.memory.heapUsed / metrics.system.memory.heapTotal;
    if (memoryUsage > this.options.thresholdConfig.memoryUsage) {
      issues.push({
        type: 'memory_usage',
        severity: 'high',
        message: `Memory usage (${memoryUsage}) exceeds threshold (${this.options.thresholdConfig.memoryUsage})`
      });
      suggestions.push({
        type: 'memory_usage',
        action: 'review_memory_leaks',
        priority: 'high'
      });
    }

    // Update issues and suggestions
    this.issues.set(metrics.timestamp, issues);
    this.suggestions.set(metrics.timestamp, suggestions);

    // Emit events for significant issues
    if (issues.length > 0) {
      this.emit('issues_detected', {
        timestamp: metrics.timestamp,
        issues,
        suggestions
      });
      await this.telemetryManager.recordMetric('quality_issue_detected', issues.length);
    }
  }

  async saveMetrics(metrics) {
    const filename = `metrics_${metrics.timestamp.replace(/[:.]/g, '-')}.json`;
    await fs.writeFile(
      path.join(this.options.metricsDir, filename),
      JSON.stringify(metrics, null, 2)
    );
    this.metrics.set(filename.replace('.json', ''), metrics);
  }

  async cleanupOldMetrics() {
    const cutoff = Date.now() - this.options.retentionPeriod;
    for (const [key, metrics] of this.metrics) {
      if (new Date(metrics.timestamp).getTime() < cutoff) {
        await fs.unlink(path.join(this.options.metricsDir, `${key}.json`));
        this.metrics.delete(key);
        this.issues.delete(metrics.timestamp);
        this.suggestions.delete(metrics.timestamp);
      }
    }
  }

  getCurrentIssues() {
    return Array.from(this.issues.values()).flat();
  }

  getCurrentSuggestions() {
    return Array.from(this.suggestions.values()).flat();
  }

  async generateQualityReport() {
    const report = {
      timestamp: new Date().toISOString(),
      metrics: {
        total: this.metrics.size,
        latest: this.metrics.get(Array.from(this.metrics.keys()).pop())
      },
      issues: this.getCurrentIssues(),
      suggestions: this.getCurrentSuggestions(),
      summary: {
        criticalIssues: this.getCurrentIssues().filter(i => i.severity === 'high').length,
        totalIssues: this.getCurrentIssues().length,
        pendingSuggestions: this.getCurrentSuggestions().length
      }
    };

    return report;
  }

  async cleanup() {
    // Require a valid backup before cleanup or destructive operations
    await this.backupOrchestrator.ensureSafeBackup({ scope: 'full', dryRun: false, approval: true });
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    this.isMonitoring = false;
    this.removeAllListeners();
  }
}

module.exports = QualityOrchestrator; 