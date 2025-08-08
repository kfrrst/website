
const qs = new URLSearchParams(location.search);
const projectId = qs.get('projectId') || 'demo';
const documentId = qs.get('docId');
const clientName = qs.get('client') || 'Client';
const projectName = qs.get('project') || 'Project';

document.getElementById('clientName').textContent = clientName;
document.getElementById('projectName').textContent = projectName;

const canvas = document.getElementById('pad');
const ctx = canvas.getContext('2d'); ctx.lineWidth = 2; ctx.lineCap = 'round';
let drawing=false, last=null;
function pos(e){ const r=canvas.getBoundingClientRect(); const p=('touches' in e? e.touches[0]:e); return {x:p.clientX-r.left,y:p.clientY-r.top}; }
canvas.addEventListener('mousedown', e=>{ drawing=true; last=pos(e); });
canvas.addEventListener('mousemove', e=>{ if(!drawing) return; const p=pos(e); ctx.beginPath(); ctx.moveTo(last.x,last.y); ctx.lineTo(p.x,p.y); ctx.stroke(); last=p; });
window.addEventListener('mouseup', ()=> drawing=false);
canvas.addEventListener('touchstart', e=>{ drawing=true; last=pos(e); });
canvas.addEventListener('touchmove', e=>{ if(!drawing) return; const p=pos(e); ctx.beginPath(); ctx.moveTo(last.x,last.y); ctx.lineTo(p.x,p.y); ctx.stroke(); last=p; });
window.addEventListener('touchend', ()=> drawing=false);

document.getElementById('clearBtn').onclick = ()=>{ ctx.clearRect(0,0,canvas.width,canvas.height); };
document.getElementById('submitBtn').onclick = async ()=>{
  const typedName = document.getElementById('typedName').value;
  const dataUrl = canvas.toDataURL('image/png');
  const payload = { documentId, projectId, signerRole:'client', method: dataUrl.length>100 ? 'drawn':'typed', dataUrl, typedName };
  const r = await fetch('/api/sign-events', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
  const j = await r.json();
  if (j.ok) alert('Signature saved. Thank you!');
  else alert('Error: '+(j.error||'unknown'));
};
