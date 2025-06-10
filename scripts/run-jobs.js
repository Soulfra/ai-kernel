const fs = require('fs');
const path = require('path');
const { ProviderRouter } = require('./core/provider-router');
const { ensureUser, getVaultPath, logUsage, loadTokens, saveTokens } = require('./core/user-vault');
const { estimateCost } = require('./orchestration/cost-engine');

async function runJobs(user) {
  ensureUser(user);
  const base = getVaultPath(user);
  const jobDir = path.join(base, 'jobs');
  if (!fs.existsSync(jobDir)) return [];
  const files = fs.readdirSync(jobDir).filter(f => f.endsWith('.json'));
  const logs = [];
  const router = new ProviderRouter();

  for (const f of files) {
    const p = path.join(jobDir, f);
    let job = {};
    try { job = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { continue; }
    if (job.status !== 'queued') continue;
    job.status = 'in-progress';
    fs.writeFileSync(p, JSON.stringify(job, null, 2));
    const tokensBefore = loadTokens(user);
    const estimate = estimateCost((job.prompt || '').split(/\s+/).length);
    if (tokensBefore < estimate.tokens) {
      job.status = 'failed';
      job.error = 'insufficient tokens';
      fs.writeFileSync(p, JSON.stringify(job, null, 2));
      logs.push({ id: job.id, error: job.error });
      continue;
    }
    saveTokens(user, tokensBefore - estimate.tokens);
    let output = '';
    try {
      output = await router.route('job-' + job.id, job.prompt, {});
      job.status = 'done';
      job.output = output;
    } catch (err) {
      job.status = 'failed';
      job.error = err.message;
    }
    fs.writeFileSync(p, JSON.stringify(job, null, 2));
    logUsage(user, { timestamp: new Date().toISOString(), action: 'job-run', id: job.id, tokens_used: estimate.tokens });
    logs.push({ id: job.id, status: job.status });
  }
  return logs;
}

if (require.main === module) {
  const user = process.argv[2];
  runJobs(user).then(r => console.log(JSON.stringify(r, null, 2))).catch(e => { console.error(e); process.exit(1); });
}

module.exports = { runJobs };
