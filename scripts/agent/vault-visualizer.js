#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { ensureUser, getVaultPath } = require('../core/user-vault');

function render(user){
  ensureUser(user);
  const vault = getVaultPath(user);
  const outDir = path.join(vault, 'visual');
  fs.mkdirSync(outDir,{recursive:true});
  const summary = path.join(vault,'session.md');
  const themeFile = path.join(vault,'theme.json');
  let text = `Vault ${user}`;
  if(fs.existsSync(summary)){
    try { text = fs.readFileSync(summary,'utf8').split('\n').slice(0,10).join('\n'); } catch {}
  }
  let theme = {};
  if(fs.existsSync(themeFile)){ try { theme = JSON.parse(fs.readFileSync(themeFile,'utf8')); } catch {} }
  const overlay = `${theme.voice||'Narrator'}: ${text.replace(/'/g,"\'")}`;
  const mp4 = path.join(outDir, `vault-${Date.now()}.mp4`);
  spawnSync('ffmpeg', ['-y','-f','lavfi','-i','color=c=black:s=1280x720:d=5',
    '-vf',`drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='${overlay}':fontcolor=white:fontsize=24:x=(w-text_w)/2:y=(h-text_h)/2`,
    mp4],{stdio:'inherit'});
  const entry = { timestamp:new Date().toISOString(), file:path.relative('.',mp4) };
  const histFile = path.join(vault,'render-history.json');
  let hist=[]; if(fs.existsSync(histFile)){ try { hist = JSON.parse(fs.readFileSync(histFile,'utf8')); } catch {} }
  hist.push(entry); fs.writeFileSync(histFile, JSON.stringify(hist,null,2));
  const logFile = path.join(path.resolve(__dirname,'..','..'),'logs','video-events.json');
  let log=[]; if(fs.existsSync(logFile)){ try { log = JSON.parse(fs.readFileSync(logFile,'utf8')); } catch {} }
  log.push({ user, ...entry });
  fs.mkdirSync(path.dirname(logFile),{recursive:true});
  fs.writeFileSync(logFile, JSON.stringify(log,null,2));
  return mp4;
}

if(require.main===module){
  const user = process.argv[2];
  if(!user){ console.log('Usage: vault-visualizer.js <user>'); process.exit(1); }
  const out = render(user);
  console.log(out);
}

module.exports = { render };
