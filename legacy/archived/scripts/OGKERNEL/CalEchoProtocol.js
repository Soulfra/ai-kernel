// CalEchoProtocol.js — Protocol-level echo manager
const fs = require('fs');
const path = require('path');

const pulsePath = path.join(__dirname, '../core/CalEchoPulse.json');

function commitEcho(agent) {
  const pulse = fs.existsSync(pulsePath)
    ? JSON.parse(fs.readFileSync(pulsePath))
    : {};

  const now = Date.now();
  const hash = require('crypto').createHash('sha256').update(agent + now).digest('hex');

  pulse[agent] = {
    last_echo: now,
    hash,
    status: "ok"
  };

  fs.writeFileSync(pulsePath, JSON.stringify(pulse, null, 2));
  console.log(`✅ Echo committed for ${agent}`);
}

function verifyEcho(agent, threshold = 15000) {
  const pulse = fs.existsSync(pulsePath)
    ? JSON.parse(fs.readFileSync(pulsePath))
    : {};

  if (!pulse[agent]) {
    console.log(`❌ No echo record found for ${agent}`);
    return false;
  }

  const delta = Date.now() - pulse[agent].last_echo;
  if (delta > threshold) {
    console.log(`⚠️ Echo for ${agent} is stale: ${delta}ms`);
    return false;
  }

  console.log(`✅ Echo for ${agent} is fresh (${delta}ms)`);
  return true;
}

module.exports = { commitEcho, verifyEcho };
