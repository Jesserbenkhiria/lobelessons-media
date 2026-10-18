// Lobe Lessons renderer: builds the Short (frames) or the carousel (slides) from a day spec.
// usage: node render.js short    days/dayNN.json OUTDIR [stillTimes...]
//        node render.js carousel days/dayNN.json OUTDIR
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const [, , MODE, SPEC, OUT, ...STILLS] = process.argv;
const spec = JSON.parse(fs.readFileSync(SPEC, 'utf8'));
const A = path.join(__dirname, 'assets', 'mascot');
const M = n => fs.readFileSync(path.join(A, `brain_${n}.svg`), 'utf8');
const C = { green: '#2F9E6B', red: '#D9534F', gold: '#C9A24B', muted: '#8a8478', dark: '#111' };
const esc = s => String(s);
const mk = h => esc(h || '').replace(/<(r|g|y|m)>/g, (_, c) => `<span class="c-${c}">`).replace(/<\/(r|g|y|m)>/g, '</span>');
fs.mkdirSync(OUT, { recursive: true });

let TL = null, W = [];
if (MODE === 'short') { TL = JSON.parse(fs.readFileSync(path.join(OUT, 'timeline.json'), 'utf8')); W = TL.words; }
const lineStart = id => (TL.lines.find(l => l.id === id) || TL.lines[0]).start;
// resolve "at": word in the scene's line, "word#2" for the 2nd occurrence, "+1.2" = seconds after line start
function at(v, line) {
  if (MODE !== 'short') return 0;
  const s0 = lineStart(line);
  if (v === undefined || v === null) return s0 + 0.05;
  if (typeof v === 'number') return s0 + v;
  if (String(v).startsWith('+')) return s0 + parseFloat(v);
  let [word, nth] = String(v).split('#'); nth = (+nth || 1) - 1;
  const c = W.filter(w => w.line === line && w.w.toLowerCase().replace(/[^a-z0-9$%']/g, '').startsWith(word.toLowerCase().replace(/[^a-z0-9$%']/g, '')));
  return c[nth] ? c[nth].s : s0 + 0.05;
}
const D = (t, cls = 'el') => `class="${cls}" data-in="${t.toFixed(2)}"`;

