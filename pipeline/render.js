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
    case 'big': { // giant rolling number: steps [{v, at, color, label}] ; counts to each new value and flips colour
      const st = e.steps.map(x => ({ v: x.v, t: +at(x.at, line).toFixed(2), c: C[x.color || 'dark'] || x.color, l: x.label || '' }));
      return `<div ${D(st[0].t, 'el bigel')} style="text-align:${e.align || 'left'}"><div class="big" data-steps='${JSON.stringify(st)}' data-sign="${e.sign === false ? 0 : 1}" data-prefix="${e.prefix ?? '$'}" data-suffix="${e.suffix || ''}" style="font-size:${e.size || 190}px"></div><div class="biglab" style="font:800 ${e.labelSize || 44}px Inter;letter-spacing:.04em"></div></div>`; }
    case 'versus': { // two option cards side by side (Money Game)
      const card = (o, col) => `<div class="card" style="flex:1;padding:34px 26px;text-align:center;border:5px solid ${C[col]}"><div style="font:900 70px 'Inter Display';color:${C[col]}">${o.tag}</div><div class="h" style="font-size:${o.size || 92}px;margin-top:6px">${mk(o.big)}</div><div style="font:600 32px Inter;color:#5e5a52;margin-top:8px">${mk(o.sub || '')}</div></div>`;
      return `<div ${D(t)} style="display:flex;gap:28px">${card(e.a, e.a.color || 'gold')}${card(e.b, e.b.color || 'green')}</div>`; }
    case 'split': { // two futures: two columns, each with a title and a rolling counter
      const col = (o) => { const st = (o.steps || []).map(x => ({ v: x.v, t: +at(x.at, line).toFixed(2), c: C[x.color || 'dark'] || x.color, l: x.label || '' }));
        return `<div style="flex:1 1 0;min-width:0;text-align:center;padding:26px 10px;border-radius:34px;background:#ffffffd9;border:7px solid ${o.bg || '#e8dfd0'};box-shadow:0 10px 0 ${o.bg || '#e8dfd0'}"><div style="font:800 40px Inter;letter-spacing:.03em">${mk(o.title)}</div>
          ${st.length ? `<div class="big" data-sign="0" data-steps='${JSON.stringify(st)}' data-prefix="$" data-suffix="" style="font-size:${e.size || 118}px;margin-top:14px;transform-origin:50% 60%"></div><div class="biglab" style="font:800 30px Inter;letter-spacing:.04em"></div>` : ''}</div>`; };
      return `<div ${D(t)} style="display:flex;gap:22px;align-items:stretch">${col(e.left)}${col(e.right)}</div>`; }
    case 'small': return `<div ${D(t)}><div style="font:500 26px Inter;color:#7d766a">${mk(e.text)}</div></div>`;
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
  if (MODE === 'short' && !spec.static_lobe) {
    // animated rig: wider canvas (480 vs 400 units) so the hands have room; keep the brain where the static pose had it
    const w = Math.round(size * 1.3), extra = Math.round(size * 0.15), pk = l.pos || 'br';
    const pos = (POS[pk] || POS.br).replace('VAR', (w / 2) + 'px')
      .replace(/(right|left):(-?\d+)px/, (_, k, v) => `${k}:${+v - extra}px`);
    const side = pk === 'bl' ? 'l' : 'r';
    return `<div class="lobe rig" data-in="${t.toFixed(2)}" data-pose="${l.pose || 'explain'}" data-side="${side}" style="${pos};width:${w}px"></div>`;
  }
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
  if (MODE === 'cover') {
    // Reel/Short cover: hook + Lobe, all key content inside the centre square (y 420-1500) so grid crops stay clean.
    const sh = spec.short; const cv = sh.cover || {};
    const first = sh.scenes[0]; const hl = (first.els || []).find(e => e.type === 'headline');
    const html = cv.html || (hl ? hl.html : spec.lesson);
    const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
    await p.setContent(`<html><head><meta charset="utf-8"><style>${CSS}
      .v{width:1080px;height:1920px;background:#F5F1EA;position:relative;overflow:hidden;color:#111}
      .tag{position:absolute;top:470px;left:0;right:0;text-align:center}
      .hook{position:absolute;top:560px;left:80px;right:80px;text-align:center}
      .lobe{position:absolute;left:50%;top:960px;width:${cv.size || 520}px;margin-left:-${(cv.size || 520) / 2}px}
      .hdl{position:absolute;bottom:250px;left:0;right:0;text-align:center;font:600 32px Inter;color:#a39b8c}
      </style></head><body><div class="v">
      <div class="tag"><span class="pill" style="background:#111;color:#F5C84C;font-size:32px">${(sh.label || '').replace('·', '·')}</span></div>
      <div class="hook"><div class="h" style="font-size:${cv.textSize || 112}px">${mk(html)}</div></div>
      ${sh.format === 'sketch' ? (() => { const { lobeRig } = require('./lobe_rig.js');
          const br = lobeRig({ pose: 'shock', side: 'r', t: 0.9, lv: 0.4, tIn: 0, sw: [], seed: 1.3, who: 'broke' });
          const rr = lobeRig({ pose: cv.pose || 'idea', side: 'l', t: 1.2, lv: 0, tIn: 0, sw: [], seed: 0 });
          return `<div style="position:absolute;left:-110px;top:980px;width:700px">${br}</div><div style="position:absolute;right:-110px;top:980px;width:700px">${rr}</div>
            <div style="position:absolute;left:0;right:0;top:1440px;display:flex;justify-content:space-around;padding:0 70px"><span class="pill" style="background:#D9534F22;color:#D9534F">BROKE BRAIN</span><span class="pill" style="background:#2F9E6B22;color:#2F9E6B">RICH BRAIN</span></div>`; })()
        : `<div class="lobe">${M(cv.pose || (first.lobe && first.lobe.pose) || 'think')}</div>`}
      <div class="hdl">🧠 @lobelessons</div></div></body></html>`);
    await p.waitForTimeout(150);
    await p.screenshot({ path: path.join(OUT, 'cover.jpg'), type: 'jpeg', quality: 92 });
    await b.close(); console.log('cover ok'); return;
  }
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
      // short slides: enlarge headlines a little and center the content in the free space above Lobe (no big empty gap)
      await p.evaluate(() => {
        const c = document.querySelector('.content'), l = document.querySelector('.lobe'), sig = document.querySelector('.sig');
        const sigTop = sig.getBoundingClientRect().top; let lr = l ? l.getBoundingClientRect() : null;
        const bottom = (lr && lr.top > 450 ? lr.top + 40 : sigTop) - 40;
        const top0 = c.getBoundingClientRect().top, avail = bottom - top0;
        if (c.getBoundingClientRect().height > avail * 0.65) return;
        const hs = [...c.querySelectorAll('.h')];
        for (let k = 0; k < 10; k++) {
          hs.forEach(h => { h.style.fontSize = (parseFloat(getComputedStyle(h).fontSize) * 1.07) + 'px'; });
          if (c.getBoundingClientRect().height > avail * 0.8) { hs.forEach(h => { h.style.fontSize = (parseFloat(h.style.fontSize) / 1.07) + 'px'; }); break; }
        }
        const off = Math.max(0, (avail - c.getBoundingClientRect().height) / 2);
        c.style.top = (top0 + off) + 'px';
      });
      await p.screenshot({ path: path.join(OUT, `slide_${String(i + 1).padStart(2, '0')}.png`) });
    }
    await b.close(); console.log('slides', N); return;
  }
  // ---- SHORT v2 ("stage" style): big persistent Lobe, camera moves, mood backgrounds, props, loop ending ----
  if (MODE === 'short' && spec.short.style === 'stage') { await shortV2(b); await b.close(); return; }
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
  ${fs.readFileSync(path.join(__dirname, 'lobe_rig.js'), 'utf8')}
  const ENV=${JSON.stringify(TL.env || [])},WORDS=${JSON.stringify(W)},DUR=${TL.duration};
  // gesture switch times per rig: when the scene's elements appear (min 0.9s apart), plus a change every ~2.4s otherwise
  document.querySelectorAll('.lobe.rig').forEach((l,i)=>{const sc=l.closest('.scene');const a=+l.dataset.in,b=+sc.dataset.out;
    const ts=[...sc.querySelectorAll('.el')].map(e=>+e.dataset.in).filter(x=>x>a+0.7&&x<b-0.4).sort((x,y)=>x-y);const sw=[];let last=a;
    const push=x=>{if(x-last>=0.9){sw.push(x);last=x}};
    ts.forEach(x=>{while(x-last>2.6)push(last+2.4);push(x)});while(b-last>2.6)push(last+2.4);
    l._sw=sw;l._seed=i*0.77;});
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
    const p=a<0.4?1:ease((t-a)/0.55);e.style.opacity=p;e.style.filter='blur('+((1-p)*16)+'px)';e.style.transform='translateY('+((1-p)*36)+'px)';});
   const lv=ENV[Math.min(ENV.length-1,Math.floor(t*30))]||0;
   document.querySelectorAll('.lobe').forEach(l=>{const a=+l.dataset.in;const q=a<0.4?1:back((t-a)/0.5);
    l.style.opacity=a<0.4?1:Math.min(1,Math.max(0,(t-a)/0.15));l.style.transformOrigin='50% 90%';
    l.style.transform='translateY('+(Math.sin(t*2.4)*8+(1-Math.min(1,q))*60)+'px) scale('+((0.6+0.4*q)*(1+lv*0.035))+') rotate('+(Math.sin(t*1.7)*1.5)+'deg)';
    if(l.classList.contains('rig')&&l.parentElement.style.display!=='none'){const f=Math.floor(t*30);const lm=((ENV[f]||0)+(ENV[f+1]||0))/2;
     l.innerHTML=lobeRig({pose:l.dataset.pose,side:l.dataset.side,t:t,lv:lm,tIn:a,sw:l._sw,seed:l._seed});}});
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
// =====================================================================================================
// SHORT v2 ("stage" style)
//  - one persistent, big Lobe in the lower half (no double-Lobe at cuts); in sketches two brains side by side
//  - camera: slow push-in per scene, punch-in on stamps/key moments, shake on shock
//  - mood backgrounds (bad = warm red, good = green, neutral) with drifting emoji props
//  - every scene shows its headline within 0.3 s (no dead frames)
//  - no end card: a "Follow" badge slides in during the last line and the video loops into the hook
// scene fields: mood: bad|good|gold|neutral, props: [emoji...], lobe: {pose, who: 'broke'|'rich'}
async function shortV2(b) {
  const sh = spec.short; const scenes = sh.scenes.filter(s => !s.cta);
  const sketch = sh.format === 'sketch';
  const starts = scenes.map(s => lineStart(s.line));
  const BG = sh.clean ? { neutral: '#F6EFE4', bad: '#FBD3C7', good: '#D9F2E3', gold: '#FBEBC5' } : { neutral: '#F5F1EA', bad: '#F9E1DA', good: '#E2F1E6', gold: '#F8EED8' };
  const PROPS = { bad: ['💸', '📉', '😰'], good: ['💰', '📈', '✨'], gold: ['⏳', '✨', '🪙'], neutral: ['📚', '✨', '💡'] };
  let body = '';
  scenes.forEach((s, i) => {
    const a = i === 0 ? 0 : starts[i] - 0.05, z = i + 1 < scenes.length ? starts[i + 1] - 0.05 : TL.duration + 1;
    const who = (s.lobe && s.lobe.who) || (s.lobe && s.lobe.pos === 'bl' ? 'broke' : 'rich');
    const mood = s.mood || (sketch ? (who === 'broke' ? 'bad' : 'good') : 'neutral');
    // no dead frames: the first headline/quote shows right away
    const els = (s.els || []).map(e => Object.assign({}, e));
    const firstBig = els.find(e => e.type === 'headline' || e.type === 'quote');
    if (firstBig && at(firstBig.at, s.line) > a + 0.35) firstBig.at = '+0.05';
    const props = (s.props || PROPS[mood] || []).slice(0, 4);
    const pr = props.map((p, k) => `<div class="prop" data-k="${k}" style="left:${[70, 860, 40, 900][k]}px;top:${[620, 580, 1330, 1300][k]}px">${p}</div>`).join('');
    body += `<div class="scene" data-in="${a}" data-out="${z}" data-bg="${BG[mood] || BG.neutral}" data-pose="${(s.lobe && s.lobe.pose) || 'explain'}" data-who="${who}" data-react="${(s.lobe && s.lobe.react) || ''}">
      <div class="props">${pr}</div><div class="content" style="top:${s.top || 250}px">${els.map(e => el(e, s.line)).join('')}</div></div>`;
  });
  const stage = sketch
    ? `<div id="stage"><div class="rig2" id="rb" style="left:${sh.clean ? -250 : -130}px"></div><div class="rig2" id="rr" style="right:${sh.clean ? -250 : -130}px"></div></div>`
    : `<div id="stage"><div class="rig1" id="r1"></div></div>`;
  const lastLine = TL.lines[TL.lines.length - 1];
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}
   #v{width:1080px;height:1920px;background:#F5F1EA;position:relative;overflow:hidden;color:#111}
   #cam{position:absolute;inset:0;transform-origin:50% 45%}
   #topbar{position:absolute;left:0;right:0;top:0;height:215px;z-index:9}
   .hdr{position:absolute;top:120px;left:90px;right:90px;display:flex;justify-content:space-between;font:600 28px Inter;color:#8a8478;letter-spacing:.03em;z-index:10}
   .prog{position:absolute;top:176px;left:90px;right:90px;height:6px;border-radius:3px;background:rgba(0,0,0,.08);z-index:10} .prog i{display:block;height:100%;border-radius:3px;background:#111;width:0}
   .scene{position:absolute;inset:0}
   .props{position:absolute;inset:0;z-index:1} .prop{position:absolute;font-size:150px;opacity:.0}
   .content{z-index:3}
   #stage{position:absolute;left:0;right:0;top:760px;height:700px;z-index:4}
   .rig1{position:absolute;left:50%;width:960px;margin-left:-480px;top:20px}
   .rig2{position:absolute;width:${sh.clean ? 960 : 780}px;top:${sh.clean ? 0 : 40}px}
   .rig1 svg,.rig2 svg{width:100%;height:auto;display:block}
   .tag{position:absolute;top:-6px;font:800 30px Inter;padding:10px 26px;border-radius:40px;letter-spacing:.04em}
   #cap{position:absolute;left:60px;right:60px;top:1500px;text-align:center;z-index:20}
   #cap span{display:inline-block;font:800 66px 'Inter Display';letter-spacing:-.02em;margin:0 9px;padding:2px 14px;border-radius:16px;color:#111}
   #cap span.on{background:#111;color:#F5C84C}
   ${sh.clean ? ".hdr,.prog,#topbar{display:none}" : ""}
   .big{font-family:'Inter Display';font-weight:900;letter-spacing:-.05em;line-height:.95;display:inline-block;transform-origin:0 60%}
   #follow{position:absolute;left:50%;top:1640px;transform:translateX(-50%);z-index:21;white-space:nowrap;font:800 40px Inter;background:#111;color:#fff;padding:20px 44px;border-radius:60px;opacity:0}
   #follow b{color:#F5C84C}
  </style></head><body><div id="v"><div id="topbar"></div><div class="hdr"><span>${sh.label}</span><span>🧠 Lobe Lessons</span></div><div class="prog"><i></i></div>
  <div id="cam">${body}${stage}</div><div id="cap"></div><div id="follow">＋ Follow <b>@lobelessons</b></div></div>
  <script>
  ${fs.readFileSync(path.join(__dirname, 'lobe_rig.js'), 'utf8')}
  const ENV=${JSON.stringify(TL.env || [])},WORDS=${JSON.stringify(W)},DUR=${TL.duration},SKETCH=${sketch};
  const LINES=${JSON.stringify(TL.lines)},LAST=${JSON.stringify(lastLine)};
  const SC=[...document.querySelectorAll('.scene')];
  // fit content above the stage (zoom down if too tall)
  SC.forEach((s,i)=>{const c=s.querySelector('.content');    const top=c.getBoundingClientRect().top,h=c.getBoundingClientRect().height,max=720-top;
    if(h>max)c.style.zoom=(max/h).toFixed(3);else c.style.top=(top+Math.min(120,(max-h)/2))+'px';});
  // gesture switch times per scene (elements appearing), shared by the rig(s)
  SC.forEach(sc=>{const a=+sc.dataset.in,b=+sc.dataset.out;const ts=[...sc.querySelectorAll('.el')].map(e=>+e.dataset.in).filter(x=>x>a+0.7&&x<b-0.4).sort((x,y)=>x-y);
    const sw=[];let last=a;const push=x=>{if(x-last>=0.9){sw.push(x);last=x}};ts.forEach(x=>{while(x-last>2.6)push(last+2.4);push(x)});while(b-last>2.6)push(last+2.4);sc._sw=sw;});
  const POPS=[...document.querySelectorAll('.el.pop')].map(e=>+e.dataset.in);
  const NEG=[];document.querySelectorAll('.big').forEach(b=>{const st=JSON.parse(b.dataset.steps);st.slice(1).forEach(x=>POPS.push(x.t));st.forEach((x,i)=>{if(x.v<0&&(i>0||x.t>0.3))NEG.push(x.t)})});
  const fmt=(v,b)=>(b.dataset.sign==='0'?(v<0?'−':''):(v<0?'−':'+'))+b.dataset.prefix+Math.round(Math.abs(v)).toLocaleString('en-US')+b.dataset.suffix;
  const ease=x=>{x=Math.min(1,Math.max(0,x));return 1-Math.pow(1-x,3)};
  const back=x=>{x=Math.min(1,Math.max(0,x));const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2)};
  const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
  const mix=(a,b,p)=>{const x=hex(a),y=hex(b);return 'rgb('+x.map((v,i)=>Math.round(v+(y[i]-v)*p)).join(',')+')'};
  const chunks=[];let cur=[];
  WORDS.forEach((w,i)=>{cur.push(w);const nx=WORDS[i+1];const txt=cur.map(c=>c.w).join(' ');
   if(cur.length>=3||txt.length>16||/[.?!,:]$/.test(w.w)||!nx||nx.line!==w.line){chunks.push(cur);cur=[]}});
  const lineAt=t=>{let k=0;LINES.forEach((l,i)=>{if(t>=l.start-0.1)k=i});return LINES[k]};
  window.setT=function(t){
   document.querySelector('.prog i').style.width=(100*t/DUR)+'%';
   let ci=0;SC.forEach((s,i)=>{if(t>=+s.dataset.in-0.01)ci=i});const cs=SC[ci],ca=+cs.dataset.in;
   // camera: every other cut is a tight shot (1.14x, framed on the speaker), then a slow 7% push-in,
   // a hard 14% punch when a stamp lands, a 4% bump on each new element, and a shake on shock
   const ts=t-ca;const tight=ci%2===1;let z=(tight?1.1:1)+0.06*Math.min(1,ts/3.5);
   POPS.forEach(a=>{if(t>=a)z+=0.1*Math.exp(-(t-a)*4)});
   cs.querySelectorAll('.el:not(.pop)').forEach(e=>{const a=+e.dataset.in;if(a>ca+0.3&&t>=a)z+=0.04*Math.exp(-(t-a)*6)});
   let ox=50;z=Math.min(z,1.2);
   let sx=0,sy=0;if(cs.dataset.pose==='shock'&&ts<0.7){const k=(1-ts/0.7)*16;sx=Math.sin(t*70)*k;sy=Math.cos(t*55)*k*0.6;}
   NEG.forEach(a=>{const d=t-a;if(d>=0&&d<0.55){const k=(1-d/0.55)*22;sx+=Math.sin(t*80)*k;sy+=Math.cos(t*63)*k*0.7;z+=0.08*(1-d/0.55);}});
   // camera zooms the characters + background props; the text only pulses gently (stays fully on screen)
   const sxG=sx;
   const tightZ=tight?1.1:1;const cz=1+Math.max(0,Math.min(0.08,(z-tightZ)*0.6));
   // background colour blends from previous scene over 0.4 s
   const prevBg=ci>0?SC[ci-1].dataset.bg:cs.dataset.bg;const bgc=mix(prevBg,cs.dataset.bg,ease((t-ca)/0.4));document.getElementById('v').style.background=bgc;document.getElementById('topbar').style.background='linear-gradient('+bgc+' 85%,transparent)';
   SC.forEach((s,i)=>{const a=+s.dataset.in,b=+s.dataset.out;const vis=t>=a-0.01&&t<b+0.22;s.style.display=vis?'block':'none';if(!vis)return;
    const pin=a<0.05?1:ease((t-a)/0.22),pout=ease((t-b)/0.2);s.style.opacity=pin*(1-pout);
    const cc=s.querySelector('.content');cc.style.transformOrigin='50% 0';cc.style.transform='translate('+(i===ci?sxG*0.4:0)+'px,'+((1-pin)*40-pout*30)+'px) scale('+(i===ci?cz:1).toFixed(4)+')';
    s.querySelectorAll('.prop').forEach(p=>{const k=+p.dataset.k;const lt=t-a;p.style.opacity=(0.28*ease(lt/0.6)).toFixed(3);
      p.style.transform='translate('+(Math.sin(lt*0.9+k)*14)+'px,'+(-lt*18+Math.cos(lt*1.3+k)*8)+'px) rotate('+(Math.sin(lt*0.7+k*2)*12)+'deg)';});});
   document.querySelectorAll('.el').forEach(e=>{const a=+e.dataset.in;
    if(e.classList.contains('pop')){const q=back((t-a)/0.35);e.style.opacity=Math.min(1,Math.max(0,(t-a)/0.12));e.style.transform='scale('+(1.6-0.6*q)+')';return;}
    const p=a<0.4?1:ease((t-a)/0.4);e.style.opacity=p;e.style.filter='blur('+((1-p)*10)+'px)';e.style.transform='translateY('+((1-p)*30)+'px)';});
   document.querySelectorAll('.big').forEach(b=>{const st=JSON.parse(b.dataset.steps);let k=0;st.forEach((x,i)=>{if(t>=x.t)k=i});
    const cur=st[k],prev=k>0?st[k-1]:{v:0};const p=k===0?1:ease((t-cur.t)/0.45);const v=prev.v+(cur.v-prev.v)*p;
    b.textContent=fmt(v,b);b.style.color=cur.c;const bump=Math.exp(-Math.max(0,t-cur.t)*7);b.style.transform='scale('+(1+0.18*bump)+') rotate('+(-3*bump)+'deg)';
    const lab=b.parentElement.querySelector('.biglab');lab.textContent=cur.l;lab.style.color=cur.c;});
   // camera: slow push-in per scene + punch on stamps + punch on scene start + shake on shock
   const st=document.getElementById('stage');st.style.transformOrigin='50% 30%';
   const pan=SKETCH?(cs.dataset.who==='broke'?60:-60)*ease(ts/0.4):0;
   st.style.transform='translate('+(sx+pan)+'px,'+sy+'px) scale('+z.toFixed(4)+')';
   cs.querySelector('.props').style.transform='scale('+(1+(z-1)*0.6).toFixed(4)+')';

   // rigs
   const f=Math.floor(t*30);const lm=((ENV[f]||0)+(ENV[f+1]||0))/2;const pk=back(ts/0.45);
   if(!SKETCH){const r=document.getElementById('r1');
     r.innerHTML=lobeRig({pose:cs.dataset.pose,side:'r',t:t,lv:lm,tIn:ca,sw:cs._sw,seed:0});
     r.style.transformOrigin='50% 90%';r.style.transform='translateY('+(Math.sin(t*2.4)*8)+'px) scale('+((ci>0?0.9+0.1*pk:1)*(1+lm*0.03)).toFixed(4)+')';}
   else{const sp=cs.dataset.who;
     [['rb','broke','l'],['rr','rich','r']].forEach(([id,who,side])=>{const r=document.getElementById(id);const on=sp===who;
      const pose=on?cs.dataset.pose:(cs.dataset.react||(who==='broke'?'think':'calm'));
      r.innerHTML=lobeRig({pose:pose==='calm'&&!on?'explain':pose,side:side==='l'?'r':'l',t:t,lv:on?lm:0,tIn:on?ca:0,sw:on?cs._sw:[],seed:who==='broke'?1.3:0,who:who});
      const sc=on?1.0:0.82;r.style.opacity=on?1:0.55;r.style.transformOrigin='50% 95%';
      r.style.transform='translateY('+(Math.sin(t*2.4+(who==='broke'?1:0))*7+(on?0:30))+'px) scale('+(sc*(on?(0.94+0.06*pk):1)*(1+(on?lm*0.03:0))).toFixed(4)+')';});
     }
   const cap=document.getElementById('cap');const i=chunks.findIndex((c,k)=>t>=c[0].s-0.05&&(!chunks[k+1]||t<chunks[k+1][0].s-0.05));
   const ch=chunks[i];cap.innerHTML=(ch&&t<ch[ch.length-1].e+0.6)?ch.map(w=>'<span class="'+(t>=w.s&&t<w.e+0.05?'on':'')+'">'+w.w+'</span>').join(''):'';
   document.querySelectorAll('.hl').forEach(h=>{h.style.color=t>=+h.dataset.hl?h.dataset.c:''});
   // follow badge during the last line
   const fb=document.getElementById('follow');const fa=LAST.start;const fq=back((t-fa)/0.5);
   fb.style.opacity=t<fa?0:Math.min(1,(t-fa)/0.2);fb.style.transform='translateX(-50%) scale('+(t<fa?0.6:0.6+0.4*fq)+')';
  };
  </script></body></html>`;
  fs.writeFileSync(path.join(OUT, 'short.html'), html);
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto('file://' + path.resolve(OUT, 'short.html')); await p.waitForTimeout(300);
  const ev = await p.evaluate(() => {
    const out = []; const seen = new Set();
    document.querySelectorAll('.scene').forEach((s, i) => { if (i > 0) out.push([+s.dataset.in - 0.12, 'whoosh', 0.1]); });
    document.querySelectorAll('.el').forEach(e => { const t = +e.dataset.in; const k = t.toFixed(1); if (seen.has(k)) return; seen.add(k);
      if (e.classList.contains('pop')) out.push([t, 'stamp', 0.45]); else if (e.querySelector('.card,.pill,.row')) out.push([t, 'pop', 0.16]); });
    document.querySelectorAll('.big').forEach(b => JSON.parse(b.dataset.steps).forEach((x, i) => { if (i > 0 || x.t > 0.3) out.push([x.t, x.v < 0 ? 'cash' : 'pop_hi', x.v < 0 ? 0.5 : 0.22]); if (x.v < 0) out.push([x.t, 'thud', 0.35]); }));
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
  console.log(STILLS.length ? 'stills' : 'frames', n);
}

main();
