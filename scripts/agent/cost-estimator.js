const { estimateCost } = require('../orchestration/cost-engine');

function estimatePromptCost(prompt) {
  const length = (prompt || '').split(/\s+/).length;
  return estimateCost(length);
}

module.exports = { estimatePromptCost };
