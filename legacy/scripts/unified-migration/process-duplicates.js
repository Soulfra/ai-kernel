const path = require('path');
const readline = require('readline');
const stringSimilarity = require('string-similarity');
const { loadJson, getFileContent, addYamlFrontmatter, deleteFileWithBackup, writeJsonFile } = require('./helpers/file-operations-helper.js');

const fs = require('fs');
const RULES_PATH = path.join(process.cwd(), '.cursorrules.json');
const rules = JSON.parse(fs.readFileSync(RULES_PATH, 'utf8'));

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const promptUser = (question) => new Promise((resolve) => rl.question(question, resolve));

const SAFETY_REPORT_PATH = path.join(process.cwd(), 'safety-validation-report.json');
const DEPENDENCY_REPORT_PATH = path.join(process.cwd(), 'dependency-report.json');
const PROCESSING_LOG_PATH = path.join(process.cwd(), 'duplicate-processing-log.json');
const BATCH_SIZE = 5; // Number of duplicate sets to process per batch

async function calculateSimilarity(filesInSet) {
  const contents = await Promise.all(filesInSet.map(f => getFileContent(f.fullPath)));
  const similarities = {};
  for (let i = 0; i < filesInSet.length; i++) {
    similarities[filesInSet[i].relativePath] = {};
    for (let j = 0; j < filesInSet.length; j++) {
      if (i === j) continue;
      if (contents[i] === null || contents[j] === null) {
        similarities[filesInSet[i].relativePath][filesInSet[j].relativePath] = 0;
      } else {
        similarities[filesInSet[i].relativePath][filesInSet[j].relativePath] =
          stringSimilarity.compareTwoStrings(contents[i], contents[j]);
      }
    }
  }
  return similarities;
}

function getDependencyInfo(filePath, dependencyReport) {
  const fileInfo = dependencyReport.files.find(f => f.filePath === filePath);
  if (!fileInfo) return { dependents: [], linkedBy: [] };
  return {
    dependents: fileInfo.dependents || [],
    linkedBy: fileInfo.linkedBy || []
  };
}

