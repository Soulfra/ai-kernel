// @agent: diagnostics
// @orchestrator: recovery
// @origin: legacy-rescue
const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');

class PluginOrchestrator extends EventEmitter {
  constructor({ pluginsDir = './plugins', logger = null } = {}) {
    super();
    this.pluginsDir = pluginsDir;
    this.plugins = new Map();
    this.logger = logger;
  }

  log(level, message, meta = {}) {
    if (this.logger && this.logger[level]) this.logger[level](message, meta);
    this.emit('log', { level, message, meta });
  }

  discoverPlugins() {
    if (!fs.existsSync(this.pluginsDir)) return [];
    return fs.readdirSync(this.pluginsDir)
      .filter(f => f.endsWith('.js'))
      .map(f => path.join(this.pluginsDir, f));
  }

  async loadPlugins() {
    const pluginFiles = this.discoverPlugins();
    for (const file of pluginFiles) {
      try {
        const plugin = require(file);
        if (plugin && plugin.name) {
          this.plugins.set(plugin.name, plugin);
          this.log('info', `Loaded plugin: ${plugin.name}`);
        }
      } catch (err) {
        this.log('error', `Failed to load plugin: ${file}`, { error: err.message });
      }
    }
  }

  registerPlugin(name, plugin) {
    this.plugins.set(name, plugin);
    this.log('info', `Registered plugin: ${name}`);
  }

  async triggerWorkflow(pluginName, workflowName, params = {}) {
    const plugin = this.plugins.get(pluginName);
    if (!plugin || typeof plugin.runWorkflow !== 'function') {
      this.log('error', `Plugin or workflow not found: ${pluginName}.${workflowName}`);
      return null;
    }
    try {
      const result = await plugin.runWorkflow(workflowName, params);
      this.emit('workflowComplete', { pluginName, workflowName, result });
      return result;
    } catch (err) {
      this.log('error', `Workflow failed: ${pluginName}.${workflowName}`, { error: err.message });
      this.emit('workflowError', { pluginName, workflowName, error: err });
      return null;
    }
  }

  getPlugin(name) {
    return this.plugins.get(name);
  }

  listPlugins() {
    return Array.from(this.plugins.keys());
  }
}

/**
 * Plugin API (for plugin authors):
 * - Export an object with:
 *   - name: string
 *   - runWorkflow(workflowName, params): async function
 *   - (optional) init(), cleanup(), etc.
 *
 * Example:
 * module.exports = {
 *   name: 'my-llm-plugin',
 *   async runWorkflow(workflowName, params) { ... },
 *   async init() { ... },
 *   async cleanup() { ... }
 * };
 */

module.exports = PluginOrchestrator; 
