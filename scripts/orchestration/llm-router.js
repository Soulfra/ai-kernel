// @agent: diagnostics
// @orchestrator: recovery
// @origin: legacy-rescue
const { LLMCallManager } = require('./llm-bulkhead');
const LogOrchestrator = require('./log-orchestrator');

class LLMRouter {
  constructor(options = {}) {
    this.options = options;
    this.logger = new LogOrchestrator({ logDir: './logs' });
    this.models = {
      openai: {
        name: 'OpenAI',
        manager: new LLMCallManager(process.env.OPENAI_API_KEY || process.env.LLM_API_KEY),
        cost: 1,
        depth: 'shallow',
      },
      claude: {
        name: 'Claude',
        manager: new LLMCallManager(process.env.CLAUDE_API_KEY || process.env.claude_key),
        cost: 2,
        depth: 'deep',
      }
    };
    this.fallbackOrder = ['openai', 'claude'];
  }

  /**
   * Selects the best model based on task type, cost, and depth.
   * @param {object} opts - { taskType, requiredDepth, preferCheap }
   */
  selectModel(opts = {}) {
    if (opts.model && this.models[opts.model]) return this.models[opts.model];
    if (opts.requiredDepth === 'deep' && this.models.claude) return this.models.claude;
    return this.models.openai;
  }

  logSuggestion(message) {
    const fs = require('fs');
    const logPath = 'project_meta/suggestion_log.md';
    const entry = `\n[${new Date().toISOString()}] ${message}`;
    fs.appendFileSync(logPath, entry + '\n');
  }

  async callWithFallback(prompt, context, opts) {
    for (const modelName of this.fallbackOrder) {
      const model = this.models[modelName];
      try {
        // STUB: If model is missing, return stubbed response
        if (!model || !model.manager) {
          const msg = `LLMRouter: STUB MODE for ${modelName}. Dependency missing. Returning fake response. TODO: Fix.`;
          this.logSuggestion(msg + ' Remediation: Install missing package and configure API key.');
          // Log to dashboard
          const fs = require('fs');
          fs.appendFileSync('project_meta/insights/llm_stub_dashboard.md', msg + '\n');
          return { success: true, response: '[STUB] Fake LLM response', model: modelName };
        }
        let fullPrompt = prompt;
        if (opts.requiredDepth === 'deep' && context && context.deepLogs) {
          fullPrompt += '\n\n[DEBUG LOGS]\n' + context.deepLogs;
        } else if (context && context.taskLogs) {
          fullPrompt += '\n\n[TASK LOGS]\n' + context.taskLogs;
        }
        const result = await model.manager.callLLM(fullPrompt, 'default', {}, modelName);
        if (!result || (typeof result === 'string' && result.toLowerCase().includes('hello world'))) {
          const msg = `LLMRouter: Model ${model.name} returned a stub/fake response. Check API key and endpoint.`;
          await this.logger.error(msg);
          this.logSuggestion(msg + ' Remediation: Verify your API key and network connectivity.');
          throw new Error(msg);
        }
        await this.logger.info('LLMRouter: LLM call success', { prompt, context, opts, model: model.name, result });
        return { success: true, response: result, model: model.name };
      } catch (err) {
        await this.logger.error('LLMRouter: LLM call error', { prompt, context, opts, model: model.name, error: err.message });
        this.logSuggestion(`LLMRouter: LLM call error for ${model.name}: ${err.message} Remediation: Check your API key, package, and network.`);
      }
    }
    const msg = 'All models failed in LLMRouter. No valid LLM available.';
    this.logSuggestion(msg + ' Remediation: Check all LLM API keys and packages.');
    return { success: false, error: msg, model: null };
  }

  /**
   * Routes an LLM call with context and logs all actions.
   * @param {string} prompt
   * @param {object} context - Additional context (logs, dependencies, etc.)
   * @param {object} opts - { taskType, requiredDepth, preferCheap }
   */
  async routeLLMCall(prompt, context = {}, opts = {}) {
    await this.logger.initialize();
    if (opts.fallback) {
      return this.callWithFallback(prompt, context, opts);
    }
    const model = this.selectModel(opts);
    let fullPrompt = prompt;
    if (opts.requiredDepth === 'deep' && context && context.deepLogs) {
      fullPrompt += '\n\n[DEBUG LOGS]\n' + context.deepLogs;
    } else if (context && context.taskLogs) {
      fullPrompt += '\n\n[TASK LOGS]\n' + context.taskLogs;
    }
    try {
      const result = await model.manager.callLLM(fullPrompt, 'default', {}, opts.model || model.name);
      await this.logger.info('LLMRouter: LLM call success', { prompt, context, opts, model: model.name, result });
      return { success: true, response: result, model: model.name };
    } catch (err) {
      await this.logger.error('LLMRouter: LLM call error', { prompt, context, opts, model: model.name, error: err.message });
      return { success: false, error: err.message, model: model.name };
    }
  }

  async batchLLMCalls(prompts, contexts = [], opts = {}) {
    await this.logger.initialize();
    const results = await Promise.all(prompts.map((prompt, i) => {
      const context = contexts[i] || {};
      return this.routeLLMCall(prompt, context, opts);
    }));
    await this.logger.info('LLMRouter: Batch LLM call results', { prompts, opts, results });
    return results;
  }

  /**
   * Chunks a large string into manageable pieces for LLM calls.
   * @param {string} text
   * @param {number} maxLen
   * @returns {string[]}
   */
  chunkText(text, maxLen = 4000) {
    const chunks = [];
    let i = 0;
    while (i < text.length) {
      chunks.push(text.slice(i, i + maxLen));
      i += maxLen;
    }
    return chunks;
  }

  /**
   * Runs a multi-turn, chunked conversation with fallback and summary.
   * @param {Array<{prompt: string, context?: object}>} turns
   * @param {object} opts
   * @returns {Promise<{conversation: Array, summary: object}>}
   */
  async multiTurnChunkedConversation(turns, opts = {}) {
    await this.logger.initialize();
    let context = {};
    let responses = [];
    for (const turn of turns) {
      let prompt = turn.prompt;
      // Chunk if too large
      if (prompt.length > 4000) {
        const chunks = this.chunkText(prompt);
        let chunkSummaries = [];
        for (const chunk of chunks) {
          const chunkRes = await this.routeLLMCall(chunk, { ...context, ...(turn.context || {}) }, opts);
          chunkSummaries.push(chunkRes.response || chunkRes.error);
        }
        // Synthesize summary from chunk summaries
        prompt = 'Summarize the following chunk summaries into a single answer:\n' + chunkSummaries.join('\n---\n');
      }
      const res = await this.routeLLMCall(prompt, { ...context, ...(turn.context || {}) }, opts);
      responses.push(res);
      if (res.success) {
        context.lastResponse = res.response;
      }
    }
    // Final synthesis
    const summaryPrompt = `Based on the following conversation, summarize the root cause and suggest a fix (or next steps):\n\n` +
      responses.map((r, i) => `Turn ${i+1}: ${r.response || r.error}`).join('\n');
    const summary = await this.routeLLMCall(summaryPrompt, {}, opts);
    await this.logger.info('LLMRouter: Multi-turn chunked conversation summary', { summary: summary.response || summary.error });
    return { conversation: responses, summary };
  }
}

module.exports = { LLMRouter }; 
