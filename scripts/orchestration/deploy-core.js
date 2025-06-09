// @agent: diagnostics
// @orchestrator: recovery
// @origin: legacy-rescue

const loadSecrets = require('../core/load-secrets');

function prepare() {
  loadSecrets();
}

module.exports = { prepare };
