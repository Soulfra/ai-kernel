// soulfra-backrunner.js
// Soulfra Standard: Retroactively validate, hash, and anchor all logs/actions

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
// TODO: Add blake3 and sha3-512 support (use npm packages if needed)

const { updateDashboard } = require('./finalization-dashboard-updater');

const LOG_DIRS = [
  path.join(__dirname, '../../logs'),
  path.join(__dirname, '../../project_meta/task_logs'),
  // Add more log directories as needed
];

function computeSoulfraHash(data) {
  const json = typeof data === 'string' ? data : JSON.stringify(data);
  return {
    sha256: crypto.createHash('sha256').update(json).digest('hex'),
    sha512: crypto.createHash('sha512').update(json).digest('hex'),
    // TODO: sha3512: require('js-sha3').sha3_512(json),
    // TODO: blake3b: require('blake3').hash(json),
    sha3512: 'TODO',
    blake3b: 'TODO'
  };
}

function scanAndBackrunLogs() {
  let updated = 0;
  let issues = [];
  for (const dir of LOG_DIRS) {
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.json')) continue;
      const filePath = path.join(dir, file);
      let raw;
      try {
        raw = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(raw);
        if (!data.soulfraHash || !data.soulfraHash.sha256) {
          const hash = computeSoulfraHash(data);
          data.soulfraHash = hash;
          fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
          updated++;
          issues.push({ file: filePath, issue: 'Added missing SoulfraHash' });
        }
        // TODO: Validate existing hashes, log any mismatches
      } catch (err) {
        issues.push({ file: filePath, issue: 'Parse error or write failed', error: err.message });
      }
    }
  }
  // Log results to dashboard/suggestion log
  if (issues.length > 0) {
    const suggestionLog = path.join(__dirname, '../../project_meta/suggestion_log.md');
    const logEntry = `\n### Soulfra Backrunner Report (${new Date().toISOString()})\n` +
      issues.map(i => `- [ ] ${i.file}: ${i.issue}${i.error ? ' (' + i.error + ')' : ''}`).join('\n');
    fs.appendFileSync(suggestionLog, logEntry);
  }
  console.log(`Soulfra Backrunner complete. Updated: ${updated}, Issues: ${issues.length}`);
  // Optionally update dashboard
  updateDashboard && updateDashboard();
  // TODO: Anchor hashes to Web3 backend (stub)
}

if (require.main === module) {
  scanAndBackrunLogs();
} 