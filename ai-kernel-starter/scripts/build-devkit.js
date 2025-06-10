#!/usr/bin/env node
const { exportDevkit } = require('./export-devkit');
const { render } = require('../agent/vault-visualizer');
const { reflect } = require('../agents/reflection-agent');

async function main(){
  const user = process.argv[2];
  if(!user){ console.log('Usage: build-devkit.js <user>'); process.exit(1); }
  reflect(user);
  render(user);
  const zip = exportDevkit(user);
  console.log(zip);
}

if(require.main===module){
  main();
}
