#!/usr/bin/env node
const { animateVault } = require('../vault/visualizer');
const user = process.argv[2] || 'default';
console.log(animateVault(user));
