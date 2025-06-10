#!/usr/bin/env node
const { promoteIdea } = require('../promote-idea');
const slug = process.argv[2];
if(!slug){ console.log('Usage: promote.js <slug>'); process.exit(1); }
promoteIdea(slug);
