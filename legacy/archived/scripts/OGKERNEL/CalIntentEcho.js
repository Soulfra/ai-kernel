// Logs intent, outcome, and signature for every agent execution
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const intentLogPath = path.join(__dirname, '../core/CalIntentEcho.json');

function commitIntent({ agent, intent, status = "success", signature = "vault://unknown" }) {
  const now = new Date().toISOString();
  const hash = crypto.createHash('sha256').update(agent + intent + now).digest('hex');

  const entry = {
    agent,
    intent,
    status,
    whisper_signature: signature,
    echo_hash: hash,
    timestamp: now
  };

  const current = fs.existsSync(intentLogPath)
    ? JSON.parse(fs.readFileSync(intentLogPath, 'utf8')) : [];

  current.push(entry);
  fs.writeFileSync(intentLogPath, JSON.stringify(current, null, 2));
  console.log(`📝 Intent recorded for ${agent}`);
}

module.exports = { commitIntent };