async function processDuplicateSet(set, dependencyReport, dryRun, processingLog) {
  console.log(`\n--- Processing Duplicate Filename: ${set.filename} ---`);
  const filesInSet = set.paths.map(p => ({
    relativePath: path.relative(process.cwd(), p),
    fullPath: p
  }));

  const similarities = await calculateSimilarity(filesInSet);

  for (let i = 0; i < filesInSet.length; i++) {
    const file = filesInSet[i];
    const deps = getDependencyInfo(file.relativePath, dependencyReport);
    console.log(`  ${i + 1}. ${file.relativePath}`);
    console.log(`     Dependents: ${deps.dependents.length} (${deps.dependents.slice(0,3).join(', ')}${deps.dependents.length > 3 ? '...':''})`);
    console.log(`     Linked By: ${deps.linkedBy.length} (${deps.linkedBy.slice(0,3).join(', ')}${deps.linkedBy.length > 3 ? '...':''})`);
    if (i < filesInSet.length -1) {
        for (let j = i + 1; j < filesInSet.length; j++) {
            const otherFile = filesInSet[j];
            console.log(`     Similarity with ${otherFile.relativePath}: ${(similarities[file.relativePath][otherFile.relativePath] * 100).toFixed(2)}%`);
        }
    }
  }

  const choice = await promptUser('Action: (k)eep one, (d)elete specific, (t)ag all, (m)ark for manual merge, (s)kip: ');

  switch (choice.toLowerCase()) {
    case 'k':
      const keepIndexStr = await promptUser(`Enter number of file to keep (1-${filesInSet.length}): `);
      const keepIndex = parseInt(keepIndexStr) - 1;
      if (keepIndex >= 0 && keepIndex < filesInSet.length) {
        for (let i = 0; i < filesInSet.length; i++) {
          if (i !== keepIndex) {
            await deleteFileWithBackup(filesInSet[i].fullPath, dryRun, processingLog);
          } else {
            console.log(`Kept file: ${filesInSet[i].relativePath}`);
            processingLog.push({ action: 'keep', file: filesInSet[i].relativePath, status: 'success' });
          }
        }
      } else {
        console.log('Invalid selection. Skipping set.');
      }
      break;
    case 'd':
      const deleteIndicesStr = await promptUser('Enter numbers of files to delete (e.g., 1,3): ');
      const deleteIndices = deleteIndicesStr.split(',').map(s => parseInt(s.trim()) - 1);
      for (const index of deleteIndices) {
        if (index >= 0 && index < filesInSet.length) {
          const fileToDelete = filesInSet[index];
          const deps = getDependencyInfo(fileToDelete.relativePath, dependencyReport);
          if (deps.dependents.length > 0 || deps.linkedBy.length > 0) {
            const confirmDelete = await promptUser(`WARNING: ${fileToDelete.relativePath} has ${deps.dependents.length} dependents and ${deps.linkedBy.length} links. Type 'DELETE ANYWAY' to confirm: `);
            if (confirmDelete === 'DELETE ANYWAY') {
              await deleteFileWithBackup(fileToDelete.fullPath, dryRun, processingLog);
            } else {
              console.log(`Deletion of ${fileToDelete.relativePath} cancelled.`);
            }
          } else {
            await deleteFileWithBackup(fileToDelete.fullPath, dryRun, processingLog);
          }
        } else {
          console.log(`Invalid index ${index + 1}. Skipping.`);
        }
      }
      break;
    case 't':
      const tagsStr = await promptUser('Enter tags as key:value pairs (e.g., system:core, component:cli, type:readme, status:draft, keywords:migration,duplicates): ');
      const tags = tagsStr.split(',').reduce((acc, pair) => {
        const [key, value] = pair.split(':');
        if (key && value) acc[key.trim()] = value.trim();
        return acc;
      }, {});
      // Add required fields from rules if not present
      for (const field of rules.requiredDocFields || []) {
        if (!tags[field]) tags[field] = 'TODO';
      }
      for (const file of filesInSet) {
        await addYamlFrontmatter(file.fullPath, tags, dryRun);
        processingLog.push({ action: 'tag', file: file.relativePath, tags, status: dryRun ? 'dry_run_skipped' : 'success' });
      }
      break;
    case 'm':
      console.log(`Marking files for manual merge: ${filesInSet.map(f => f.relativePath).join(', ')}`);
      processingLog.push({ action: 'manual_merge', files: filesInSet.map(f => f.relativePath), status: 'pending' });
      break;
    case 's':
      console.log('Skipping set.');
      processingLog.push({ action: 'skip_set', filename: set.filename, status: 'success' });
      break;
    default:
      console.log('Invalid choice. Skipping set.');
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  console.log(dryRun ? 'Running in DRY RUN mode' : 'Running in LIVE mode');

  const processingLog = [];

  try {
    const safetyReport = await loadJson(SAFETY_REPORT_PATH, 'Safety Report');
    const dependencyReport = await loadJson(DEPENDENCY_REPORT_PATH, 'Dependency Report');

    const duplicateFileWarnings = safetyReport.warnings.filter(w => w.type === 'duplicate-files');
    if (duplicateFileWarnings.length === 0) {
      console.log('No duplicate file warnings found in safety report. Nothing to process.');
      rl.close();
      return;
    }

    // The safety report's "files" property for "duplicate-files" is an array of objects, 
    // each object representing one set of duplicates and having a "filename" and "paths" property.
    // We want to iterate over these objects directly.
    const allDuplicateSets = duplicateFileWarnings.flatMap(warning => warning.files);
    console.log(`Found ${allDuplicateSets.length} sets of duplicate filenames to process.`);

    for (let i = 0; i < allDuplicateSets.length; i += BATCH_SIZE) {
      const batch = allDuplicateSets.slice(i, i + BATCH_SIZE);
      console.log(`\n--- Processing Batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(allDuplicateSets.length / BATCH_SIZE)} ---`);
      for (const set of batch) { // 'set' here is an object like { filename: "...", paths: ["...", "..."] }
        await processDuplicateSet(set, dependencyReport, dryRun, processingLog);
      }
      if (i + BATCH_SIZE < allDuplicateSets.length) {
        const continueChoice = await promptUser('Continue to next batch? (yes/no): ');
        if (continueChoice.toLowerCase() !== 'yes') {
          console.log('Processing stopped by user.');
          break;
        }
      }
    }

    console.log('\n--- All duplicate sets processed. ---');

  } catch (error) {
    console.error(`An error occurred during duplicate processing: ${error.message}`);
    processingLog.push({ action: 'error', message: error.message, stack: error.stack });
  } finally {
    try {
        await writeJsonFile(PROCESSING_LOG_PATH, processingLog);
        // console.log(`Processing log saved to ${PROCESSING_LOG_PATH}`); // log is now in helper
    } catch (logError) {
        console.error(`Failed to write processing log: ${logError.message}`);
    }
    rl.close();
  }
}

main(); 