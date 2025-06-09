// Manually injects a fresh echo timestamp
const fs = require('fs');
const path = require('path');
fs.writeFileSync(path.join(__dirname, '../core/last_echo.txt'), Date.now().toString());
console.log("✅ Echo injected manually for test.");
