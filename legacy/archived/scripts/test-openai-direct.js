require('./load-secrets');
const axios = require('axios');
(async () => {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return console.error('No OPENAI_API_KEY found.');
  try {
    const res = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Say hello world.' }]
      },
      { headers: { Authorization: `Bearer ${key}` } }
    );
    console.log('OpenAI response:', res.data.choices[0].message.content);
  } catch (e) {
    console.error('OpenAI error:', e.response?.data || e.message);
  }
  process.exit(0);
})(); 