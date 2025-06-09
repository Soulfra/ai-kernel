const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

async function validateFileLengths() {
  const coreDir = path.join(__dirname, 'core');
  const files = await fs.readdir(coreDir);
  
  for (const file of files) {
    if (file.endsWith('.js')) {
      const content = await fs.readFile(path.join(coreDir, file), 'utf8');
      const lines = content.split('\n').length;
      if (lines > 250) {
        console.warn(`Warning: ${file} exceeds 250 lines (${lines} lines)`);
      }
    }
  }
}

async function main() {
  try {
    // Run Jest tests
    console.log('Running tests...');
    execSync('jest', { stdio: 'inherit' });

    // Validate file lengths
    console.log('\nValidating file lengths...');
    await validateFileLengths();

    // Run dry run
    console.log('\nRunning dry run...');
    execSync('node scripts/run-dry-run.js', { stdio: 'inherit' });

    console.log('\nAll validations completed successfully!');
  } catch (error) {
    console.error('Validation failed:', error);
    process.exit(1);
  }
}

main().catch(console.error); 