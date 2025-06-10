const fs = require('fs');
const path = require('path');
const { ensureUser, getVaultPath } = require('./core/user-vault');

function queueAgent(zipPath, user) {
  ensureUser(user);
  const queueFile = path.join(getVaultPath(user), 'agent-queue.json');
  let arr = [];
  if (fs.existsSync(queueFile)) {
    try { arr = JSON.parse(fs.readFileSync(queueFile, 'utf8')); } catch {}
  }
  arr.push({ zip: path.resolve(zipPath), timestamp: new Date().toISOString() });
  fs.writeFileSync(queueFile, JSON.stringify(arr, null, 2));

  const logFile = path.join(__dirname, '..', 'logs', 'agent-queue-status.json');
  let logArr = [];
  if (fs.existsSync(logFile)) {
    try { logArr = JSON.parse(fs.readFileSync(logFile, 'utf8')); } catch {}
  }
  logArr.push({ timestamp: new Date().toISOString(), user, queued: path.basename(zipPath) });
  fs.writeFileSync(logFile, JSON.stringify(logArr, null, 2));
}

if (require.main === module) {
  const [zip, user] = process.argv.slice(2);
  if (!zip || !user) {
    console.log('Usage: queue-agent.js <path.zip> <user>');
    process.exit(1);
  }
  queueAgent(zip, user);
  console.log('queued');
}

module.exports = { queueAgent };
