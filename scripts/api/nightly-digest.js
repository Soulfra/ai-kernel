#!/usr/bin/env node
const { run } = require('../cron-nightly.js');
const user = process.argv[2] || 'default';
run(user);
