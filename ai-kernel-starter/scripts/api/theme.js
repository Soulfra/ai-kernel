#!/usr/bin/env node
const { setName } = require('../agent/glyph-agent');
const name = process.argv[2];
const user = process.argv[3] || 'default';
if(!name){ console.log('Usage: theme.js <name> [user]'); process.exit(1); }
setName(user,name);
