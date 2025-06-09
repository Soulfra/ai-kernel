#!/usr/bin/env node
const fs = require('fs');
const { execSync } = require('child_process');
const dotenvPath = '.env';
const logPath = 'project_meta/suggestion_log.md';

function logSuggestion(message) {
  const entry = `\n[${new Date().toISOString()}] ${message}`;
  fs.appendFileSync(logPath, entry + '\n');
}

function checkAndInstall(pkg) {
  try {
    require.resolve(pkg);
    return true;
  } catch (e) {
    console.log(`Package ${pkg} not found. Installing...`);
    try {
      execSync(`npm install ${pkg}`, { stdio: 'inherit' });
      logSuggestion(`Auto-installed missing package: ${pkg}`);
      return true;
    } catch (err) {
      logSuggestion(`Failed to auto-install package: ${pkg}`);
      return false;
    }
  }
}

function checkEnvKey(key) {
  if (!fs.existsSync(dotenvPath)) return false;
  const env = fs.readFileSync(dotenvPath, 'utf8');
  return env.split('\n').some(line => line.startsWith(key + '='));
}

function promptAddKey(key) {
  if (ciMode) {
    logSuggestion(`CI mode: Missing API key: ${key}. Please add to .env manually.`);
    process.exit(1);
  }
  const readline = require('readline-sync');
  const value = readline.question(`Enter value for ${key}: `);
  fs.appendFileSync(dotenvPath, `\n${key}=${value}\n`);
  logSuggestion(`Added missing API key: ${key}`);
}

function checkFileExists(file, desc) {
  if (!fs.existsSync(file)) {
    console.log(`${desc} missing: ${file}`);
    logSuggestion(`${desc} missing: ${file}`);
    return false;
  }
  return true;
}

function checkFrontmatter(file) {
  const content = fs.readFileSync(file, 'utf8');
  if (!content.startsWith('---')) {
    logSuggestion(`Non-compliant doc (missing frontmatter): ${file}`);
    return false;
  }
  return true;
}

function checkAdHocLogging(file) {
  const content = fs.readFileSync(file, 'utf8');
  if (/console\.(log|error|warn)/.test(content) && !file.includes('demo')) {
    logSuggestion(`Ad-hoc logging detected in: ${file}`);
    return false;
  }
  return true;
}

try { require.resolve('readline-sync'); } catch (e) {
  require('child_process').execSync('npm install readline-sync', { stdio: 'inherit' });
}
const args = process.argv.slice(2);
const ciMode = args.includes('--ci');

let ok = true;
if (!checkAndInstall('axios')) ok = false;
if (!checkAndInstall('anthropic')) ok = false;

if (!checkEnvKey('OPENAI_API_KEY')) {
  console.log('OPENAI_API_KEY missing from .env.');
  promptAddKey('OPENAI_API_KEY');
}
if (!checkEnvKey('CLAUDE_API_KEY')) {
  console.log('CLAUDE_API_KEY missing from .env.');
  promptAddKey('CLAUDE_API_KEY');
}

// Check orchestrators
const orchestrators = [
  'scripts/core/log-orchestrator.js',
  'scripts/core/debug-orchestrator.js',
  'scripts/core/meta-orchestrator.js',
  'scripts/core/task-orchestrator.js',
  'scripts/core/quality-orchestrator.js'
];
for (const file of orchestrators) {
  checkFileExists(file, 'Canonical orchestrator');
}

// Check docs for frontmatter
const docFiles = fs.readdirSync('docs/').filter(f => f.endsWith('.md'));
for (const file of docFiles) {
  checkFrontmatter('docs/' + file);
}

// Check for ad-hoc logging in scripts/core
const coreFiles = fs.readdirSync('scripts/core/').filter(f => f.endsWith('.js'));
for (const file of coreFiles) {
  checkAdHocLogging('scripts/core/' + file);
}

if (ok) {
  console.log('All LLM packages and keys are present.');
  logSuggestion('LLM fixer script: All packages and keys present.');
  process.exit(0);
} else {
  console.log('Some packages could not be installed. See suggestion log.');
  process.exit(1);
} 