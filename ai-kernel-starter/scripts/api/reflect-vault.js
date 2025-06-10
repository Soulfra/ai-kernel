#!/usr/bin/env node
const { reflectVault } = require('../reflect-vault');
const user = process.argv[2] || 'default';
console.log(JSON.stringify(reflectVault(user), null, 2));
