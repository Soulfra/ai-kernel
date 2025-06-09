// Every daemon should include this at end of file
const fs = require('fs');
const path = require('path');
const echoPath = path.join(__dirname, '../core/last_echo.txt');

fs.writeFileSync(echoPath, Date.now().toString());
console.log("✅ Agent echo committed.");
