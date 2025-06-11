#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const minimist = require('minimist');

const argv = minimist(process.argv.slice(2));
const cmd = argv._[0];
const repoRoot = path.resolve(__dirname,'..','..');
const traceRoot = path.join(repoRoot,'trace');
fs.mkdirSync(traceRoot,{ recursive: true });

function hashFile(file){
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function seal(file){
  const hash = hashFile(file);
  const logFile = path.join(traceRoot,'hashes.json');
  let arr=[]; if(fs.existsSync(logFile)){ try{ arr=JSON.parse(fs.readFileSync(logFile,'utf8')); }catch{} }
  arr.push({ file: path.basename(file), hash, timestamp: new Date().toISOString() });
  fs.writeFileSync(logFile, JSON.stringify(arr,null,2));
  const out = file + '.sealed';
  fs.copyFileSync(file,out);
  return hash;
}

function decode(file){
  const hash = hashFile(file);
  console.log(hash);
}

function sync(input, output){
  const data = fs.readFileSync(input,'utf8');
  const out = output || input.replace(/\.mp4$/,'');
  fs.writeFileSync(out, Buffer.from(data,'base64'));
  console.log(out);
}

if(cmd==='seal'){
  const file=argv.file; if(!file){console.log('Usage: trace.js seal --file <path>');process.exit(1);} console.log(seal(file));
}else if(cmd==='decode'){
  const file=argv.file; if(!file){console.log('Usage: trace.js decode --file <path>');process.exit(1);} decode(file);
}else if(cmd==='sync'){
  const input=argv.input; if(!input){console.log('Usage: trace.js sync --input <file> [--output <file>]');process.exit(1);} sync(input, argv.output);
}else{
  console.log('Usage: trace.js <seal|decode|sync>');
}
