// Load secrets from vault
require('./load-secrets');
const { LLMRouter } = require('./core/llm-router');
const fs = require('fs');

(async () => {
  const router = new LLMRouter();
  // Load the real debug log as context
  const debugLog = fs.readFileSync('project_meta/debug_logs/DEBUG_LOG_jest_zzz-file-operations_discovery.md', 'utf8');
  const prompt = `Analyze the following debug log and suggest the most likely root cause and a concrete fix for the Jest test discovery issue.\n\nDEBUG LOG:\n${debugLog}`;

  // Single call: OpenAI
  const openaiResult = await router.routeLLMCall(prompt, { deepLogs: debugLog }, { requiredDepth: 'deep', taskType: 'debug', model: 'openai' });
  console.log('[OpenAI] Root cause and fix:', openaiResult.response || openaiResult.error);

  // Single call: Claude
  const claudeResult = await router.routeLLMCall(prompt, { deepLogs: debugLog }, { requiredDepth: 'deep', taskType: 'debug', model: 'claude' });
  console.log('[Claude] Root cause and fix:', claudeResult.response || claudeResult.error);

  // Fallback: Try OpenAI, then Claude if OpenAI fails
  const fallbackResult = await router.routeLLMCall(prompt, { deepLogs: debugLog }, { requiredDepth: 'deep', taskType: 'debug', fallback: true });
  console.log('[Fallback] Root cause and fix:', fallbackResult.response || fallbackResult.error);

  // Batch: Multiple prompts (OpenAI)
  const batchPrompts = [
    'Summarize the main problem in this debug log.\n\n' + debugLog,
    'List three possible causes for the Jest test discovery issue.\n\n' + debugLog,
    'Suggest a step-by-step fix for the Jest test discovery issue.\n\n' + debugLog
  ];
  const batchResults = await router.batchLLMCalls(batchPrompts, [
    { deepLogs: debugLog },
    { deepLogs: debugLog },
    { deepLogs: debugLog }
  ], { requiredDepth: 'deep', taskType: 'debug', model: 'openai' });
  batchResults.forEach((res, i) => {
    console.log(`[Batch OpenAI ${i + 1}]`, res.response || res.error);
  });
})(); 