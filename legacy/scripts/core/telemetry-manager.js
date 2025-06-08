const EventEmitter = require('events');
const path = require('path');
const fs = require('fs').promises;

function percentile(arr, p) {
  if (!arr.length) return null;
  const sorted = arr.slice().sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

class TelemetryManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.metrics = new Map(); // { name: [{...}] }
    this.histograms = new Map(); // { name: [values] }
    this.errors = [];
    this.warnings = [];
    this.spans = new Map(); // { spanId: {name, start, end, status, error} }
    this.sources = new Map();
    this.options = {
      metricsDir: options.metricsDir || 'logs/metrics',
      reportInterval: options.reportInterval || 60000, // 1 minute
      retentionPeriod: options.retentionPeriod || 7 * 24 * 60 * 60 * 1000 // 7 days
    };
  }

  /**
   * Initializes the telemetry manager and starts periodic reporting.
   */
  async initialize() {
    await fs.mkdir(this.options.metricsDir, { recursive: true });
    this.startPeriodicReporting();
  }

  /**
   * Starts periodic reporting of telemetry data.
   */
  startPeriodicReporting() {
    this.reportInterval = setInterval(
      () => this.generateReport(),
      this.options.reportInterval
    );
  }

  /**
   * Records a metric (counter/gauge/summary).
   */
  async recordMetric(name, value, labels = {}, source = null, type = 'counter') {
    const metric = {
      name,
      value,
      labels,
      timestamp: Date.now(),
      source,
      type
    };
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name).push(metric);
    if (source) {
      this.trackSource(source);
    }
    this.emit('metric', metric);
  }

  /**
   * Records a histogram metric (stores all values for later stats).
   */
  async recordHistogram(name, value, labels = {}, source = null) {
    if (!this.histograms.has(name)) {
      this.histograms.set(name, []);
    }
    this.histograms.get(name).push(value);
    // Also record as a metric for compatibility
    await this.recordMetric(name, value, labels, source, 'histogram');
  }

  /**
   * Records an error event as telemetry.
   */
  async recordError(message, metadata = {}) {
    const error = {
      message,
      metadata,
      timestamp: Date.now()
    };
    this.errors.push(error);
    this.emit('error', error);
    // Optionally, also record as a metric
    await this.recordMetric('telemetry_error', 1, { ...metadata, message }, null, 'error');
  }

  /**
   * Records a warning event as telemetry.
   */
  async recordWarning(message, metadata = {}) {
    const warning = {
      message,
      metadata,
      timestamp: Date.now()
    };
    this.warnings.push(warning);
    this.emit('warning', warning);
    await this.recordMetric('telemetry_warning', 1, { ...metadata, message }, null, 'warning');
  }

  /**
   * Tracks a source emitting metrics.
   */
  async trackSource(source) {
    const sourceInfo = {
      id: source.id,
      type: source.type,
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      metrics: new Set()
    };
    if (!this.sources.has(source.id)) {
      this.sources.set(source.id, sourceInfo);
    } else {
      this.sources.get(source.id).lastSeen = Date.now();
    }
    this.emit('source', sourceInfo);
  }

  /**
   * Returns metrics filtered by options.
   */
  async getMetrics(options = {}) {
    const { name, timeRange, labels, source } = options;
    let metrics = [];
    if (name) {
      metrics = this.metrics.get(name) || [];
    } else {
      metrics = Array.from(this.metrics.values()).flat();
    }
    return metrics.filter(metric => {
      if (timeRange) {
        if (metric.timestamp < timeRange.start || metric.timestamp > timeRange.end) {
          return false;
        }
      }
      if (labels) {
        for (const [key, value] of Object.entries(labels)) {
          if (metric.labels[key] !== value) {
            return false;
          }
        }
      }
      if (source && metric.source?.id !== source) {
        return false;
      }
      return true;
    });
  }

  /**
   * Returns histogram stats for a given metric name.
   */
  getHistogramStats(name) {
    const values = this.histograms.get(name) || [];
    if (!values.length) return null;
    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      p50: percentile(values, 50),
      p90: percentile(values, 90),
      p99: percentile(values, 99)
    };
  }

  /**
   * Returns all histogram stats.
   */
  getAllHistogramStats() {
    const stats = {};
    for (const name of this.histograms.keys()) {
      stats[name] = this.getHistogramStats(name);
    }
    return stats;
  }

  /**
   * Starts a span for timing operations.
   */
  async startSpan(name, attributes = {}) {
    const spanId = `${name}_${Date.now()}_${Math.floor(Math.random()*10000)}`;
    this.spans.set(spanId, {
      name,
      start: Date.now(),
      attributes,
      status: 'in_progress',
      error: null
    });
    return spanId;
  }

  /**
   * Ends a span and records timing.
   */
  async endSpan(spanId, status = 'completed', error = null) {
    const span = this.spans.get(spanId);
    if (!span) return;
    span.end = Date.now();
    span.status = status;
    span.error = error;
    await this.recordHistogram(`span_${span.name}_duration_ms`, span.end - span.start, span.attributes);
    this.spans.delete(spanId);
  }

  /**
   * Generates a telemetry report including metrics, histograms, errors, warnings, and sources.
   */
  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      metrics: Object.fromEntries(
        Array.from(this.metrics.entries()).map(([key, value]) => [
          key,
          value.map(m => ({
            ...m,
            timestamp: new Date(m.timestamp).toISOString()
          }))
        ])
      ),
      histograms: this.getAllHistogramStats(),
      errors: this.errors,
      warnings: this.warnings,
      sources: Object.fromEntries(
        Array.from(this.sources.entries()).map(([key, value]) => [
          key,
          {
            ...value,
            firstSeen: new Date(value.firstSeen).toISOString(),
            lastSeen: new Date(value.lastSeen).toISOString(),
            metrics: Array.from(value.metrics)
          }
        ])
      )
    };
    const reportPath = path.join(
      this.options.metricsDir,
      `telemetry-report-${Date.now()}.json`
    );
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    await this.cleanupOldReports();
    return report;
  }

  /**
   * Cleans up old telemetry reports based on retention policy.
   */
  async cleanupOldReports() {
    const files = await fs.readdir(this.options.metricsDir);
    const now = Date.now();
    for (const file of files) {
      const filePath = path.join(this.options.metricsDir, file);
      const stats = await fs.stat(filePath);
      if (now - stats.mtimeMs > this.options.retentionPeriod) {
        await fs.unlink(filePath);
      }
    }
  }

  /**
   * Finalizes telemetry, writes a report, and clears intervals.
   */
  async cleanup() {
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
    }
    await this.generateReport();
  }
}

module.exports = TelemetryManager; 