function el(e, line) {
  const t = at(e.at, line);
  switch (e.type) {
    case 'headline': return `<div ${D(t)}><div class="h" style="font-size:${e.size || 110}px;${e.center ? 'text-align:center' : ''}">${mk(e.html)}</div></div>`;
    case 'sub': return `<div ${D(t)}><div class="sub" style="${e.center ? 'text-align:center;' : ''}${e.max ? `max-width:${e.max}px;` : ''}${e.ml ? `margin-left:${e.ml}px` : ''}">${mk(e.html)}</div></div>`;
    case 'pill': { const col = C[e.color || 'gold']; const dark = e.color === 'dark';
      return `<div ${D(t)} style="${e.center ? 'text-align:center' : ''}"><span class="pill" style="background:${dark ? '#111' : col + '22'};color:${dark ? '#fff' : col}">${mk(e.text)}</span></div>`; }
    case 'stamp': return `<div ${D(t, 'el pop')} style="${e.center ? 'text-align:center' : ''}"><span class="stamp" style="color:${C[e.color || 'red']};border-color:${C[e.color || 'red']};font-size:${e.size || 180}px">${mk(e.text)}</span></div>`;
    case 'book': return `<div ${D(t)} style="display:flex;gap:56px;align-items:flex-start"><div class="book"><div class="bk1">${mk(e.title)}</div><div class="bk2">${mk(e.author || '')}</div></div>${e.side ? `<div class="sub" style="padding-top:30px">${mk(e.side)}</div>` : ''}</div>`;
    case 'rule': return e.items.map(it => `<div ${D(at(it.at, line))}><div class="card rowc"><div class="ic" style="background:${C[it.color]}22;color:${C[it.color]}">${it.icon || '•'}</div><div><div class="h" style="font-size:${it.size || 72}px;color:${C[it.color]}">${mk(it.title)}</div><div class="sub">${mk(it.sub || '')}</div></div></div></div>`).join('');
    case 'rows': {
      const rows = e.rows.map(r => `<div ${D(at(r.at, line))} style="position:relative" data-val="${(r.r || '').replace(/[^0-9.\-−]/g, '').replace('−', '-')}"><div class="row"><span>${mk(r.l)}</span><span style="color:${C[r.color || 'dark']}">${mk(r.r || '')}</span></div></div>`).join('');
      const hdr = e.header ? `<div class="row" style="font:600 30px Inter;color:#8a8478">${e.header[0]}<span>${e.header[1] || ''}</span></div>` : '';
      const ctr = e.counter ? `<div class="row" style="background:#f7f3ec">${mk(e.counter.label)} <span class="ctr" style="color:${C[e.counter.color || 'red']}" data-prefix="${e.counter.prefix || '$'}">${e.counter.final || '0'}</span></div>` : '';
      return `<div ${D(t)}><div class="card" style="overflow:hidden">${hdr}${rows}${ctr}</div></div>`; }
    case 'list': return e.rows.map(r => `<div ${D(at(r.at, line))}><div class="card row" style="border:none;padding:32px 40px"><span>${mk(r.l)}</span><span style="color:${C[r.color || 'green']}">${mk(r.r || '')}</span></div></div>`).join('');
    case 'flow': return e.rows.map(r => `<div ${D(at(r.at, line))}><div class="card" style="padding:30px 42px"><div style="font:700 30px Inter;color:${C[r.color || 'muted']};letter-spacing:.06em">${mk(r.tag)}</div><div style="font:700 48px Inter;margin-top:8px">${mk(r.text)}</div></div></div>`).join('');
    case 'quote': {
      const h = mk(e.html).replace(/<hl at="([^"]+)" c="([a-z]+)">(.*?)<\/hl>/g, (_, a, c, txt) => `<span class="hl" data-hl="${at(a, line).toFixed(2)}" data-c="${C[c]}">${txt}</span>`);
      return `<div ${D(t)}><div class="card" style="padding:52px 56px"><div class="h" style="font-size:${e.size || 72}px">${h}</div></div></div>`; }
    case 'space': return `<div style="height:${e.h || 40}px"></div>`;
    case 'html': return `<div ${D(t)}>${e.html}</div>`;
  }
  return '';
}

const POS = MODE === 'short'
  ? { br: 'right:-40px;bottom:470px', bl: 'left:-50px;bottom:470px', bc: 'left:50%;bottom:470px;margin-left:-VAR', tr: 'right:30px;top:230px', mr: 'right:-40px;top:700px', center: 'left:50%;top:300px;margin-left:-VAR' }
  : { br: 'right:-40px;bottom:130px', bl: 'left:-60px;bottom:130px', bc: 'left:50%;bottom:130px;margin-left:-VAR', tr: 'right:20px;top:92px', mr: 'right:-40px;top:520px', center: 'left:50%;top:180px;margin-left:-VAR' };
function lobe(l, t) {
  if (!l) return '';
  const size = l.size || 480;
  const pos = (POS[l.pos || 'br'] || POS.br).replace('VAR', (size / 2) + 'px');
  return `<div class="lobe" data-in="${t.toFixed(2)}" style="${pos};width:${size}px">${M(l.pose || 'explain')}</div>`;
}

