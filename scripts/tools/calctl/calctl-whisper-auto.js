
const fs = require('fs');

const traceFile = './CalTrustTrace.json';
const whisperLog = './calWhisperAuto.json';

if (!fs.existsSync(traceFile)) {
  console.log('No trace file found. Skipping auto reflection.');
  process.exit(0);
}

const trace = JSON.parse(fs.readFileSync(traceFile));
const reflections = trace.traceLogs.slice(-5).map(t => {
  return t.status !== 'pass'
    ? `💥 Loop failure: ${t.cmd} → ${t.reason}`
    : `✅ Loop success: ${t.cmd}`;
});

const out = {
  timestamp: new Date().toISOString(),
  source: 'auto-reflector',
  reflections
};

fs.writeFileSync(whisperLog, JSON.stringify(out, null, 2));
console.log('🪶 Auto whisper reflections saved to calWhisperAuto.json');
