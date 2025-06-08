#!/usr/bin/env node
const fs = require('fs');
const logPath = 'project_meta/suggestion_log.md';
const dashboardPath = 'project_meta/insights/check_deps_dashboard.md';
const requiredDeps = ['readline-sync', 'anthropic'];
let missing = [];
for (const dep of requiredDeps) {
  try { require.resolve(dep); } catch { missing.push(dep); }
}
if (missing.length) {
  const msg = `[CHECK-DEPS] Missing dependencies: ${missing.join(', ')}. Running in STUB MODE.`;
  fs.appendFileSync(logPath, `\n[${new Date().toISOString()}] ${msg}\n`);
  fs.appendFileSync(dashboardPath, `${msg}\n`);
  console.warn(msg);
  process.exitCode = 0; // Do not fail, allow stub mode
} else {
  const msg = '[CHECK-DEPS] All dependencies present.';
  fs.appendFileSync(dashboardPath, `${msg}\n`);
  console.log(msg);
} 