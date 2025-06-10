const fs = require('fs');
const path = require('path');
const { ensureUser, getVaultPath, logUsage } = require('./core/user-vault');
const { runAgentZip } = require('./run-agent-zip');

async function runQueue(user) {
  ensureUser(user);
  const queueFile = path.join(getVaultPath(user), 'agent-queue.json');
  let arr = [];
  if (fs.existsSync(queueFile)) {
    try { arr = JSON.parse(fs.readFileSync(queueFile, 'utf8')); } catch {}
  }
  const logFile = path.join(getVaultPath(user), 'background-agent-log.json');
  let logs = [];
  if (fs.existsSync(logFile)) {
    try { logs = JSON.parse(fs.readFileSync(logFile, 'utf8')); } catch {}
  }
  const remaining = [];
  for (const job of arr) {
    try {
      const out = await runAgentZip(job.zip, '', user);
      logs.push({ timestamp: new Date().toISOString(), zip: job.zip, output: out });
      logUsage(user, { timestamp: new Date().toISOString(), action: 'queue-run', slug: path.basename(job.zip), tokens_used: 1 });
    } catch (err) {
      logs.push({ timestamp: new Date().toISOString(), zip: job.zip, error: err.message });
      remaining.push(job);
    }
  }
  fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
  fs.writeFileSync(queueFile, JSON.stringify(remaining, null, 2));

  const statusFile = path.join(__dirname, '..', 'logs', 'agent-queue-status.json');
  let statusArr = [];
  if (fs.existsSync(statusFile)) { try { statusArr = JSON.parse(fs.readFileSync(statusFile, 'utf8')); } catch {} }
  statusArr.push({ timestamp: new Date().toISOString(), user, processed: arr.length });
  fs.writeFileSync(statusFile, JSON.stringify(statusArr, null, 2));
  return logs;
}

if (require.main === module) {
  const user = process.argv[2];
  if (!user) { console.log('Usage: run-queue.js <user>'); process.exit(1); }
  runQueue(user).then(r => console.log(JSON.stringify(r, null, 2))).catch(e => { console.error(e.message); process.exit(1); });
}

module.exports = { runQueue };
