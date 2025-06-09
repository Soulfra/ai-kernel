// @agent: diagnostics
// @orchestrator: recovery
// @origin: legacy-rescue
const fs = require('fs');
const path = require('path');

const secretsPath = path.join(__dirname, '../vault/env/PromptVaultSecrets.json');
if (fs.existsSync(secretsPath)) {
  const secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
  for (const [key, value] of Object.entries(secrets)) {
    if (value) process.env[key] = value;
  }
  // Map openai_key to OPENAI_API_KEY for compatibility
  if (secrets.openai_key) process.env.OPENAI_API_KEY = secrets.openai_key;
  if (secrets.claude_key) process.env.CLAUDE_API_KEY = secrets.claude_key;
} 
