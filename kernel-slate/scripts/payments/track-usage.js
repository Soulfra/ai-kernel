const fs = require('fs');
const path = require('path');
const usageFile = path.resolve(__dirname, '../../usage.json');

function logInstall(agentName) {
  logEvent(agentName, 'install');
}

function logEvent(agentName, action) {
  const logs = fs.existsSync(usageFile)
    ? JSON.parse(fs.readFileSync(usageFile, 'utf8'))
    : [];
  logs.push({
    agent: agentName,
    action,
    timestamp: new Date().toISOString()
  });
  fs.writeFileSync(usageFile, JSON.stringify(logs, null, 2));
}

module.exports = { logInstall, logEvent };
