const { isDuplicateTask, mergeTask } = require('../../../core/task-deduplicator');
const createLogger = require('../../../core/auto-logger');
const logger = createLogger('TaskManager');

class TaskManager {
  constructor(options = {}) {
    this.options = options;
    this.dependencyManager = new DependencyManager(options);
  }

  async buildQueue(dependencyReport) {
    // Group files by dependency clusters
    const clusters = this.dependencyManager.groupByDependencies(dependencyReport);
    // Sort clusters by dependency order
    const sortedClusters = this.dependencyManager.sortClusters(clusters, dependencyReport);
    // Create migration tasks
    const tasks = [];
    for (const cluster of sortedClusters) {
      tasks.push(...this.createMigrationTasks(cluster, dependencyReport));
    }
    return tasks;
  }

  /**
   * Creates migration tasks for a cluster, deduplicating by hash.
   * If a duplicate exists, merges and updates the task instead of adding.
   * Logs deduplication actions for traceability.
   * @param {Set<string>} cluster
   * @param {Object} dependencyReport
   * @returns {Array<Object>} tasks
   */
  createMigrationTasks(cluster, dependencyReport) {
    const tasks = [];
    for (const file of cluster) {
      const newTask = {
        type: 'migrate',
        file,
        dependencies: dependencyReport.dependencies[file] || [],
        references: dependencyReport.references[file] || [],
        tags: ['migration']
      };
      if (isDuplicateTask(newTask, tasks)) {
        const existing = tasks.find(t => isDuplicateTask(newTask, [t]));
        const merged = mergeTask(newTask, existing);
        Object.assign(existing, merged);
        logger.info('Task deduplicated and merged', { file, task: merged });
      } else {
        tasks.push(newTask);
        logger.info('Task created', { file, task: newTask });
      }
    }
    return tasks;
  }

  async validatePlan(queue, dependencyReport) {
    // ... existing code ...
  }
}

module.exports = TaskManager; 