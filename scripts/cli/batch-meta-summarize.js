// @agent: diagnostics
// @orchestrator: recovery
// @origin: legacy-rescue
require('../core/load-secrets');
const { LLMRouter } = require('../orchestration/llm-router');
const fs = require('fs');
const path = require('path');

const DOC_PATHS = [
  'README.md',
  'docs/hand-off/SOULFRA_STANDARD_HANDOFF.md',
  'docs/soulfra/products/llm-router.md',
  'project_meta/suggestion_log.md',
  // Add more key docs as needed
];

const args = process.argv.slice(2);
const ciMode = args.includes('--ci');
const { logDebug } = require('../orchestration/diagnostics');
function handleError(step, err) {
  const msg = `Batch Meta-Summarize Error in ${step}: ${err.message}`;
  fs.appendFileSync('project_meta/suggestion_log.md', `\n[${new Date().toISOString()}] ${msg}\n`);
  logDebug(msg + '\n' + (err.stack || ''));
  if (ciMode) process.exit(1);
}

function safeRead(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (e) {
    return '';
  }
}

(async () => {
  try {
    const router = new LLMRouter();
    const docs = DOC_PATHS.map(p => ({ path: p, content: safeRead(p) }));
    const insightsDir = 'project_meta/insights';
    if (!fs.existsSync(insightsDir)) fs.mkdirSync(insightsDir, { recursive: true });

    // 1. File-level multi-turn chunked conversations
    for (const doc of docs) {
      const turns = [
        { prompt: `You are the Soulfra Engine. Analyze the following documentation file and suggest improvements, missing sections, or next steps.\n\nFILE: ${doc.path}\n\nCONTENT:\n${doc.content}` },
        { prompt: `What additional information or context would help improve or complete this file?\n\nFILE: ${doc.path}` },
        { prompt: `If you were to rewrite or refactor this file for maximum clarity and compliance, what would you change?\n\nFILE: ${doc.path}` },
      ];
      const convo = await router.multiTurnChunkedConversation(turns, { requiredDepth: 'deep', fallback: true });
      const outPath = path.join(insightsDir, path.basename(doc.path) + '.multi-turn.md');
      fs.writeFileSync(outPath, `# Multi-Turn Insights for ${doc.path}\n\n## Conversation:\n${convo.conversation.map((r, i) => `Turn ${i+1}: ${r.response || r.error}`).join('\n\n')}\n\n## Summary:\n${convo.summary.response || convo.summary.error}`);
    }

    // 2. System-level multi-turn chunked conversation
    const systemTurns = [
      { prompt: `You are the Soulfra Engine. Based on the following documentation and logs, summarize in detail:\n- What is this system building?\n- What is its architecture and vision?\n- What are its unique features and standards?\n- What are the next steps or missing pieces?\n\n` + docs.map(doc => `FILE: ${doc.path}\n${doc.content.substring(0, 2000)}`).join('\n\n') },
      { prompt: `What are the biggest risks or gaps in the current system, and how could they be addressed?` },
      { prompt: `If you were to design the next major version of this system, what would you prioritize and why?` },
    ];
    const systemConvo = await router.multiTurnChunkedConversation(systemTurns, { requiredDepth: 'deep', fallback: true });
    const systemOutPath = path.join(insightsDir, 'system_multi-turn_summary.md');
    fs.writeFileSync(systemOutPath, `# Soulfra Engine System Multi-Turn Summary\n\n## Conversation:\n${systemConvo.conversation.map((r, i) => `Turn ${i+1}: ${r.response || r.error}`).join('\n\n')}\n\n## Summary:\n${systemConvo.summary.response || systemConvo.summary.error}`);

    // 3. Read the summary, send it back to the LLM for further reflection
    const summaryText = systemConvo.summary.response || systemConvo.summary.error;
    const reflectionPrompt = `Reflect on the following system summary and suggest the most important next actions, improvements, or architectural changes.\n\nSYSTEM SUMMARY:\n${summaryText}`;
    const reflection = await router.routeLLMCall(reflectionPrompt, {}, { requiredDepth: 'deep', fallback: true });
    const reflectionOutPath = path.join(insightsDir, 'system_reflection.md');
    fs.writeFileSync(reflectionOutPath, `# Soulfra Engine System Reflection\n\n${reflection.response || reflection.error}`);

    // 4. Log actions and errors
    const logPath = path.join(insightsDir, 'batch-meta-summarize.log');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] Batch meta-summarization (multi-turn+reflection) complete.\n`);

    // 5. Note any gaps in suggestion log
    if (!systemConvo.summary.success || systemConvo.conversation.some(r => !r.success) || !reflection.success) {
      const enhancement = `\n[${new Date().toISOString()}] Batch Meta-Summarize Multi-Turn+Reflection Gaps:\n` +
        (!systemConvo.summary.success ? `[System Multi-Turn Summary] ${systemConvo.summary.error}\n` : '') +
        systemConvo.conversation.map((r, i) => !r.success ? `[System Turn ${i+1}] ${r.error}` : '').filter(Boolean).join('\n') +
        (!reflection.success ? `\n[System Reflection] ${reflection.error}` : '');
      fs.appendFileSync('project_meta/suggestion_log.md', enhancement + '\n');
      console.log('Enhancements/gaps noted in project_meta/suggestion_log.md');
    }

    // 6. Cluster and summarize suggestion log, health history, and compliance reports
    const suggestionLogPath = 'project_meta/suggestion_log.md';
    const healthLogPath = 'project_meta/insights/llm_health_history.log';
    const complianceDir = 'reports/compliance';
    const lessonsOutPath = 'project_meta/insights/lessons_learned.md';

    const suggestionLog = safeRead(suggestionLogPath);
    const healthLog = safeRead(healthLogPath);
    let complianceReports = [];
    if (fs.existsSync(complianceDir)) {
      complianceReports = fs.readdirSync(complianceDir)
        .filter(f => f.endsWith('.json'))
        .map(f => safeRead(path.join(complianceDir, f)));
    }

    const clusterPrompt = `You are the Soulfra Engine. Analyze the following logs and reports. Cluster recurring gaps, root causes, and successful remediations. Output a lessons learned summary with actionable recommendations.\n\nSUGGESTION LOG:\n${suggestionLog.substring(0, 8000)}\n\nHEALTH HISTORY:\n${healthLog.substring(0, 4000)}\n\nCOMPLIANCE REPORTS:\n${complianceReports.map(r => r.substring(0, 2000)).join('\n---\n')}`;

    // 7. Lessons learned summarization
    const lessons = await router.routeLLMCall(clusterPrompt, {}, { requiredDepth: 'deep', model: 'openai' });
    fs.writeFileSync(lessonsOutPath, `# Lessons Learned (Auto-Generated)\n\n${lessons.response || lessons.error}`);
    // 8. Auto-update onboarding/troubleshooting docs
    const onboardingPath = 'docs/hand-off/SOULFRA_STANDARD_HANDOFF.md';
    const troubleshootingPath = 'README.md';
    const lessonsSection = `\n\n## Latest Lessons Learned\n\n${lessons.response || lessons.error}\n`;
    if (fs.existsSync(onboardingPath)) {
      fs.appendFileSync(onboardingPath, lessonsSection);
    }
    if (fs.existsSync(troubleshootingPath)) {
      fs.appendFileSync(troubleshootingPath, lessonsSection);
    }

    // 9. Generate system state dashboard and checklists
    const dashboardPath = 'project_meta/insights/system_state_dashboard.md';
    const handoffChecklistPath = 'project_meta/insights/handoff_checklist.md';
    const recoveryChecklistPath = 'project_meta/insights/recovery_checklist.md';

    const orchestratorHealth = safeRead('scripts/pipeline-status.json') || '{}';
    const lastBackup = safeRead('project_meta/insights/llm_health_history.log').split('\n').reverse().find(l => l.includes('PASS') || l.includes('FAIL')) || 'No backup found.';
    const openTodos = (suggestionLog.match(/\[\s*\]/g) || []).length;

    const dashboardContent = `# System State Dashboard (Auto-Generated)

- **Orchestrator Health:**

	n${orchestratorHealth}
- **Compliance & Backup Status:**

	Last backup/health: ${lastBackup}
- **Surfaced Gaps & Lessons Learned:**

	See [lessons_learned.md](lessons_learned.md) and [suggestion_log.md](../suggestion_log.md)
- **Open TODOs:** ${openTodos}
- **Remediation Links:**

	See onboarding, handoff, and troubleshooting docs for step-by-step fixes.
`;

    fs.writeFileSync(dashboardPath, dashboardContent);

    const handoffChecklist = `# Handoff Checklist (Auto-Generated)

- [ ] All orchestrators present and healthy
- [ ] Compliance and backup status reviewed
- [ ] All surfaced gaps addressed or assigned
- [ ] Lessons learned reviewed and docs updated
- [ ] Backup and recovery simulation completed
- [ ] System state dashboard reviewed
`;
    fs.writeFileSync(handoffChecklistPath, handoffChecklist);

    const recoveryChecklist = `# Recovery Checklist (Auto-Generated)

- [ ] Latest backup available and tested
- [ ] Restore process validated
- [ ] All surfaced gaps and TODOs reviewed post-restore
- [ ] Lessons learned and docs updated after recovery
- [ ] System state dashboard and handoff checklist reviewed
`;
    fs.writeFileSync(recoveryChecklistPath, recoveryChecklist);

    // 10. Update onboarding/handoff docs with links
    const dashboardLinks = `\n- [System State Dashboard](../project_meta/insights/system_state_dashboard.md)\n- [Handoff Checklist](../project_meta/insights/handoff_checklist.md)\n- [Recovery Checklist](../project_meta/insights/recovery_checklist.md)\n`;
    if (fs.existsSync(onboardingPath)) {
      fs.appendFileSync(onboardingPath, '\n\n## System Dashboards & Checklists\n' + dashboardLinks);
    }
    if (fs.existsSync(troubleshootingPath)) {
      fs.appendFileSync(troubleshootingPath, '\n\n## System Dashboards & Checklists\n' + dashboardLinks);
    }

    console.log('Batch meta-summarization (multi-turn+reflection) complete. See project_meta/insights/.');
    process.exit(0);
  } catch (err) {
    handleError('main', err);
  }
})(); 
