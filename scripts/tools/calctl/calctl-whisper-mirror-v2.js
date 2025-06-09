
const fs = require('fs');

let trace = [];
let delta = { delta: [] };
let thoughts = { sessionThoughts: [] };

try {
  if (fs.existsSync('CalDevTrace.json')) {
    const parsed = JSON.parse(fs.readFileSync('CalDevTrace.json'));
    if (Array.isArray(parsed)) trace = parsed;
  }
  if (fs.existsSync('CalTrustDelta.json')) {
    const parsed = JSON.parse(fs.readFileSync('CalTrustDelta.json'));
    if (Array.isArray(parsed.delta)) delta = parsed;
  }
  if (fs.existsSync('calWhisperThoughts.json')) {
    const parsed = JSON.parse(fs.readFileSync('calWhisperThoughts.json'));
    if (Array.isArray(parsed.sessionThoughts)) thoughts = parsed;
  }
} catch (e) {
  console.warn('⚠️ Mirror tracer hit an error:', e.message);
}

console.log(`🪞 Cal Mirror Report:
Commands: ${trace.length}
Delta Files: ${delta.delta.length}
Reflections: ${thoughts.sessionThoughts.length}
Status: ${delta.delta.length === 0 ? '✅ Stable' : '⚠️ Drift Detected'}
`);
