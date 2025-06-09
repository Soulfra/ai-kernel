
const fs = require('fs');

if (!fs.existsSync('CalDevTrace.json')) {
  console.error('❌ No CalDevTrace.json found. Run CalShell first.');
  process.exit(1);
}

const trace = JSON.parse(fs.readFileSync('CalDevTrace.json'));
const replay = trace.map(entry => {
  return {
    command: entry.command,
    time: entry.timestamp,
    result: entry.exitCode === 0 ? '✅ success' : `❌ code ${entry.exitCode}`
  };
});

fs.writeFileSync('calTrustReplay.json', JSON.stringify(replay, null, 2));
console.log('📜 Trust replay written to calTrustReplay.json');
