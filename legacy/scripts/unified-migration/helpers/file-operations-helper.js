const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const backupHelper = require('./backup-helper');
const { execSync } = require('child_process');

async function loadJson(filePath, description) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading ${description} from ${filePath}: ${error.message}`);
    throw error;
  }
}

async function getFileContent(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    // console.warn(`Could not read file ${filePath} for similarity check: ${error.message}`);
    return null; // Return null if file can't be read, similarity will be 0
  }
}

async function addYamlFrontmatter(filePath, tags, dryRun) {
  console.log(`${dryRun ? '[DRY RUN] Would add/update' : 'Adding/Updating'} YAML frontmatter for ${filePath} with tags: ${JSON.stringify(tags)}`);
  if (dryRun) return;

  try {
    let content = await fs.readFile(filePath, 'utf8');
    let existingFrontmatter = {};
    const frontmatterRegex = /^---\n([\s\S]*?)\n---/; // More robust regex
    const match = content.match(frontmatterRegex);

    if (match) {
      existingFrontmatter = yaml.load(match[1]) || {};
      content = content.substring(match[0].length).trimStart(); // Remove existing frontmatter
    }

    const newFrontmatter = { ...existingFrontmatter, ...tags };
    const newYaml = yaml.dump(newFrontmatter);
    const newContent = `---\n${newYaml}---\n\n${content}`;

    await fs.writeFile(filePath, newContent);
    console.log(`Successfully updated YAML for ${filePath}`);
  } catch (error) {
    console.error(`Error updating YAML for ${filePath}: ${error.message}`);
  }
}

async function deleteFileWithBackup(filePath, dryRun, processingLog) {
    const backupDir = path.join(process.cwd(), 'backups', 'duplicate-processing');
    const backupFilename = path.basename(filePath) + '.bak.' + Date.now();
    const backupPath = path.join(backupDir, backupFilename);
    
    console.log(`${dryRun ? '[DRY RUN] Would delete' : 'Deleting'} file: ${filePath}`);
    if (dryRun) {
        processingLog.push({ action: 'delete', file: filePath, status: 'dry_run_skipped' });
        return;
    }

    try {
        await fs.mkdir(backupDir, { recursive: true });
        await fs.copyFile(filePath, backupPath);
        await fs.unlink(filePath);
        console.log(`File ${filePath} deleted. Backup saved to ${backupPath}`);
        processingLog.push({ action: 'delete', file: filePath, status: 'success', backup: backupPath });
    } catch (error) {
        console.error(`Error deleting file ${filePath}: ${error.message}`);
        processingLog.push({ action: 'delete', file: filePath, status: 'failed', error: error.message });
    }
}

async function writeJsonFile(filePath, data) {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    console.log(`Successfully wrote JSON to ${filePath}`);
  } catch (error) {
    console.error(`Error writing JSON to ${filePath}: ${error.message}`);
    throw error; // Re-throw to allow caller to handle if needed
  }
}

async function runValidation(mode = 'dry-run') {
  try {
    execSync('node scripts/validate-all.js', { stdio: 'inherit' });
    return true;
  } catch (error) {
    // Validation script exits with non-zero on failure
    return false;
  }
}

module.exports = {
  loadJson,
  getFileContent,
  addYamlFrontmatter,
  deleteFileWithBackup,
  writeJsonFile,
  runBackup: backupHelper.runBackup,
  verifyBackup: backupHelper.verifyBackup,
  restoreBackup: backupHelper.restoreBackup,
  getBackupPaths: backupHelper.getBackupPaths,
  runValidation,
}; 