const drop = document.getElementById('drop');
const input = document.getElementById('file');

function handle(files){
  const fd = new FormData();
  for(const f of files) fd.append('files', f);
  fetch('/upload', { method:'POST', body: fd })
    .then(r=>r.json())
    .then(d=>{ document.getElementById('log').textContent = JSON.stringify(d,null,2); })
    .catch(e=>{ document.getElementById('log').textContent = e.toString(); });
}

drop.addEventListener('dragover', e=>{ e.preventDefault(); drop.classList.add('bg-gray-100'); });
drop.addEventListener('dragleave', ()=> drop.classList.remove('bg-gray-100'));
drop.addEventListener('drop', e=>{ e.preventDefault(); drop.classList.remove('bg-gray-100'); handle(e.dataTransfer.files); });
input.onchange = e => handle(e.target.files);
