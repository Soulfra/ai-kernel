## [decision] in scripts/audit/trace-decisions.js
const outputFile = path.join(repoRoot, 'docs', 'decision-trace.md');
➤ Suggested: capture in architecture docs

## [undocumented] in scripts/audit/trace-decisions.js
function scanFile(filePath) {
➤ Suggested: add description

## [TODO] in scripts/audit/trace-decisions.js
if (lower.includes('todo')) {
➤ Suggested: address TODO

## [TODO] in scripts/audit/trace-decisions.js
type: 'TODO',
➤ Suggested: address TODO

## [TODO] in scripts/audit/trace-decisions.js
action: 'address TODO'
➤ Suggested: address TODO

## [decision] in scripts/audit/trace-decisions.js
if (lower.includes('decision') || lower.includes('design note') || lower.startsWith('commit')) {
➤ Suggested: capture in architecture docs

## [decision] in scripts/audit/trace-decisions.js
type: 'decision',
➤ Suggested: capture in architecture docs

## [undocumented] in scripts/audit/trace-decisions.js
function walkDir(dir) {
➤ Suggested: add description

## [decision] in scripts/audit/trace-decisions.js
console.log(`Decision trace written to ${outputFile}`);
➤ Suggested: capture in architecture docs

## [undocumented] in scripts/core/backup-dashboard.js
function color(str, code) { return `\x1b[${code}m${str}\x1b[0m`; }
➤ Suggested: add description

## [undocumented] in scripts/core/backup-dashboard.js
function green(str) { return color(str, 32); }
➤ Suggested: add description

## [undocumented] in scripts/core/backup-dashboard.js
function red(str) { return color(str, 31); }
➤ Suggested: add description

## [undocumented] in scripts/core/backup-dashboard.js
function badge(ok) { return ok ? green('✅') : red('❌'); }
➤ Suggested: add description

## [question] in scripts/core/backup-health-check.js
// Scans backups/, verifies manifests and reports, prints health summary.
➤ Suggested: add explanation

## [undocumented] in scripts/core/backup-orchestrator.js
function getUser() {
➤ Suggested: add description

## [undocumented] in scripts/core/backup-orchestrator.js
function hashManifest(manifest) {
➤ Suggested: add description

## [undocumented] in scripts/core/backup-orchestrator.js
function postWebhook(url, data) {
➤ Suggested: add description

## [undocumented] in scripts/core/backup-orchestrator.js
function logAuditEvent(event) {
➤ Suggested: add description

## [undocumented] in scripts/core/backup-orchestrator.js
function logSuggestion(event) {
➤ Suggested: add description

## [question] in scripts/core/backup-orchestrator.js
// Write manifest
➤ Suggested: add explanation

## [question] in scripts/core/backup-orchestrator.js
// If BACKUP_WEBHOOK_URL is set, posts backup/restore events to that URL.
➤ Suggested: add explanation

## [question] in scripts/core/graph-store.js
// Verify connection
➤ Suggested: add explanation

## [question] in scripts/core/loop-route.js
// Loads JSON from the path specified by LOOP_ROUTE_PATH and exports it.
➤ Suggested: add explanation

## [undocumented] in scripts/core/loop-route.js
function loadLoopRoute() {
➤ Suggested: add description

## [undocumented] in scripts/docs/generate-agents-doc.js
function groupByType(agents) {
➤ Suggested: add description

## [undocumented] in scripts/docs/generate-agents-doc.js
function generate() {
➤ Suggested: add description

## [TODO] in scripts/features/chatlog-parser/README.md
description: Parses chat logs to extract ideas and TODOs and generates Markdown documentation.
➤ Suggested: address TODO

## [TODO] in scripts/features/chatlog-parser/README.md
for TODO items and bullet points, then creates docs with YAML frontmatter
➤ Suggested: address TODO

## [undocumented] in scripts/features/chatlog-parser/from-export.js
function parseJsonExport(obj) {
➤ Suggested: add description

## [undocumented] in scripts/features/chatlog-parser/from-export.js
function parseHtmlExport(html) {
➤ Suggested: add description

## [TODO] in scripts/features/chatlog-parser/index.js
* Parses chat logs to extract TODOs and bullet points.
➤ Suggested: address TODO

## [undocumented] in scripts/features/chatlog-parser/index.js
function parseChatlog(content) {
➤ Suggested: add description

## [TODO] in scripts/features/chatlog-parser/index.js
return lines.filter(l => l.match(/^(TODO:|[-*] )/i));
➤ Suggested: address TODO

## [undocumented] in scripts/features/chatlog-parser/index.js
function generateDoc(ideas, sourceFile) {
➤ Suggested: add description

## [TODO] in scripts/features/chatlog-parser/index.js
'description: Ideas and TODOs extracted from chat logs.',
➤ Suggested: address TODO

## [TODO] in scripts/features/chatlog-parser/index.js
'# Ideas and TODOs',
➤ Suggested: address TODO

## [TODO] in scripts/features/chatlog-parser/index.js
...ideas.map(i => '- ' + i.replace(/^[-*] /, '').replace(/^TODO:/i, '').trim()),
➤ Suggested: address TODO

## [undocumented] in scripts/features/chatlog-utils.js
function parseChatLog(text) {
➤ Suggested: add description

## [undocumented] in scripts/features/chatlog-utils.js
function messagesToConcepts(messages) {
➤ Suggested: add description

## [undocumented] in scripts/features/cluster-utils.js
async function clusterConcepts(concepts, engine) {
➤ Suggested: add description

## [undocumented] in scripts/features/cluster-utils.js
function writeClusterSummary(engine, filePath) {
➤ Suggested: add description

## [undocumented] in scripts/features/generate-chat-summary.js
async function run() {
➤ Suggested: add description

## [undocumented] in scripts/features/import-chatlog.js
async function run() {
➤ Suggested: add description

## [undocumented] in scripts/features/link-sequential.js
async function linkSequential(concepts, engine) {
➤ Suggested: add description

## [question] in tests/core/backup-buildup.e2e.test.js
// After restore, verify all logs exist
➤ Suggested: add explanation

## [undocumented] in tests/core/backup-buildup.e2e.test.js
function hashFile(filePath) {
➤ Suggested: add description

## [TODO] in tests/features/chatlog-parser.test.js
test('extracts TODOs and bullet points', () => {
➤ Suggested: address TODO

## [TODO] in tests/features/chatlog-parser.test.js
const chat = 'Hello\nTODO: Refactor backup\n- Add tests\n* Document\nNot a todo';
➤ Suggested: address TODO

## [TODO] in tests/features/chatlog-parser.test.js
expect(ideas).toEqual(['TODO: Refactor backup', '- Add tests', '* Document']);
➤ Suggested: address TODO

## [TODO] in tests/features/chatlog-parser.test.js
const ideas = ['TODO: Refactor backup', '- Add tests'];
➤ Suggested: address TODO

## [TODO] in docs/agents.md
- **Description:** Parses chat logs to extract TODOs and bullet points
➤ Suggested: address TODO

## [question] in docs/architecture/agentic-orchestration.md
// Lifecycle
➤ Suggested: add explanation

## [undocumented] in docs/architecture/orchestration-agent.md
async function example() {
➤ Suggested: add description

## [question] in docs/architecture/system-overview.md
// Plugin Lifecycle
➤ Suggested: add explanation

## [TODO] in docs/examples/chatlog-parser.md
It scans for TODO items and bullet points, then creates files with YAML
➤ Suggested: address TODO

## [decision] in docs/standards/conversation-management.md
- Track key decisions
➤ Suggested: capture in architecture docs

## [decision] in docs/standards/conversation-management.md
decisions: Decision[];
➤ Suggested: capture in architecture docs

## [decision] in docs/standards/conversation-management.md
addDecision(decision: Decision): Promise<void>;
➤ Suggested: capture in architecture docs

## [decision] in docs/standards/conversation-management.md
decisions: Decision[];
➤ Suggested: capture in architecture docs

## [question] in docs/standards/development-workflow.md
// Artifact Management
➤ Suggested: add explanation

