#!/usr/bin/env node
const { exportDevkit } = require('../export-devkit');
const user = process.argv[2] || 'default';
console.log(exportDevkit(user));
