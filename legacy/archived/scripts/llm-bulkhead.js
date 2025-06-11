// LLM Bulkhead: Stateless, batched LLM calls for concept extraction/tagging
const { LLMCallManager } = require('./core/llm-bulkhead');

class LLMCallManagerBulkhead {
  constructor(apiKey, options = {}) {
    this.manager = new LLMCallManager(apiKey, options);
  }

  async callLLM(prompt, promptTemplateName, outputSchema, model = 'openai') {
    // Use the real LLMCallManager for all calls
    return await this.manager.callLLM(prompt, promptTemplateName, outputSchema, model);
  }

  async batchCallLLM(prompts, templateName, outputSchema, model = 'openai') {
    // Stateless, batched calls
    const results = [];
    for (const prompt of prompts) {
      const res = await this.callLLM(prompt, templateName, outputSchema, model);
      results.push(res);
    }
    return results;
  }
}

module.exports = { LLMCallManagerBulkhead };
// TODO: Add real LLM integration, logging, and error handling 