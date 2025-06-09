
const fs = require('fs');

if (!fs.existsSync('CalDevTrace.json')) {
  console.log('No session yet.');
  process.exit(0);
}

const trace = JSON.parse(fs.readFileSync('CalDevTrace.json'));
const delta = fs.existsSync('CalTrustDelta.json') ? JSON.parse(fs.readFileSync('CalTrustDelta.json')) : { delta: [] };
const thoughts = fs.existsSync('calWhisperThoughts.json') ? JSON.parse(fs.readFileSync('calWhisperThoughts.json')) : { sessionThoughts: [] };

console.log(`🪞 Cal Mirror Report:
Commands: ${trace.length}
Delta Files: ${delta.delta.length}
Reflections: ${thoughts.sessionThoughts.length}
Status: ${delta.delta.length === 0 ? '✅ Stable' : '⚠️ Drift Detected'}
`);
