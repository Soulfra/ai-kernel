module.exports = function requireOrInstall(moduleName) {
  try {
    return require(moduleName);
  } catch (err) {
    if (err.code !== 'MODULE_NOT_FOUND') {
      throw err;
    }
    const { execSync } = require('child_process');
    try {
      console.log(`Module ${moduleName} not found. Installing...`);
      execSync(`npm install ${moduleName}`, { stdio: 'inherit' });
    } catch (installErr) {
      console.error(`Failed to install ${moduleName}:`, installErr);
      process.exit(1);
    }
    return require(moduleName);
  }
};
