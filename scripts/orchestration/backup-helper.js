// @agent: diagnostics
// @orchestrator: recovery
// @origin: legacy-rescue
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

const BACKUP_DIR = path.join(__dirname, '../../../backups/test-suite');

function getTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function getBackupName() {
  return `test-suite-backup-${getTimestamp()}`;
}

function getBackupPaths() {
  // Add all relevant test and script directories here
  return [
    'tests',
    'scripts/core/tests',
    'scripts/unified-migration',
    'core/components/memory/tests',
    'clarity-cli/__tests__',
    // Add more as needed
  ];
}

function createManifest(backupPath, files) {
  const manifest = {
    timestamp: new Date().toISOString(),
    backupPath,
    files,
    hash: crypto.createHash('sha256').update(files.join(',')).digest('hex')
  };
  fs.writeFileSync(path.join(backupPath, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return manifest;
}

function runBackup() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const backupName = getBackupName();
  const backupPath = path.join(BACKUP_DIR, backupName);
  fs.mkdirSync(backupPath);
  const files = getBackupPaths().filter(fs.existsSync);
  const archiveFile = path.join(BACKUP_DIR, `${backupName}.tar.gz`);
  const tarCmd = `tar -czf ${archiveFile} ${files.join(' ')}`;
  execSync(tarCmd);
  createManifest(backupPath, files);
  return { backupPath, archiveFile };
}

function verifyBackup(archiveFile) {
  return fs.existsSync(archiveFile) && fs.statSync(archiveFile).size > 0;
}

function restoreBackup(archiveFile) {
  if (!fs.existsSync(archiveFile)) throw new Error('Backup archive not found');
  execSync(`tar -xzf ${archiveFile} -C ./`);
}

module.exports = {
  runBackup,
  verifyBackup,
  restoreBackup,
  getBackupPaths
}; 
