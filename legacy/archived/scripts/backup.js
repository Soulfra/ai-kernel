// Backup Script: Creates timestamped backups of key directories/files
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BACKUP_DIR = process.env.BACKUP_DIR || './backups';
const TARGETS = [
  './concepts',
  './clusters',
  './index',
  './docs',
  './logs'
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function backup() {
  ensureDir(BACKUP_DIR);
  const ts = getTimestamp();
  const backupPath = path.join(BACKUP_DIR, `backup-${ts}`);
  ensureDir(backupPath);
  TARGETS.forEach(target => {
    if (fs.existsSync(target)) {
      const dest = path.join(backupPath, path.basename(target));
      execSync(`cp -r ${target} ${dest}`);
    }
  });
  console.log(`Backup created at ${backupPath}`);
}

function main() {
  backup();
  // TODO: Add retention policy, error handling, and logging
}

if (require.main === module) main(); 