// @agent: diagnostics
// @orchestrator: recovery
// @origin: legacy-rescue

const fs = require('fs');

function logDebug(message) {
  const entry = `\n[${new Date().toISOString()}] ${message}`;
  fs.appendFileSync('project_meta/debug_logs/RECOVERY_DEBUG.log', entry + '\n');
}

module.exports = { logDebug };
