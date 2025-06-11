#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { ensureUser, getVaultPath } = require('../core/user-vault');

function guide(user) {
  const repoRoot = path.resolve(__dirname, '..', '..');
  ensureUser(user);
  const base = getVaultPath(user);
  console.log('Vault path:', base);
  console.log('Drop chat logs at http://localhost:3080/upload?user=' + user);
  console.log('Record voice with: make voice file=<wav> user=' + user);
  console.log('Build agent with: make queue-agent path.zip user=' + user);
  console.log('Promote idea with: node kernel-cli.js promote-idea <slug>');
  console.log('Marketplace: http://localhost:3080/marketplace?user=' + user);

  const welcome = `# Local Walkthrough\n\n- Upload chat logs via /upload\n- View dashboard at /dashboard?user=${user}\n- Use \`make voice file=<path> user=${user}\` to add voice logs.\n- Build agents once export is unlocked.`;
  fs.writeFileSync(path.join(repoRoot, 'welcome.md'), welcome);
  const launch = `# DevKit Launch Prep\n\n1. Ensure vault ready at ${base}\n2. Review ideas and build agents\n3. Promote promising agents to the marketplace.`;
  fs.writeFileSync(path.join(repoRoot, 'launch.md'), launch);
}

if (require.main === module) {
  const user = process.argv[2] || 'demo';
  guide(user);
}

module.exports = { guide };
