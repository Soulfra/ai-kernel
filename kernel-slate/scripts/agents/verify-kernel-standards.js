#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const cliFile = path.join(repoRoot, 'scripts', 'cli', 'kernel-cli.js');
const docsDir = path.join(repoRoot, 'docs');
const logsDir = path.join(repoRoot, 'logs');
const agentDir = path.join(repoRoot, 'agent-templates');
const availFile = path.join(repoRoot, 'kernel-slate', 'docs', 'available-agents.json');
const reportPath = path.join(logsDir, 'kernel-standards-report.json');
fs.mkdirSync(logsDir, { recursive: true });

function readJSON(p){ try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null;}}

function checkCLI(){
  const required = ['verify','doctor','release-check'];
  const text = fs.readFileSync(cliFile,'utf8');
  const missing = required.filter(c => !text.includes(`'${c}'`));
  return {missing};
}

function checkAgents(){
  const yamls = fs.existsSync(agentDir)?fs.readdirSync(agentDir).filter(f=>f.endsWith('.yaml')):[];
  const docs = new Set(fs.readdirSync(docsDir).filter(f=>f.endsWith('.md')));
  const avail = readJSON(availFile) || [];
  const notDoc = [];
  const notAvail = [];
  yamls.forEach(y=>{
    const base = path.basename(y,'.yaml');
    if(!docs.has(base+'.md')) notDoc.push(base);
    if(!avail.includes(base)) notAvail.push(base);
  });
  return {notDoc,notAvail};
}

function checkDocs(){
  const log = readJSON(path.join(logsDir,'doc-sync-report.json')) || {created:[],updated:[],skipped:[]};
  const valid = new Set([...log.created,...log.updated,...log.skipped]);
  const allDocs = fs.readdirSync(docsDir).filter(f=>f.endsWith('.md'));
  const extra = allDocs.filter(f=>!valid.has(f) && f!=='README.md' && f!=='kernel-standards.md');
  // check dead links
  const readme = fs.readFileSync(path.join(docsDir,'README.md'),'utf8');
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const deadLinks = [];
  let m; while((m = linkRegex.exec(readme))){
    const link = m[2];
    if(link.startsWith('./')){
      const target = path.join(docsDir, link.replace('./',''));
      if(!fs.existsSync(target)) deadLinks.push(link);
    }
  }
  return {extra,deadLinks};
}

function main(){
  const cli = checkCLI();
  const agent = checkAgents();
  const docs = checkDocs();
  const ok = cli.missing.length===0 && agent.notDoc.length===0 && agent.notAvail.length===0 && docs.extra.length===0 && docs.deadLinks.length===0;
  const report = {cli,agent,docs,ok};
  fs.writeFileSync(reportPath, JSON.stringify(report,null,2));
  process.exit(ok?0:1);
}

if(require.main===module) main();