const CSS = `
*{box-sizing:border-box} body{margin:0}
.c-r{color:${C.red}} .c-g{color:${C.green}} .c-y{color:${C.gold}} .c-m{color:#b9b2a5}
.h{font-family:'Inter Display',Inter,sans-serif;font-weight:800;letter-spacing:-0.035em;line-height:1.03}
.sub{font:500 42px/1.35 Inter;color:#5e5a52} .sub b{color:#111}
.pill{display:inline-block;font:700 34px Inter;padding:16px 34px;border-radius:50px}
.card{background:#fff;border-radius:38px;box-shadow:0 28px 70px rgba(60,45,20,.09);border:1px solid #ece6da}
.rowc{display:flex;gap:40px;align-items:center;padding:40px 48px}
.ic{width:120px;height:120px;flex:none;border-radius:60px;display:flex;align-items:center;justify-content:center;font:800 76px Inter}
.row{display:flex;justify-content:space-between;align-items:center;padding:26px 42px;font:600 44px Inter;border-bottom:1px solid #f0ebe1}
.book{position:relative;flex:none;width:360px;height:480px;border-radius:12px 28px 28px 12px;background:#fff;border:1px solid #e6dfd1;box-shadow:0 30px 70px rgba(60,45,20,.14), inset 16px 0 0 #efe8da;padding:64px 40px 0 52px;color:#111}
.book:after{content:'';position:absolute;right:54px;top:0;width:34px;height:110px;background:${C.gold};clip-path:polygon(0 0,100% 0,100% 100%,50% 82%,0 100%)}
.bk1{font:800 54px/1.03 'Inter Display';letter-spacing:-.03em} .bk2{position:absolute;bottom:44px;left:52px;font:600 26px Inter;color:#8a8478}
.stamp{display:inline-block;font-family:'Inter Display';font-weight:900;line-height:1;border:14px solid;border-radius:30px;padding:10px 46px;transform:rotate(-7deg)}
.lobe{position:absolute;z-index:4} .lobe svg{width:100%;height:auto;display:block}
.content{position:absolute;left:90px;right:90px;display:flex;flex-direction:column;gap:30px}
`;

