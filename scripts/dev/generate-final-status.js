const fs=require('fs');
const path=require('path');
const logsDir=path.join(__dirname,'..','..','logs');
function read(p){try{return fs.readFileSync(p,'utf8').trim();}catch{return ''}}
const final={};
final.makeVerifyLog=read(path.join(logsDir,'make-verify-output.log'));
final.standardsFailures=JSON.parse(read(path.join(logsDir,'standards-failures.json'))||'[]').length;
final.docsSynced=(JSON.parse(read(path.join(logsDir,'doc-sync-report.json'))||'{"created":[],"updated":[],"skipped":[]}')); 
final.docCount=final.docsSynced.created.length+final.docsSynced.updated.length+final.docsSynced.skipped.length;
final.kernelCompliant=final.standardsFailures===0;
fs.writeFileSync(path.join(logsDir,'kernel-final-status.json'),JSON.stringify(final,null,2));
let md='# Kernel Final Status\n\n';
md+=`Docs synced: ${final.docCount}\n`;
md+=`Standard failures: ${final.standardsFailures}\n`;
md+=`Kernel compliant: ${final.kernelCompliant ? 'yes':'no'}\n`;
fs.writeFileSync(path.join(__dirname,'..','..','docs','final-kernel-status.md'),md);
