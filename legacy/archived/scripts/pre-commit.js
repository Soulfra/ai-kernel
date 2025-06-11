// Pre-commit Hook: Enforces standards before commit
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function checkFileLength(file) {
  const lines = fs.readFileSync(file, 'utf8').split('\n').length;
  return lines <= 250;
}

function checkFileName(file) {
  return /^[a-z0-9\-]+\.[a-z]+$/.test(path.basename(file));
}

function checkFrontmatter(content) {
  return /---[\s\S]*title:[\s\S]*description:[\s\S]*lastUpdated:[\s\S]*version:[\s\S]*---/.test(content);
}

function validateFile(file) {
  const content = fs.readFileSync(file, 'utf8');
  const results = [];
  if (!checkFileLength(file)) results.push('File too long');
  if (!checkFileName(file)) results.push('Invalid file name');
  if (file.endsWith('.md') && !checkFrontmatter(content)) results.push('Missing/invalid frontmatter');
  return results;
}

function main() {
  // Get staged files
  const output = execSync('git diff --cached --name-only', { encoding: 'utf8' });
  const files = output.split('\n').filter(f => f && fs.existsSync(f));
  let allPassed = true;
  files.forEach(file => {
    const results = validateFile(file);
    if (results.length) {
      allPassed = false;
      console.error(`FAIL: ${file} - ${results.join(', ')}`);
    }
  });
  if (!allPassed) {
    console.error('Pre-commit checks failed. Please fix the above issues.');
    process.exit(1);
  } else {
    process.exit(0);
  }
}

if (require.main === module) main();
// TODO: Integrate with git hooks and CI 