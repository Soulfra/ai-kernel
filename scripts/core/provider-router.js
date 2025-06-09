/**
 * ProviderRouter
 *
 * Routes prompts to different LLM providers based on agent configuration
 * and environment variables. Supports OpenAI, Anthropic and local models.
 * API keys are loaded from `.env` or `.kernelkeys` if present but are never
 * logged or exposed. Each routed call is logged to `usage.json` with the
 * provider, model and endpoint used.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..', '..');
const envPath = path.join(repoRoot, '.env');
const keyPath = path.join(repoRoot, '.kernelkeys');
const usageFile = path.join(repoRoot, 'usage.json');

// Load environment variables from .env or .kernelkeys
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
} else if (fs.existsSync(keyPath)) {
  try {
    const data = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    Object.entries(data).forEach(([k, v]) => {
      if (!process.env[k]) process.env[k] = v;
    });
  } catch {
    // ignore parse errors
  }
}

class ProviderRouter {
  getProvider(agentName, agentConfig = {}) {
    const envKey = `${agentName.toUpperCase().replace(/\W+/g, '_')}_PROVIDER`;
    return (
      agentConfig.provider ||
      process.env[envKey] ||
      process.env.PROVIDER ||
      'openai'
    );
  }

  logUsage(agent, provider, model, endpoint) {
    const entry = {
      timestamp: new Date().toISOString(),
      agent,
      provider,
      model,
      endpoint
    };
    let logs = [];
    if (fs.existsSync(usageFile)) {
      try { logs = JSON.parse(fs.readFileSync(usageFile, 'utf8')); } catch {}
    }
    logs.push(entry);
    fs.writeFileSync(usageFile, JSON.stringify(logs, null, 2));
  }

  async callOpenAI(prompt, model = 'gpt-3.5-turbo') {
    const key = process.env.OPENAI_API_KEY;
    const body = {
      model,
      messages: [{ role: 'user', content: prompt }]
    };
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${key}`
      },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    const text =
      (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) ||
      '';
    return { text: text.trim(), model, endpoint: 'https://api.openai.com/v1/chat/completions' };
  }

  async callAnthropic(prompt, model = 'claude-3-opus-20240229') {
    const key = process.env.CLAUDE_API_KEY;
    const body = {
      model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    };
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    const text = (data.content && data.content[0] && data.content[0].text) || '';
    return { text: text.trim(), model, endpoint: 'https://api.anthropic.com/v1/messages' };
  }

  callLocal(prompt, model = 'llama2') {
    const proc = spawnSync('ollama', ['run', model], {
      input: prompt,
      encoding: 'utf8'
    });
    if (proc.error) throw proc.error;
    return { text: proc.stdout.trim(), model, endpoint: `ollama run ${model}` };
  }

  async route(agentName, prompt, agentConfig = {}, options = {}) {
    const provider = this.getProvider(agentName, agentConfig);
    let result;
    if (provider === 'anthropic') {
      result = await this.callAnthropic(prompt, options.model);
    } else if (provider === 'local') {
      result = this.callLocal(prompt, options.model);
    } else {
      result = await this.callOpenAI(prompt, options.model);
    }
    this.logUsage(agentName, provider, result.model, result.endpoint);
    return result.text;
  }
}

module.exports = { ProviderRouter };
