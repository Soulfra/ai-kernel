
const fs = require('fs');

if (!fs.existsSync('./CalReflectionTrail.json')) {
  console.error('❌ No memory trail found.');
  process.exit(1);
}

const lines = fs.readFileSync('./CalReflectionTrail.json', 'utf8').split('\n').filter(Boolean);
const echo = lines.slice(-10).map(l => {
  try { return JSON.parse(l).text || ''; } catch { return ''; }
});

fs.writeFileSync('./core/echo_trail.txt', echo.join('\n'));
console.log('📣 Last 10 loop whispers echoed to /core/echo_trail.txt');
