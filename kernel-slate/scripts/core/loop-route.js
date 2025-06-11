// CLARITY_ENGINE Kernel Slate: load loop route JSON
// Loads JSON from the path specified by LOOP_ROUTE_PATH and exports it.
const fs = require('fs');
const path = require('path');

function loadLoopRoute() {
  const routeEnv = process.env.LOOP_ROUTE_PATH;
  if (!routeEnv) {
    throw new Error('LOOP_ROUTE_PATH environment variable is not set');
  }
  const filePath = path.resolve(routeEnv);
  let data;
  try {
    data = fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    throw new Error(`Loop route file missing at ${filePath}`);
  }
  try {
    return JSON.parse(data);
  } catch (err) {
    throw new Error(`Malformed JSON in loop route file at ${filePath}: ${err.message}`);
  }
}

module.exports = loadLoopRoute();
