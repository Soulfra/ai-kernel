const fs = require('fs');
const path = require('path');

const targetFile = process.argv[2];
if (!targetFile) {
  console.error('Usage: node redact-secrets.js <file-path>');
  process.exit(1);
}

const fullPath = path.resolve(targetFile);
if (!fs.existsSync(fullPath)) {
  console.error(`File not found: ${fullPath}`);
  process.exit(1);
}

let content = fs.readFileSync(fullPath, 'utf8');

// Redact anything that looks like a token or API key
content = content
  .replace(/(sk-[a-zA-Z0-9]{32,})/g, '"REDACTED_OPENAI_KEY"')
  .replace(/(sk-ant-[a-zA-Z0-9]{32,})/g, '"REDACTED_ANTHROPIC_KEY"')
  .replace(/ghp_[a-zA-Z0-9]{36,}/g, '"REDACTED_GITHUB_PAT"')
  .replace(/"apiKey":\s*".+?"/g, '"apiKey": "REDACTED"')
  .replace(/"access_token":\s*".+?"/g, '"access_token": "REDACTED"')
  .replace(/"Authorization":\s*".+?"/g, '"Authorization": "REDACTED"');

fs.writeFileSync(fullPath, content, 'utf8');
console.log(`[✓] Redacted secrets in ${targetFile}`);