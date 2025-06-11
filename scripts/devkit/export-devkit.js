#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { ensureUser, getVaultPath } = require('../core/user-vault');
const yaml = require('js-yaml');

function exportDevkit(target){
  const repoRoot = path.resolve(__dirname,'..','..');
  let user = null;
  let ideaPath = null;
  if(target.endsWith('.idea.yaml')){
    ideaPath = path.resolve(target);
    user = path.basename(ideaPath,'.idea.yaml');
  } else {
    user = target;
    ideaPath = path.join(repoRoot,'vault',user,'ideas');
    const files = fs.existsSync(ideaPath)?fs.readdirSync(ideaPath).filter(f=>f.endsWith('.idea.yaml')):[];
    ideaPath = files.length?path.join(repoRoot,'vault',user,'ideas',files[0]):null;
  }
  ensureUser(user);
  const slug = ideaPath?path.basename(ideaPath,'.idea.yaml'):user;
  const outDir = path.join(repoRoot,'build','agent-devkit',slug);
  fs.mkdirSync(outDir,{recursive:true});
  if(ideaPath && fs.existsSync(ideaPath)) fs.copyFileSync(ideaPath,path.join(outDir,'.idea.yaml'));
  const transcript = path.join(repoRoot,'vault',user,'session.md');
  if(fs.existsSync(transcript)) fs.copyFileSync(transcript,path.join(outDir,'vault-transcript.md'));
  const summary = path.join(repoRoot,'vault',user,'summary.md');
  if(fs.existsSync(summary)) fs.copyFileSync(summary,path.join(outDir,'summary.md'));
  const history = path.join(repoRoot,'vault',user,'execution-history.json');
  if(fs.existsSync(history)) fs.copyFileSync(history,path.join(outDir,'execution-history.json'));
  const video = path.join(repoRoot,'vault',user,'visual','summary.mp4');
  if(fs.existsSync(video)) fs.copyFileSync(video,path.join(outDir,'visual.mp4'));
  const tts = path.join(repoRoot,'vault',user,'tts-summary.mp3');
  if(fs.existsSync(tts)) fs.copyFileSync(tts,path.join(outDir,'tts-summary.mp3'));
  const glyph = path.join(repoRoot,'vault',user,'glyph.json');
  if(fs.existsSync(glyph)) fs.copyFileSync(glyph,path.join(outDir,'glyph-metadata.json'));
  const narrator = path.join(repoRoot,'vault-prompts',user,'claude-transcripts.json');
  if(fs.existsSync(narrator)) fs.copyFileSync(narrator,path.join(outDir,'claude-narrator.json'));
  const zipPath = path.join(repoRoot,'build','agent-devkit',`${slug}.zip`);
  spawnSync('zip',['-r',zipPath,'.'],{cwd:outDir,stdio:'inherit'});
  const logFile = path.join(repoRoot,'vault',user,'export-history.json');
  let log=[]; if(fs.existsSync(logFile)){ try { log=JSON.parse(fs.readFileSync(logFile,'utf8')); } catch {} }
  log.push({ timestamp:new Date().toISOString(), zip:path.relative(repoRoot,zipPath) });
  fs.writeFileSync(logFile, JSON.stringify(log,null,2));
  return zipPath;
}

if(require.main===module){
  const arg = process.argv[2];
  if(!arg){ console.log('Usage: export-devkit.js <vault-user|idea-file>'); process.exit(1); }
  const out = exportDevkit(arg);
  console.log(out);
}

module.exports = { exportDevkit };
