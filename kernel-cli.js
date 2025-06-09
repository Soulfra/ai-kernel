#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'menu': {
    // Launch the CalCTL interactive shell
    const calShellPath = resolve(__dirname, 'scripts/tools/calctl/CalShell.js');
    await import(calShellPath);
    break;
  }
  case 'help':
  default:
    console.log('kernel-cli commands:');
    console.log('  menu   Launch CalCTL loop toolkit');
    break;
}
