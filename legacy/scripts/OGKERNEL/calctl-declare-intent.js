// CLI: calctl declare:intent <Agent.js> "<intent>" "<signature>"
const { commitIntent } = require('./CalIntentEcho');
const args = process.argv.slice(2);
const [agent, intent, signature] = args;

if (!agent || !intent) {
  console.log("Usage: node calctl-declare-intent.js <Agent.js> "<intent>" "<signature>"");
  process.exit(1);
}

commitIntent({
  agent,
  intent,
  signature: signature || "vault://manual/cli"
});
