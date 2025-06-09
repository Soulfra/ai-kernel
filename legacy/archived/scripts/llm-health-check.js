require('./load-secrets');
const { LLMRouter } = require('./core/llm-router');
const fs = require('fs');

function logSuggestion(message) {
  const logPath = 'project_meta/suggestion_log.md';
  const entry = `\n[${new Date().toISOString()}] ${message}`;
  fs.appendFileSync(logPath, entry + '\n');
}

const healthLogPath = 'project_meta/insights/llm_health_history.log';

(async () => {
  const router = new LLMRouter();
  const summary = [];
  let failures = 0;

  // 1. OpenAI call
  const openaiRes = await router.routeLLMCall('Say hello world.', {}, { model: 'openai' });
  summary.push({ test: 'OpenAI basic', result: openaiRes });
  if (!openaiRes.success || !openaiRes.response || openaiRes.response.toLowerCase().includes('hello world')) failures++;
  console.log('[OpenAI]', openaiRes.response || openaiRes.error);

  // 2. Claude call
  const claudeRes = await router.routeLLMCall('Say hello world.', {}, { model: 'claude' });
  summary.push({ test: 'Claude basic', result: claudeRes });
  if (!claudeRes.success || !claudeRes.response || claudeRes.response.toLowerCase().includes('hello world')) failures++;
  console.log('[Claude]', claudeRes.response || claudeRes.error);

  // 3. Fallback (simulate OpenAI fail by using invalid key)
  const oldKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'invalid-key';
  const fallbackRes = await router.routeLLMCall('Say hello world.', {}, { fallback: true });
  summary.push({ test: 'Fallback (OpenAI fail, Claude fallback)', result: fallbackRes });
  if (!fallbackRes.success || !fallbackRes.response) failures++;
  process.env.OPENAI_API_KEY = oldKey;
  console.log('[Fallback]', fallbackRes.response || fallbackRes.error);

  // 4. Deep context (debug log)
  let deepRes = { success: false, response: '', error: 'No debug log' };
  try {
    const debugLog = fs.readFileSync('project_meta/debug_logs/DEBUG_LOG_jest_zzz-file-operations_discovery.md', 'utf8');
    deepRes = await router.routeLLMCall('Summarize this debug log.', { deepLogs: debugLog }, { requiredDepth: 'deep', model: 'openai' });
    if (!deepRes.success || !deepRes.response) failures++;
    summary.push({ test: 'OpenAI deep context', result: deepRes });
    console.log('[OpenAI deep context]', deepRes.response || deepRes.error);
  } catch (e) {
    summary.push({ test: 'OpenAI deep context', result: deepRes });
    failures++;
    console.log('[OpenAI deep context]', deepRes.error);
  }

  // 5. Batch calls
  const batchPrompts = [
    'Summarize the main problem in this debug log.',
    'List three possible causes for the Jest test discovery issue.',
    'Suggest a step-by-step fix for the Jest test discovery issue.'
  ];
  let batchResults = [];
  try {
    batchResults = await router.batchLLMCalls(batchPrompts, [{}, {}, {}], { requiredDepth: 'deep', model: 'openai' });
    batchResults.forEach((res, i) => {
      if (!res.success || !res.response) failures++;
      console.log(`[Batch OpenAI ${i + 1}]`, res.response || res.error);
    });
  } catch (e) {
    failures += batchPrompts.length;
    batchResults.forEach((res, i) => {
      console.log(`[Batch OpenAI ${i + 1}]`, res.error);
    });
  }

  const status = failures > 0 ? 'FAIL' : 'PASS';
  const summaryLine = `[${new Date().toISOString()}] LLM Health Check: ${status} (${failures} failures)`;
  fs.appendFileSync(healthLogPath, summaryLine + '\n');
  if (failures > 0) {
    logSuggestion(`CRITICAL: LLM Health Check failed. Immediate remediation required. See health log and suggestion log for details.`);
  }

  if (failures > 0) {
    logSuggestion(`LLM Health Check FAILED: ${failures} failures. Remediation: Check API keys, packages, and network. See console output for details.`);
    console.error(`LLM Health Check FAILED: ${failures} failures.`);
    process.exit(1);
  } else {
    console.log('LLM Health Check PASSED.');
    process.exit(0);
  }
})(); 