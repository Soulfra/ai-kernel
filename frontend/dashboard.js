async function load(){
  const res = await fetch('/dashboard?json=1');
  const data = await res.json();
  document.getElementById('info').innerHTML = `<p>Vault: <b>${data.user}</b></p><p>Tokens: ${data.tokens}</p>`;
  if(data.transcript) document.getElementById('voice').textContent = 'Last voice: '+data.transcript;
  if(data.idea) document.getElementById('idea').innerHTML = `<pre>${JSON.stringify(data.idea,null,2)}</pre>`;
  fetch(`/vault-prompts/${data.user}/claude-reflection.json`).then(r=>r.ok?r.json():null).then(d=>{ if(d) document.getElementById('reflection').innerHTML=`<h2 class='font-semibold'>Claude Reflection</h2><pre>${d.response||''}</pre>`; });
}

async function reflect(){
  const res = await fetch('/audit-vault',{method:'POST'});
  document.getElementById('log').textContent = await res.text();
}

document.getElementById('reflect').onclick = reflect;

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