async function main() {
  const b = await chromium.launch();
  if (MODE === 'carousel') {
    const car = spec.carousel; const N = car.slides.length;
    const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
    for (let i = 0; i < N; i++) {
      const s = car.slides[i];
      const html = `<html><head><meta charset="utf-8"><style>${CSS}
       .s{width:1080px;height:1350px;background:#F5F1EA;position:relative;overflow:hidden;color:#111}
       .top{position:absolute;top:56px;left:90px;right:90px;display:flex;justify-content:space-between;font:600 26px Inter;color:#8a8478;letter-spacing:.02em}
       .sig{position:absolute;left:60px;right:60px;bottom:44px;height:76px;border-radius:40px;background:#111;color:#F5F1EA;display:flex;align-items:center;justify-content:center;gap:16px;font:500 28px Inter;z-index:5}
       .sig b{font-weight:700;color:#fff} .sig .dot{color:${C.gold};font-weight:800}
       .swipe{position:absolute;right:90px;top:120px;font:700 30px Inter}
       .content{top:${s.top || 140}px} .h{font-size:90px}</style></head><body><div class="s">
       <div class="top"><span>${car.label}</span><span>${i + 1}/${N}</span></div>
       <div class="content">${s.els.map(e => el(e)).join('')}</div>${lobe(s.lobe, 0)}
       ${i === 0 ? '<div class="swipe">Swipe →</div>' : ''}
       <div class="sig"><span>🧠 <b>Follow @lobelessons</b></span><span class="dot">·</span><span style="font-style:italic">Open your brain, one lesson a day.</span></div>
       </div></body></html>`;
      await p.setContent(html); await p.waitForTimeout(120);
      await p.screenshot({ path: path.join(OUT, `slide_${String(i + 1).padStart(2, '0')}.png`) });
    }
    await b.close(); console.log('slides', N); return;
  }
  // ---- SHORT ----
  const sh = spec.short; const scenes = sh.scenes;
  const starts = scenes.map(s => lineStart(s.line));
  let body = '';
  scenes.forEach((s, i) => {
    const a = i === 0 ? 0 : starts[i] - 0.05, z = i + 1 < scenes.length ? starts[i + 1] - 0.05 : TL.duration + 1;
    if (s.cta) {
      body += `<div class="scene" data-in="${a}" data-out="${z}">${lobe({ pose: 'approve', pos: 'center', size: 640 }, a + 0.05)}
        <div class="content" style="top:960px;align-items:center;text-align:center">
        <div ${D(a + 0.4)}><div class="h" style="font-size:100px;text-align:center">Follow <span class="c-y">Lobe</span></div></div>
        <div ${D(a + 0.8)}><div class="sub" style="text-align:center">${mk(s.sub || 'One book lesson. Every day.')}</div></div>
        <div ${D(a + 1.1)}><span class="pill" style="background:#111;color:#fff;font-size:40px;padding:20px 44px">@lobelessons</span></div></div></div>`;
      return;
    }
    body += `<div class="scene" data-in="${a}" data-out="${z}"><div class="content" style="top:${s.top || 280}px">${s.els.map(e => el(e, s.line)).join('')}</div>${lobe(s.lobe, a + 0.3)}</div>`;
  });
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}
   #v{width:1080px;height:1920px;background:#F5F1EA;position:relative;overflow:hidden;color:#111}
   .hdr{position:absolute;top:120px;left:90px;right:90px;display:flex;justify-content:space-between;font:600 28px Inter;color:#8a8478;letter-spacing:.03em;z-index:10}
   .prog{position:absolute;top:176px;left:90px;right:90px;height:6px;border-radius:3px;background:#e7e0d2;z-index:10} .prog i{display:block;height:100%;border-radius:3px;background:#111;width:0}
   .scene{position:absolute;inset:0}
   #cap{position:absolute;left:60px;right:60px;top:1500px;text-align:center;z-index:20}
   #cap span{display:inline-block;font:800 64px 'Inter Display';letter-spacing:-.02em;margin:0 9px;padding:2px 14px;border-radius:16px;color:#111}
   #cap span.on{background:#111;color:#F5C84C}
   .handle{position:absolute;left:0;right:0;top:1640px;text-align:center;font:600 30px Inter;color:#a39b8c;z-index:20}
  </style></head><body><div id="v"><div class="hdr"><span>${sh.label}</span><span>🧠 Lobe Lessons</span></div><div class="prog"><i></i></div>
  ${body}<div id="cap"></div><div class="handle">@lobelessons</div></div>
  <script>
  const ENV=${JSON.stringify(TL.env || [])},WORDS=${JSON.stringify(W)},DUR=${TL.duration};
  const ease=x=>{x=Math.min(1,Math.max(0,x));return 1-Math.pow(1-x,3)};
  const back=x=>{x=Math.min(1,Math.max(0,x));const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2)};
  const chunks=[];let cur=[];
  WORDS.forEach((w,i)=>{cur.push(w);const nx=WORDS[i+1];const txt=cur.map(c=>c.w).join(' ');
   if(cur.length>=3||txt.length>16||/[.?!,:]$/.test(w.w)||!nx||nx.line!==w.line){chunks.push(cur);cur=[]}});
  window.setT=function(t){
   document.querySelector('.prog i').style.width=(100*t/DUR)+'%';
   document.querySelectorAll('.scene').forEach(s=>{const a=+s.dataset.in,b=+s.dataset.out;const vis=t>=a-0.01&&t<b+0.35;
    s.style.display=vis?'block':'none';if(!vis)return;const pin=a<0.05?1:ease((t-a)/0.35),pout=ease((t-b)/0.3);
    s.style.opacity=pin*(1-pout);s.style.filter='blur('+((1-pin)*14+pout*18)+'px)';s.style.transform='scale('+(0.97+0.03*pin+0.04*pout)+')';
    let sum=0;s.querySelectorAll('[data-val]').forEach(r=>{if(t>=+r.dataset.in)sum+=parseFloat(r.dataset.val)||0});
    s.querySelectorAll('.ctr').forEach(c=>{c.textContent=(sum<0?'−':'')+c.dataset.prefix+Math.abs(sum).toLocaleString('en-US')});});
   document.querySelectorAll('.el').forEach(e=>{const a=+e.dataset.in;
    if(e.classList.contains('pop')){const q=back((t-a)/0.35);e.style.opacity=Math.min(1,Math.max(0,(t-a)/0.12));e.style.transform='scale('+(1.6-0.6*q)+')';return;}
    const p=ease((t-a)/0.55);e.style.opacity=p;e.style.filter='blur('+((1-p)*16)+'px)';e.style.transform='translateY('+((1-p)*36)+'px)';});
   const lv=ENV[Math.min(ENV.length-1,Math.floor(t*30))]||0;
   document.querySelectorAll('.lobe').forEach(l=>{const a=+l.dataset.in;const q=back((t-a)/0.5);
    l.style.opacity=Math.min(1,Math.max(0,(t-a)/0.15));l.style.transformOrigin='50% 90%';
    l.style.transform='translateY('+(Math.sin(t*2.4)*8+(1-Math.min(1,q))*60)+'px) scale('+((0.6+0.4*q)*(1+lv*0.035))+') rotate('+(Math.sin(t*1.7)*1.5)+'deg)';});
   document.querySelectorAll('.hl').forEach(h=>{h.style.color=t>=+h.dataset.hl?h.dataset.c:''});
   const cap=document.getElementById('cap');const i=chunks.findIndex((c,k)=>t>=c[0].s-0.05&&(!chunks[k+1]||t<chunks[k+1][0].s-0.05));
   const ch=chunks[i];
   cap.innerHTML=(ch&&t<ch[ch.length-1].e+0.6)?ch.map(w=>'<span class="'+(t>=w.s&&t<w.e+0.05?'on':'')+'">'+w.w+'</span>').join(''):'';
  };
  </script></body></html>`;
  fs.writeFileSync(path.join(OUT, 'short.html'), html);
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto('file://' + path.resolve(OUT, 'short.html')); await p.waitForTimeout(300);
  // sound-effect cue sheet derived from the timeline
  const ev = await p.evaluate(() => {
    const out = []; const seen = new Set();
    document.querySelectorAll('.scene').forEach((s, i) => { if (i > 0) out.push([+s.dataset.in - 0.15, 'whoosh', 0.12]); });
    document.querySelectorAll('.el').forEach(e => { const t = +e.dataset.in; const k = t.toFixed(1); if (seen.has(k)) return; seen.add(k);
      if (e.classList.contains('pop')) out.push([t, 'stamp', 0.45]); else if (e.querySelector('.card,.pill,.row')) out.push([t, 'pop', 0.16]); });
    const last = document.querySelectorAll('.scene'); out.push([+last[last.length - 1].dataset.in + 0.1, 'cash', 0.22]);
    return out.filter(x => x[0] > 0.3);
  });
  ev.unshift([0.05, 'thud', 0.3]);
  fs.writeFileSync(path.join(OUT, 'events.json'), JSON.stringify(ev));
  const fps = 30;
  const times = STILLS.length ? STILLS.map(Number) : [...Array(Math.ceil(TL.duration * fps)).keys()].map(i => i / fps);
  const dir = path.join(OUT, STILLS.length ? 'stills' : 'frames'); fs.mkdirSync(dir, { recursive: true });
  let n = 0;
  for (const t of times) {
    await p.evaluate(t => setT(t), t);
    await p.screenshot({ path: path.join(dir, STILLS.length ? `still_${t.toFixed(1)}.jpg` : `f_${String(n).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 });
    n++;
  }
  await b.close(); console.log(STILLS.length ? 'stills' : 'frames', n);
}
main();
