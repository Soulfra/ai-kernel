// CLI: calctl echo:commit <agent>
const { commitEcho } = require('./CalEchoProtocol');
const agent = process.argv[2];
if (!agent) {
  console.log("Usage: node calctl-echo-commit.js <agent>");
  process.exit(1);
}
commitEcho(agent);
