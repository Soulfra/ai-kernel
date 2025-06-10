#!/usr/bin/env node
// Voice reflector stub
const fs = require('fs');
const path = require('path');

function usage() {
  console.log('Usage: node voice-reflector.js <command>');
  console.log('Commands: record, play, whisper');
}

async function main() {
  const cmd = process.argv[2];
  if (!cmd) return usage();

  switch (cmd) {
    case 'record':
      console.log('Recording voice... (stub)');
      break;
    case 'play':
      console.log('Playing last voice... (stub)');
      break;
    case 'whisper':
      console.log('Running whisper transcription... (stub)');
      break;
    default:
      usage();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
