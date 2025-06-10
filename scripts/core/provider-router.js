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
let usageFile = path.join(repoRoot, 'usage.json');
let activityFile = path.join(repoRoot, 'logs', 'provider-activity.json');
if (process.env.KERNEL_USER) {
  const vaultBase = path.join(repoRoot, 'vault', process.env.KERNEL_USER);
  usageFile = path.join(vaultBase, 'usage.json');
  activityFile = usageFile;
}
const fallbackHistoryFile = path.join(repoRoot, 'logs', 'provider-fallback-history.json');

// Hosted fallback keys used when USE_BYOK is not true
const hostedOpenAIKey = 'hosted-openai-key';
const hostedClaudeKey = 'hosted-claude-key';

// Load environment variables
if (process.env.USE_BYOK === 'true' && process.env.KERNEL_USER) {
  const byokPath = path.join(repoRoot, 'vault', process.env.KERNEL_USER, 'env.json');
  if (fs.existsSync(byokPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(byokPath, 'utf8'));
      Object.entries(data).forEach(([k, v]) => { if (!process.env[k]) process.env[k] = v; });
    } catch {}
  }
}
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
} else if (fs.existsSync(keyPath)) {
  try {
    const data = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    Object.entries(data).forEach(([k, v]) => { if (!process.env[k]) process.env[k] = v; });
  } catch {}
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

  getOpenAIKey() {
    if (process.env.USE_BYOK === 'true') {
      return process.env.OPENAI_API_KEY;
    }
    return hostedOpenAIKey;
  }

  getClaudeKey() {
    if (process.env.USE_BYOK === 'true') {
      return process.env.CLAUDE_API_KEY;
    }
    return hostedClaudeKey;
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

  logActivity(agent, provider, model, endpoint, keySource) {
    const entry = {
      timestamp: new Date().toISOString(),
      agent,
      provider,
      model,
      endpoint,
      keySource
    };
    let arr = [];
    if (fs.existsSync(activityFile)) {
      try { arr = JSON.parse(fs.readFileSync(activityFile, 'utf8')); } catch {}
    }
    arr.push(entry);
    fs.writeFileSync(activityFile, JSON.stringify(arr, null, 2));
  }

  async callOpenAI(prompt, model = 'gpt-3.5-turbo', endpoint = 'https://api.openai.com/v1/chat/completions', key = this.getOpenAIKey()) {
    const body = {
      model,
      messages: [{ role: 'user', content: prompt }]
    };
    const res = await fetch(endpoint, {
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
    return { text: text.trim(), model, endpoint };
  }

  async callAnthropic(prompt, model = 'claude-3-opus-20240229') {
    const key = this.getClaudeKey();
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

  async callDeepSeek(prompt, model = 'deepseek-chat') {
    const key = process.env.DEEPSEEK_API_KEY;
    const body = {
      model,
      messages: [{ role: 'user', content: prompt }]
    };
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
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
    return { text: text.trim(), model, endpoint: 'https://api.deepseek.com/v1/chat/completions' };
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
    const requested = options.provider || this.getProvider(agentName, agentConfig);
    const history = [];
    let provider = requested;
    let result = null;

    const tryOpenAI = async () => {
      if (process.env.OPENAI_API_KEY) {
        history.push('openai');
        provider = 'openai';
        return this.callOpenAI(prompt, options.model);
      }
      return null;
    };

    const tryOpenRouter = async () => {
      if (process.env.OPENROUTER_API_KEY) {
        history.push('openrouter');
        provider = 'openrouter';
        return this.callOpenAI(
          prompt,
          options.model,
          'https://openrouter.ai/api/v1/chat/completions',
          process.env.OPENROUTER_API_KEY
        );
      }
      return null;
    };

    const tryClaude = async () => {
      if (process.env.CLAUDE_API_KEY) {
        history.push('claude');
        provider = 'claude';
        return this.callAnthropic(prompt, options.model);
      }
      return null;
    };

    const tryDeepSeek = async () => {
      if (process.env.DEEPSEEK_API_KEY) {
        history.push('deepseek');
        provider = 'deepseek';
        return this.callDeepSeek(prompt, options.model);
      }
      return null;
    };

    const tryLocal = () => {
      if (process.env.OLLAMA_MODEL) {
        history.push('local');
        provider = 'local';
        return this.callLocal(prompt, process.env.OLLAMA_MODEL);
      }
      return null;
    };

    if (requested === 'local') result = tryLocal();
    else if (requested === 'claude') result = await tryClaude();
    else if (requested === 'deepseek') result = await tryDeepSeek();
    else result = await tryOpenAI();

    if (!result) result = await tryOpenRouter();
    if (!result && requested !== 'claude') result = await tryClaude();
    if (!result && requested !== 'deepseek') result = await tryDeepSeek();
    if (!result && requested !== 'local') result = tryLocal();

    if (!result) {
      history.push('simulate');
      provider = 'none';
      result = {
        text: JSON.stringify({ llm_output: 'SIMULATED OUTPUT', tokens: 0, provider: 'none' }),
        model: 'simulation',
        endpoint: 'simulation'
      };
    }

    this.logUsage(agentName, provider, result.model, result.endpoint);
    const keySource = provider === 'local' || provider === 'none' ? 'n/a' : (process.env.USE_BYOK === 'true' ? 'byok' : 'hosted');
    this.logActivity(agentName, provider, result.model, result.endpoint, keySource);
    try {
      let arr = [];
      if (fs.existsSync(fallbackHistoryFile)) {
        arr = JSON.parse(fs.readFileSync(fallbackHistoryFile, 'utf8'));
      }
      arr.push({ timestamp: new Date().toISOString(), agent: agentName, requested, path: history });
      fs.writeFileSync(fallbackHistoryFile, JSON.stringify(arr, null, 2));
    } catch {}

    return result.text;
  }
}

module.exports = { ProviderRouter };
