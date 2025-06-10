const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Patterns to redact
const REDACT_PATTERNS = [
  // Names
  /\b(?:Matthew|Matt)\s+Mauer\b/gi,
  // Email addresses
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  // API keys (common patterns)
  /\b(?:sk|pk)_[A-Za-z0-9]{32,}\b/g,
  /\b[A-Za-z0-9]{32,}\b/g,
  // IP addresses
  /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  // File paths with usernames
  /\/Users\/[^\/]+\//g,
  // Phone numbers
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g
];

// File types to process
const PROCESS_EXTENSIONS = ['.js', '.json', '.txt', '.md', '.log', '.yaml', '.yml'];

// Directories to skip
const SKIP_DIRS = ['node_modules', '.git', 'dist', 'build'];

function shouldProcessFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return PROCESS_EXTENSIONS.includes(ext);
}

function redactContent(content) {
  let redacted = content;
  REDACT_PATTERNS.forEach(pattern => {
    redacted = redacted.replace(pattern, '[REDACTED]');
  });
  return redacted;
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const redacted = redactContent(content);
    
    if (content !== redacted) {
      // Create backup
      const backupPath = `${filePath}.${crypto.randomBytes(4).toString('hex')}.bak`;
      fs.writeFileSync(backupPath, content);
      
      // Write redacted content
      fs.writeFileSync(filePath, redacted);
      console.log(`Redacted: ${filePath}`);
      return true;
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
  return false;
}

function walkDir(dir) {
  const results = {
    processed: 0,
    skipped: 0,
    errors: 0
  };

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.includes(entry.name)) {
          const subResults = walkDir(fullPath);
          results.processed += subResults.processed;
          results.skipped += subResults.skipped;
          results.errors += subResults.errors;
        }
      } else if (shouldProcessFile(fullPath)) {
        if (processFile(fullPath)) {
          results.processed++;
        } else {
          results.skipped++;
        }
      }
    }
  } catch (error) {
    console.error(`Error walking directory ${dir}:`, error.message);
    results.errors++;
  }

  return results;
}

// Main execution
const repoRoot = path.resolve(__dirname, '../../');
console.log('Starting redaction process...');
const results = walkDir(repoRoot);
console.log('\nRedaction complete:');
console.log(`- Files processed: ${results.processed}`);
console.log(`- Files skipped: ${results.skipped}`);
console.log(`- Errors encountered: ${results.errors}`); 