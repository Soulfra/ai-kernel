// CLI: calctl echo:verify <agent>
const { verifyEcho } = require('./CalEchoProtocol');
const agent = process.argv[2];
if (!agent) {
  console.log("Usage: node calctl-echo-verify.js <agent>");
  process.exit(1);
}
verifyEcho(agent);
