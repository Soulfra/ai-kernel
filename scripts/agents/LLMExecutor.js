// @agent: diagnostics
// @orchestrator: recovery
// @origin: legacy-rescue

const https = require('https');
const fs = require('fs');

const keyPath = './vault/env/CalVaultSecrets.json';
if (!fs.existsSync(keyPath)) {
  console.error('❌ Missing API key config.');
  process.exit(1);
}

const { openai_key, default_model } = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

async function runLLM(prompt) {
  const payload = {
    model: default_model || "gpt-4",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7
  };

  const data = JSON.stringify(payload);

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openai_key}`,
        'Content-Length': data.length
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve(response.choices[0].message.content);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

module.exports = { runLLM };
