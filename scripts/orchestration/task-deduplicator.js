// @agent: diagnostics
// @orchestrator: recovery
// @origin: legacy-rescue
/**
 * task-deduplicator.js
 * Modular deduplication utility for tasks/plans. Plug into orchestrators/routers.
 *
 * Usage:
 *   const { computeTaskHash, isDuplicateTask, mergeTask } = require('./task-deduplicator');
 *   if (!isDuplicateTask(newTask, existingTasks)) addTask(newTask);
 *
 * - <250 lines, no side effects, no file ops
 * - Designed for dynamic, modular, router-friendly use
 */
const crypto = require('crypto');

function computeTaskHash(task) {
  // Hash only relevant fields for deduplication
  const relevant = {
    type: task.type,
    file: task.file,
    dependencies: task.dependencies,
    references: task.references,
    tags: task.tags,
    // Add more fields as needed
  };
  const str = JSON.stringify(relevant);
  return crypto.createHash('sha256').update(str).digest('hex');
}

function isDuplicateTask(task, existingTasks) {
  const hash = computeTaskHash(task);
  return existingTasks.some(t => computeTaskHash(t) === hash);
}

function findDuplicateTask(task, existingTasks) {
  const hash = computeTaskHash(task);
  return existingTasks.find(t => computeTaskHash(t) === hash);
}

function mergeTask(newTask, existingTask) {
  // Merge fields, preferring non-null/undefined from newTask
  return {
    ...existingTask,
    ...Object.fromEntries(
      Object.entries(newTask).filter(([k, v]) => v !== null && v !== undefined)
    ),
    // Optionally merge tags, dependencies, etc.
    tags: Array.from(new Set([...(existingTask.tags || []), ...(newTask.tags || [])])),
    dependencies: Array.from(new Set([...(existingTask.dependencies || []), ...(newTask.dependencies || [])])),
    references: Array.from(new Set([...(existingTask.references || []), ...(newTask.references || [])]))
  };
}

module.exports = {
  computeTaskHash,
  isDuplicateTask,
  findDuplicateTask,
  mergeTask
}; 
