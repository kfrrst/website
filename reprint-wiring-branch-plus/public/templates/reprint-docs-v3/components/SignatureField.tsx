
import React, { useRef, useState, useEffect } from 'react';

export default function SignatureField({ onChange }:{ onChange: (payload:{type:'drawn'|'typed', dataUrl?:string, text?:string}) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [typing, setTyping] = useState('');
  const [drawing, setDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.lineWidth = 2; ctx.lineCap = 'round';
    let last:{x:number,y:number}|null=null;
    function pos(e:MouseEvent|TouchEvent){
      const r = canvas.getBoundingClientRect();
      const p = ('touches' in e ? e.touches[0] : e) as any;
      return { x: (p.clientX - r.left), y: (p.clientY - r.top) };
    }
    function down(e:any){ setDrawing(true); last = pos(e); }
    function move(e:any){ if(!drawing) return; const p = pos(e); ctx.beginPath(); ctx.moveTo(last!.x,last!.y); ctx.lineTo(p.x,p.y); ctx.stroke(); last=p; }
    function up(){ setDrawing(false); last=null; onChange({type:'drawn', dataUrl: canvas.toDataURL('image/png')}); }
    canvas.addEventListener('mousedown',down); canvas.addEventListener('mousemove',move); window.addEventListener('mouseup',up);
    canvas.addEventListener('touchstart',down); canvas.addEventListener('touchmove',move); window.addEventListener('touchend',up);
    return ()=>{
      canvas.removeEventListener('mousedown',down); canvas.removeEventListener('mousemove',move); window.removeEventListener('mouseup',up);
      canvas.removeEventListener('touchstart',down); canvas.removeEventListener('touchmove',move); window.removeEventListener('touchend',up);
    };
  }, [onChange]);

  return (
    <div className="space-y-2">
      <label className="block text-sm text-gray-600">Signature</label>
      <canvas ref={canvasRef} width={480} height={160} style={{border:'1px solid #ddd', background:'#fff'}}/>
      <div>
        <input value={typing} onChange={e => { setTyping(e.target.value); onChange({type:'typed', text: e.target.value}); }} placeholder="Type your name" />
      </div>
    </div>
  );
}
