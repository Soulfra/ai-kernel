#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function ensureFile(filePath, content) {
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Created ${filePath}`);
  } else {
    console.log(`${filePath} already exists.`);
  }
}

function main() {
  ensureFile('.cursorignore', `backups/\ntest-suite/\nCLARITY_ENGINE_DOCS/backups/\nCLARITY_ENGINE_DOCS/CLARITY_ENGINE_DOCS/archive/\n`);
  ensureFile('.editorconfig', `root = true\n\n[*]\ncharset = utf-8\nindent_style = space\nindent_size = 2\nend_of_line = lf\ninsert_final_newline = true\ntrim_trailing_whitespace = true\n`);
  ensureFile('.vscode/settings.json', JSON.stringify({
    "files.exclude": {
      "backups": true,
      "test-suite": true,
      "CLARITY_ENGINE_DOCS/backups": true,
      "CLARITY_ENGINE_DOCS/CLARITY_ENGINE_DOCS/archive": true
    },
    "editor.formatOnSave": true,
    "editor.tabSize": 2,
    "files.trimTrailingWhitespace": true
  }, null, 2));
}

if (require.main === module) main(); 