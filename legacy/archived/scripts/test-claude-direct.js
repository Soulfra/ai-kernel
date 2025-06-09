require('./load-secrets');
let anthropic;
try { anthropic = require('anthropic'); } catch (e) { anthropic = null; }
(async () => {
  const key = process.env.CLAUDE_API_KEY || process.env.claude_key;
  if (!key) return console.error('No CLAUDE_API_KEY found.');
  if (!anthropic) return console.error('Anthropic package not installed.');
  try {
    const client = new anthropic({ apiKey: key });
    const res = await client.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 128,
      messages: [{ role: 'user', content: 'Say hello world.' }]
    });
    console.log('Claude response:', res.content[0].text || res.content);
  } catch (e) {
    console.error('Claude error:', e.response?.data || e.message);
  }
  process.exit(0);
})(); 