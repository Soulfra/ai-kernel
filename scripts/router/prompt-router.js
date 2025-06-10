#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { ensureUser, loadTokens, saveTokens, logUsage, getVaultPath } = require('../core/user-vault');
const argv = require('yargs/yargs')(process.argv.slice(2))
  .usage('Usage: $0 <prompt> [options]')
  .option('tier', { alias: 't', choices: ['simulated', 'fast', 'deep', 'async'], default: 'fast' })
  .option('idea', { alias: 'i', type: 'string' })
  .option('snapshot', { alias: 's', type: 'string' })
  .option('user', { alias: 'u', type: 'string', default: 'default' })
  .help()
  .argv;

const prompt = argv._[0];
if (!prompt) {
  console.log('Prompt required');
  process.exit(1);
}

const user = argv.user;
ensureUser(user);

function readFile(fp) {
  if (!fp) return null;
  try {
    return fs.readFileSync(fp, 'utf8');
  } catch {
    return null;
  }
}

const idea = argv.idea ? readFile(argv.idea) : null;
const snapshot = argv.snapshot ? readFile(argv.snapshot) : null;

const tier = argv.tier;
const costMap = { simulated: 0, fast: 1, deep: 3, async: 2 };
const cost = costMap[tier] || 0;
let tokens = loadTokens(user);
if (tokens < cost) {
  console.error(`Insufficient tokens: ${tokens}`);
  process.exit(1);
}
saveTokens(user, tokens - cost);

const logPath = path.join(__dirname, '..', '..', 'logs', 'prompt-routing-log.json');
let logs = [];
if (fs.existsSync(logPath)) {
  try { logs = JSON.parse(fs.readFileSync(logPath, 'utf8')); } catch {}
}
const entry = {
  timestamp: new Date().toISOString(),
  user,
  tier,
  prompt,
  idea: argv.idea ? path.basename(argv.idea) : null,
  snapshot: argv.snapshot ? path.basename(argv.snapshot) : null,
  cost
};
logs.push(entry);
fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
logUsage(user, entry);

if (tier === 'fast' || tier === 'simulated') {
  console.log(`[fast] Echo: ${prompt}`);
  process.exit(0);
}

// async / deep
const jobId = Date.now().toString();
const jobDir = path.join(getVaultPath(user), 'jobs');
fs.mkdirSync(jobDir, { recursive: true });
const jobFile = path.join(jobDir, `${jobId}.json`);
fs.writeFileSync(jobFile, JSON.stringify({ id: jobId, status: 'queued', prompt, tier }, null, 2));

const docsDir = path.join(__dirname, '..', '..', 'docs', 'jobs');
fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(path.join(docsDir, `${jobId}.md`), `# Job ${jobId}\n\nPrompt queued: ${prompt}\n`);
console.log(`Queued job ${jobId}`);
