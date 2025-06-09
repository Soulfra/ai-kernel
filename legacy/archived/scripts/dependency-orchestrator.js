#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');

const SAFE_PACKAGES = ['husky', 'husky-init'];

function safeInstall(cmd, pkg) {
  if (!SAFE_PACKAGES.includes(pkg)) {
    console.error(`Blocked attempt to install non-whitelisted package: ${pkg}`);
    process.exit(1);
  }
  execSync(cmd, { stdio: 'inherit' });
}

function ensureNodeModules() {
  if (!fs.existsSync('node_modules')) {
    console.log('node_modules missing, running npm install...');
    execSync('npm install --yes', { stdio: 'inherit' });
  } else {
    console.log('node_modules present.');
  }
}

function ensureHusky() {
  if (!fs.existsSync('.husky')) {
    console.log('Husky not found, installing and initializing...');
    safeInstall('npx husky-init', 'husky-init');
    safeInstall('npm install husky --save-dev --yes', 'husky');
  } else {
    console.log('Husky already set up.');
  }
}

function main() {
  ensureNodeModules();
  ensureHusky();
  // Extend for other tools as needed
}

if (require.main === module) main(); 