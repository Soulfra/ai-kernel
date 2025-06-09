
const fs = require('fs');

if (!fs.existsSync('CalTrustTrace.json')) {
  console.error('❌ No CalTrustTrace.json found.');
  process.exit(1);
}

const trace = JSON.parse(fs.readFileSync('CalTrustTrace.json'));
console.log(`🧠 Backtrace — Last Command: ${trace.lastCommand || 'unknown'}`);
console.log(`Status: ${trace.crashed ? '❌ Crash' : '✅ OK'}`);
console.log('Logs:');
trace.traceLogs.slice(-5).forEach(log => {
  console.log(` - ${log.timestamp} | ${log.cmd} → ${log.status.toUpperCase()}${log.reason ? ' — ' + log.reason : ''}`);
});
