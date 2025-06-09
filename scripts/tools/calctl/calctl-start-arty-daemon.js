
const { exec } = require('child_process');

exec('node calNode-ArtyDaemon.js', (err, stdout, stderr) => {
  if (err) {
    console.error('❌ Failed to run ArtyDaemon:', err.message);
    return;
  }
  console.log(stdout);
});
