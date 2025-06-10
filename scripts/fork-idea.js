const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { ensureUser } = require('./core/user-vault');

function forkIdea(slug, user){
  const repoRoot = path.resolve(__dirname,'..');
  ensureUser(user);
  const src = path.join(repoRoot,'vault',user,'ideas',`${slug}.idea.yaml`);
  if(!fs.existsSync(src)) throw new Error('idea not found');
  const variantDir = path.join(repoRoot,'vault',user,'idea-variants');
  fs.mkdirSync(variantDir,{recursive:true});
  const dst = path.join(variantDir,`${slug}-${crypto.randomUUID()}.idea.yaml`);
  fs.copyFileSync(src,dst);
  return dst;
}

if(require.main===module){
  const slug = process.argv[2];
  const user = process.argv[3] || 'default';
  if(!slug) { console.log('Usage: node scripts/fork-idea.js <slug> [user]'); process.exit(1); }
  const out = forkIdea(slug,user);
  console.log('Forked to', out);
}

module.exports = { forkIdea };
