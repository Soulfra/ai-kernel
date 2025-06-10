#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const minimist = require('minimist');
const yaml = require('js-yaml');

const argv = minimist(process.argv.slice(2));
const file = argv.file;
if (!file) {
  console.log('Usage: mask-prompts.js --file <input> [--prefix]');
  process.exit(1);
}

let text = fs.readFileSync(file, 'utf8');

if (path.extname(file) === '.yaml' || path.extname(file) === '.yml') {
  try {
    const data = yaml.load(text);
    if (data && data.title) delete data.title;
    text = yaml.dump(data);
  } catch {}
}

function mask(t) {
  t = t.replace(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g, '[uuid]');
  t = t.replace(/@[A-Za-z0-9_]+/g, '@user');
  return t;
}

let output = mask(text);
if (argv.prefix) {
  output = 'You are receiving an encrypted reflection task. Use structure only.\n' + output;
}

console.log(output);

