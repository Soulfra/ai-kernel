const crypto = require('crypto');

/**
 * Generate a deterministic route hash from a JSON payload.
 * @param {object} json - Input JSON object
 * @returns {string} sha256 hash string
 */
function generateRouteHash(json) {
  const data = typeof json === 'string' ? json : JSON.stringify(json);
  return crypto.createHash('sha256').update(data).digest('hex');
}

module.exports = generateRouteHash;
