// Rollback Script: Restores from the latest backup
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

function getLatestBackup() {
  if (!fs.existsSync(BACKUP_DIR)) return null;
  const backups = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup-'))
    .sort()
    .reverse();
  return backups.length ? path.join(BACKUP_DIR, backups[0]) : null;
}

function restore(backupPath) {
  TARGETS.forEach(target => {
    const src = path.join(backupPath, path.basename(target));
    if (fs.existsSync(src)) {
      execSync(`rm -rf ${target}`);
      execSync(`cp -r ${src} ${target}`);
    }
  });
  console.log(`Restored from backup at ${backupPath}`);
}

function main() {
  const backupPath = getLatestBackup();
  if (!backupPath) {
    console.error('No backup found.');
    process.exit(1);
  }
  restore(backupPath);
  // TODO: Add selective restore, error handling, and logging
}

if (require.main === module) main(); 