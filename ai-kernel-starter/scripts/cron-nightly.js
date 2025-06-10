const fs = require('fs');
const path = require('path');
const { reflectVault } = require('../reflect-vault');
const { ensureUser } = require('../core/user-vault');

async function run(user){
  const repoRoot = path.resolve(__dirname,'..','..');
  ensureUser(user);
  const res = reflectVault(user);
  const vaultDir = path.join(repoRoot,'vault',user);
  const promptDir = path.join(repoRoot,'vault-prompts',user);
  fs.mkdirSync(promptDir,{recursive:true});
  fs.mkdirSync(vaultDir,{recursive:true});
  const dailyPath = path.join(vaultDir,'daily.md');
  const entry = `## ${new Date().toISOString()}\n\n`+JSON.stringify(res,null,2)+"\n";
  fs.appendFileSync(dailyPath, entry);
  const loopFile = path.join(promptDir,'loop.json');
  let arr = [];
  if(fs.existsSync(loopFile)) { try { arr = JSON.parse(fs.readFileSync(loopFile,'utf8')); } catch {} }
  arr.push({ timestamp:new Date().toISOString(), reflection: res });
  fs.writeFileSync(loopFile, JSON.stringify(arr,null,2));
}

if(require.main===module){
  const user = process.argv[2] || 'default';
  run(user).catch(err=>{ console.error(err); process.exit(1); });
}

module.exports = { run };
