/**
 * @file provider-router.js
 * @description Routes LLM calls to different providers based on agent config or environment variables.
 * Detects provider type per agent from .env or agent.yaml and logs usage into usage.json.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const usageFile = path.resolve(__dirname, '../../../usage.json');

class ProviderRouter {
  constructor() {}

  /**
   * Determine provider for an agent.
   * @param {string} agentName
   * @param {object} agentConfig
   * @returns {string}
   */
  getProvider(agentName, agentConfig = {}) {
    const envKey = `${agentName.toUpperCase().replace(/\W+/g, '_')}_PROVIDER`;
    return (
      process.env[envKey] ||
      agentConfig.provider ||
      process.env.PROVIDER ||
      'openai'
    );
  }

  /**
   * Log usage for an agent and provider.
   * @param {string} agent
   * @param {string} provider
   * @param {number} tokens
   */
  logUsage(agent, provider, tokens = 0) {
    const logs = fs.existsSync(usageFile)
      ? JSON.parse(fs.readFileSync(usageFile, 'utf8'))
      : [];
    logs.push({ agent, provider, tokens, timestamp: new Date().toISOString() });
    fs.writeFileSync(usageFile, JSON.stringify(logs, null, 2));
  }

  async callOpenAI(prompt, model = 'gpt-3.5-turbo') {
    const apiKey = process.env.OPENAI_API_KEY;
    const conf = new Configuration({ apiKey });
    const openai = new OpenAIApi(conf);
    const res = await openai.createChatCompletion({
      model,
      messages: [{ role: 'user', content: prompt }]
    });
    const text = res.data.choices[0].message.content.trim();
    const tokens = res.data.usage ? res.data.usage.total_tokens : 0;
    return { text, tokens };
  }

  async callAnthropic(prompt, model = 'claude-3-opus-20240229') {
    const key = process.env.CLAUDE_API_KEY;
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await res.json();
    const text =
      (data.content && data.content[0] && data.content[0].text) || '';
    const tokens = data.usage
      ? data.usage.input_tokens + data.usage.output_tokens
      : 0;
    return { text: text.trim(), tokens };
  }

  callLocal(prompt, model = 'llama2') {
    const proc = spawnSync('ollama', ['run', model], {
      input: prompt,
      encoding: 'utf8'
    });
    if (proc.error) throw proc.error;
    return { text: proc.stdout.trim(), tokens: 0 };
  }

  /**
   * Route a prompt to the appropriate provider.
   * @param {string} agentName
   * @param {string} prompt
   * @param {object} agentConfig
   * @param {object} options
   */
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
    this.logUsage(agentName, provider, result.tokens);
    return result.text;
  }
}

module.exports = { ProviderRouter };
