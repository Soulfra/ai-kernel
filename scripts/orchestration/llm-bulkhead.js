// @agent: diagnostics
// @orchestrator: recovery
// @origin: legacy-rescue
const axios = require('axios');
let anthropic;
try { anthropic = require('anthropic'); } catch (e) { anthropic = null; }
const LogOrchestrator = require('./log-orchestrator');

class LLMCallManager {
  constructor(apiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY, options = {}) {
    this.logger = new LogOrchestrator();
    if (!apiKey) {
      this.logger.error('Missing LLM API key. Please set OPENAI_API_KEY or LLM_API_KEY in your .env or vault.');
      throw new Error('Missing LLM API key. Please set OPENAI_API_KEY or LLM_API_KEY in your .env or vault.');
    }
    this.apiKey = apiKey;
    this.options = options;
    this.claudeKey = process.env.CLAUDE_API_KEY || process.env.claude_key;
    this.anthropicClient = anthropic && this.claudeKey ? new anthropic({ apiKey: this.claudeKey }) : null;
  }

  logSuggestion(message) {
    const fs = require('fs');
    const logPath = 'project_meta/suggestion_log.md';
    const entry = `\n[${new Date().toISOString()}] ${message}`;
    fs.appendFileSync(logPath, entry + '\n');
  }

  /**
   * Calls the OpenAI API with a prompt and returns the response.
   * @param {string} prompt - The user prompt to send to the LLM.
   * @param {string} [promptTemplateName] - Optional template name (unused for now).
   * @param {object} [outputSchema] - Optional output schema (unused for now).
   * @returns {Promise<string>} - The LLM's response.
   */
  async callOpenAI(prompt, promptTemplateName = 'default', outputSchema = {}) {
    if (!this.apiKey) {
      const msg = 'Missing OpenAI API key. Set OPENAI_API_KEY in .env.';
      this.logger.error(msg);
      this.logSuggestion(msg + ' Remediation: Add your OpenAI API key to .env.');
      throw new Error(msg);
    }
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: prompt }
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      if (!response.data.choices[0].message.content || response.data.choices[0].message.content.toLowerCase().includes('hello world')) {
        const msg = 'OpenAI returned a stub/fake response. Check API key and endpoint.';
        this.logger.error(msg);
        this.logSuggestion(msg + ' Remediation: Verify your OpenAI API key and network connectivity.');
        throw new Error(msg);
      }
      return response.data.choices[0].message.content;
    } catch (err) {
      const msg = `[LLMCallManager] OpenAI API error: ${err.message}`;
      this.logger.error(msg);
      this.logSuggestion(msg + ' Remediation: Check your OpenAI API key and internet connection.');
      throw new Error(msg);
    }
  }

  async callClaude(prompt, promptTemplateName = 'default', outputSchema = {}) {
    if (!this.anthropicClient) {
      const msg = 'LLMCallManager: STUB MODE for Claude. Anthropic client missing. Returning fake response. TODO: Fix.';
      this.logSuggestion(msg + ' Remediation: Install anthropic and set CLAUDE_API_KEY.');
      const fs = require('fs');
      fs.appendFileSync('project_meta/insights/llm_stub_dashboard.md', msg + '\n');
      return '[STUB] Fake Claude response';
    }
    try {
      const response = await this.anthropicClient.messages.create({
        model: 'claude-3-opus-20240229',
        max_tokens: 1024,
        messages: [
          { role: 'user', content: prompt }
        ]
      });
      if (!response.content[0].text || response.content[0].text.toLowerCase().includes('hello world')) {
        const msg = 'Claude returned a stub/fake response. Check API key and endpoint.';
        this.logger.error(msg);
        this.logSuggestion(msg + ' Remediation: Verify your Claude API key and network connectivity.');
        throw new Error(msg);
      }
      return response.content[0].text || response.content;
    } catch (err) {
      const msg = `[LLMCallManager] Claude API error: ${err.message}`;
      this.logger.error(msg);
      this.logSuggestion(msg + ' Remediation: Check your Claude API key and internet connection.');
      throw new Error(msg);
    }
  }

  async callLLM(prompt, promptTemplateName = 'default', outputSchema = {}, model = 'openai') {
    if (model === 'claude') {
      return this.callClaude(prompt, promptTemplateName, outputSchema);
    }
    return this.callOpenAI(prompt, promptTemplateName, outputSchema);
  }

  // ... rest of the code remains unchanged ...
}

module.exports = { LLMCallManager }; 
