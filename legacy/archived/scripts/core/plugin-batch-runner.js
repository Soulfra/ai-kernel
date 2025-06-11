require('../../scripts/load-secrets');
const PluginOrchestrator = require('./plugin-orchestrator');
const fs = require('fs');

async function batchProcessSuggestions(suggestions) {
  console.log('=== Plugin Batch Runner ===');
  const pluginOrchestrator = new PluginOrchestrator();
  let plugins = [];
  try {
    await pluginOrchestrator.loadPlugins();
    plugins = pluginOrchestrator.listPlugins();
    console.log('Loaded plugins:', plugins);
    if (plugins.length === 0) {
      console.warn('No plugins found. Please add plugins to the /plugins directory.');
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error('[ERROR] Plugins directory not found. Please create a /plugins directory.');
      return [];
    } else {
      console.error('[ERROR] Failed to load plugins:', err);
      return [];
    }
  }

  const results = [];
  for (const suggestion of suggestions) {
    for (const pluginName of plugins) {
      try {
        const result = await pluginOrchestrator.triggerWorkflow(pluginName, 'suggestion', { suggestion });
        results.push({ plugin: pluginName, suggestion, result });
        pluginOrchestrator.emit('batchResult', { plugin: pluginName, suggestion, result });
        console.log(`[${pluginName}] Suggestion: ${suggestion} =>`, result);
      } catch (err) {
        results.push({ plugin: pluginName, suggestion, error: err.message });
        pluginOrchestrator.emit('batchError', { plugin: pluginName, suggestion, error: err });
        console.error(`[${pluginName}] Error processing suggestion: ${suggestion}`, err);
      }
    }
  }
  if (results.length === 0) {
    console.log('No suggestions were processed.');
  }
  console.log('=== Batch Processing Complete ===');
  results.forEach(r => {
    if (r.error) {
      console.log(`[${r.plugin}] ERROR: ${r.suggestion} => ${r.error}`);
    } else {
      console.log(`[${r.plugin}] SUCCESS: ${r.suggestion} => ${JSON.stringify(r.result)}`);
    }
  });
  return results;
}

// Example usage:
if (require.main === module) {
  const suggestions = [
    'Fix ENOENT error in backup script',
    'Improve logging in orchestrator',
    'Add timeout to compliance check'
  ];
  batchProcessSuggestions(suggestions);
} 