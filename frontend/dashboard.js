function renderMarkdown(text){
  return text.replace(/^# (.*$)/gim,'<h1>$1</h1>')
    .replace(/^## (.*$)/gim,'<h2>$1</h2>')
    .replace(/^### (.*$)/gim,'<h3>$1</h3>')
    .replace(/\*\*(.*)\*\*/gim,'<b>$1</b>')
    .replace(/\*(.*)\*/gim,'<i>$1</i>')
    .replace(/\n$/gim,'<br />');
}

async function load(){
  const res = await fetch('/dashboard?json=1');
  const data = await res.json();
  document.getElementById('info').innerHTML = `<p>Vault: <b>${data.user}</b></p><p>Tokens: ${data.tokens}</p>`;
  if(data.transcript) document.getElementById('voice').textContent = 'Last voice: '+data.transcript;
  if(data.idea) document.getElementById('idea').innerHTML = `<pre>${JSON.stringify(data.idea,null,2)}</pre>`;
  fetch(`/vault-prompts/${data.user}/claude-reflection.json`).then(r=>r.ok?r.json():null).then(d=>{
    if(d){ document.getElementById('reflection').innerHTML = renderMarkdown(`**Cal Riven**:\n_${d.response || ''}_`); }
  });
  }

async function reflect(){
  const res = await fetch('/audit-vault',{method:'POST'});
  document.getElementById('log').textContent = await res.text();
}

document.getElementById('reflect').onclick = reflect;
document.getElementById('fork').onclick = async () => {
  const slug = prompt('Idea slug to fork?');
  if(!slug) return;
  await fetch('/agent-action',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'fork',slug})});
  alert('forked');
};

const voiceInput = document.getElementById('voiceFile');
voiceInput.onchange = e => uploadVoice(e.target.files[0]);

let recorder, chunks=[];
const recordBtn = document.getElementById('record');
recordBtn.onclick = async () => {
  if(recorder && recorder.state==='recording'){ recorder.stop(); recordBtn.textContent='Record'; return; }
  chunks=[];
  const stream = await navigator.mediaDevices.getUserMedia({audio:true});
  recorder = new MediaRecorder(stream);
  recorder.ondataavailable = e => chunks.push(e.data);
  recorder.onstop = () => {
    const blob = new Blob(chunks,{type:'audio/wav'});
    uploadVoice(blob);
  };
  recorder.start();
  recordBtn.textContent='Stop';
};

function uploadVoice(file){
  const fd = new FormData();
  fd.append('file', file, 'voice.wav');
  fetch('/voice-upload',{method:'POST',body:fd}).then(r=>r.text()).then(t=>{document.getElementById('log').textContent=t; load();});
}

load();
