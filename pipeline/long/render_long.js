#!/usr/bin/env node
// Lobe Lessons 16:9 renderer (separate from the Shorts renderer, which stays untouched).
//
// usage: node pipeline/long/render_long.js STORY.json OUTDIR [--preview] [--scenes A,B] [--stills A:1.5,B:3]
//                                           [--force] [--no-assemble]
//   --preview      960x540 fast preview (same layout, half the pixels); default is 1920x1080 final
//   --scenes       render only these scenes (scene-by-scene preview); full assembly needs all scenes
//   --stills       only render single frames (scene:seconds) for quick checks
//   --force        ignore the scene cache
//
// Pipeline: timing.py (narration decides scene length) -> finance.py values (every number) ->
// one HTML page per scene (pages/<id>.html, setT(t) draws any moment) -> frames -> scene mp4 cached by
// content hash -> concat -> mix.py (narration + music + SFX) -> story_<res>.mp4.
// A scene re-renders only when its content, timing, facts or the renderer code change; an interrupted
// scene resumes from its last frame.
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const args = process.argv.slice(2);
const flag = n => args.includes(n), opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const [STORY, OUT] = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && ['--scenes', '--stills'].includes(args[i - 1])));
if (!STORY || !OUT) { console.error('usage: node pipeline/long/render_long.js STORY.json OUTDIR [--preview] [--scenes A,B] [--stills A:1.5] [--force]'); process.exit(2); }
const PREVIEW = flag('--preview'), RES = PREVIEW ? '540p' : '1080p', DSF = PREVIEW ? 0.5 : 1, FPS = 30;
const ONLY = opt('--scenes') ? opt('--scenes').split(',') : null;
const STILLS = opt('--stills') ? opt('--stills').split(',').map(s => { const [id, t] = s.split(':'); return { id, t: +t }; }) : null;
fs.mkdirSync(OUT, { recursive: true });
const sha = s => crypto.createHash('sha1').update(s).digest('hex');
const read = p => fs.readFileSync(p, 'utf8');
const sh = (cmd, a, o = {}) => execFileSync(cmd, a, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 28, ...o }).toString();

const COMP = read(path.join(__dirname, 'components.js')), RIG = read(path.join(ROOT, 'pipeline', 'lobe_rig.js'));
const VERSION = sha(read(__filename) + COMP + RIG).slice(0, 12);
const story = JSON.parse(read(STORY));

// 1. narration timing (real clips or estimates) and 2. verified numbers
process.stdout.write(sh('python3', ['pipeline/long/timing.py', path.resolve(STORY), path.resolve(OUT)]));
const TL = JSON.parse(read(path.join(OUT, 'timeline.json')));
const FACTS = JSON.parse(sh('python3', ['pipeline/finance.py', 'values', path.resolve(STORY)]));

// ------------------------------------------------------------------ time anchors
const normw = w => w.toLowerCase().replace(/[^a-z0-9$%']/g, '');
const TIMEKEYS = new Set(['at', 'in', 'out', 'start', 'end', 'glow']);
function resolver(sc) {
  return v => {
    if (typeof v === 'number') return v;
    if (typeof v !== 'string') throw new Error(`bad time ${JSON.stringify(v)} in scene ${sc.id}`);
    if (v.startsWith('+')) return parseFloat(v);
    if (v === 'end') return sc.dur;
    let [ref, off] = v.split(/(?=[+-]\d)/); off = off ? parseFloat(off) : 0;
    const [lid, word] = ref.split(':'); const L = TL.lines.find(l => l.id === lid);
    if (!L) throw new Error(`scene ${sc.id}: unknown line '${lid}' in time '${v}'`);
    let g = L.start;
    if (word === 'end') g = L.end;
    else if (word) { const [w, nth] = word.split('#'); const c = TL.words.filter(x => x.line === lid && normw(x.w).startsWith(normw(w)));
      const m = c[(+nth || 1) - 1]; if (!m) throw new Error(`scene ${sc.id}: word '${w}' not found in line '${lid}'`); g = m.s; }
    return +(g - sc.start + off).toFixed(3);
  };
}
function resolveTimes(o, T) {
  if (Array.isArray(o)) return o.map(x => resolveTimes(x, T));
  if (o && typeof o === 'object') { const r = {}; for (const [k, v] of Object.entries(o)) r[k] = TIMEKEYS.has(k) && (typeof v === 'string' || typeof v === 'number') ? T(v) : resolveTimes(v, T); return r; }
  return o;
}

// ------------------------------------------------------------------ scene preparation (validation + events)
const WORLD = new Set(['prop', 'jar', 'plant', 'laptop', 'pile', 'emitter', 'thought']);
function prepare(raw) {
  const ts = TL.scenes.find(s => s.id === raw.id), sc = { ...raw, start: ts.start, end: ts.end, dur: +(ts.end - ts.start).toFixed(3) };
  const T = resolver(sc);
  const s = resolveTimes(raw, T); s.dur = sc.dur; s.start = sc.start;
  s.env = { type: 'plain', ...(s.env || {}), dur: sc.dur };
  s.elements = (s.elements || []).map((e, i) => {
    const el = { in: 0, out: sc.dur + 1, layer: WORLD.has(e.type) ? 'world' : 'hud', ...e, i };
    if (el.type === 'counter') {
      if (el.start === undefined) el.start = el.in; if (el.end === undefined) el.end = el.start + 1.2;
      const ser = el.series ? FACTS.series[el.series] : null;
      if (el.series && !ser) throw new Error(`scene ${s.id}: unknown series ${el.series}`);
      const fromSeries = ser ? [0, ...ser][el.idx ? el.idx[1] : ser.length] : undefined;
      if (el.fact !== undefined) {
        if (!(el.fact in FACTS.values)) throw new Error(`scene ${s.id}: unknown fact ${el.fact}`);
        el.final = FACTS.values[el.fact];
        if (fromSeries !== undefined && Math.abs(fromSeries - el.final) > 0.51)
          throw new Error(`scene ${s.id}: counter ends on series value ${fromSeries.toFixed(2)} but fact '${el.fact}' is ${el.final.toFixed(2)}: the animation would show a different number than the verified one`);
      } else if (fromSeries !== undefined) el.final = fromSeries;
      else throw new Error(`scene ${s.id}: counter needs a fact or a series (numbers are never typed by hand)`);
    }
    if (el.type === 'chart' && !el.ymax) {
      const m = Math.max(...el.series.map(d => Math.max(...FACTS.series[d.id])));
      const step = Math.pow(10, Math.floor(Math.log10(m))) / 2; el.ymax = Math.ceil(m * 1.12 / step) * step;
    }
    return el;
  });
  s.actors = (s.actors || []).map(a => ({ scale: 1, face: 'r', cues: [], ...a }));
  s.shots = (s.shots && s.shots.length ? s.shots : [{ at: 0, zoom: 1, cx: 960, cy: 540 }]).sort((a, b) => a.at - b.at);
  // words + mouth envelope for this scene (scene-local times)
  s.words = TL.words.filter(w => w.s >= sc.start - 0.01 && w.s < sc.end).map(w => ({ ...w, s: +(w.s - sc.start).toFixed(3), e: +(w.e - sc.start).toFixed(3) }));
  s.lines = TL.lines.filter(l => l.scene === s.id).map(l => ({ ...l, start: +(l.start - sc.start).toFixed(3), end: +(l.end - sc.start).toFixed(3) }));
  s.env30 = TL.env.slice(Math.round(sc.start * FPS), Math.round(sc.end * FPS) + 2);
  // captions: chunks of <= 7 words / 42 chars inside a line
  s.chunks = [];
  for (const l of s.lines) { let cur = [];
    for (const w of s.words.filter(w => w.line === l.id)) {
      if (cur.length && (cur.length >= 7 || [...cur, w].map(x => x.w).join(' ').length > 42 || /[.!?]$/.test(cur[cur.length - 1].w))) { s.chunks.push(cur); cur = []; }
      cur.push(w); }
    if (cur.length) s.chunks.push(cur); }
  // sound cues (scene-local; offset to story time later)
  const ev = [];
  for (const e of s.elements) {
    if (['title'].includes(e.type)) ev.push([e.in + 0.05, 'whoosh', 0.35]);
    if (['label', 'thought', 'note'].includes(e.type)) ev.push([e.in, 'pop', 0.4]);
    if (e.type === 'stamp') ev.push([e.in, 'stamp', 0.7]);
    if (e.type === 'counter') ev.push([e.end, 'cash', 0.6]);
    if (e.type === 'calendar' || e.type === 'timeline') for (let y = 1; y <= e.years; y++) ev.push([e.start + (e.end - e.start) * (y - 0.35) / e.years, e.type === 'calendar' ? 'whoosh' : 'pop_hi', 0.3]);
    if (e.type === 'pile') { const n = e.max || 8; for (let k = 0; k < n; k++) ev.push([e.start + (e.end - e.start) * k / Math.max(1, n - 1), 'pop', 0.22]); }
    if (e.type === 'emitter') { const n = Math.floor((e.end - e.start) / (e.every || 0.5)); for (let k = 0; k < n; k += 2) ev.push([e.start + k * (e.every || 0.5) + (e.flight || 0.8), 'pop_hi', 0.12]); }
    if (e.type === 'chart') ev.push([e.start, 'riser', 0.25]);
  }
  for (const sh2 of s.shots.slice(1)) if (!sh2.cut) ev.push([sh2.at, 'whoosh', 0.18]);
  s.events = ev.filter(x => x[0] >= 0 && x[0] < sc.dur);
  return s;
}

// ------------------------------------------------------------------ page
function page(s) {
  const els = s.elements.map(e => `<div class="el L-${e.layer}" id="e${e.i}" style="position:absolute;left:0;top:0;opacity:0">${''}</div>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;background:#000}#v{position:relative;width:1920px;height:1080px;overflow:hidden;background:#F6EFE4;font-family:Inter,'Inter Display',sans-serif}
  #world{position:absolute;left:0;top:0;width:1920px;height:1080px;transform-origin:0 0}#hud{position:absolute;inset:0}
  .actor{position:absolute}.shadow{position:absolute;height:34px;border-radius:50%;background:#00000022}
  #cap{position:absolute;left:192px;right:192px;top:928px;text-align:center;z-index:30}
  #cap span{display:inline-block;font:800 46px 'Inter Display',Inter;letter-spacing:-.01em;margin:0 6px;padding:2px 12px;border-radius:12px;color:#111;background:#ffffffd0}
  #cap span.on{background:#111;color:#F5C84C}
  </style></head><body><div id="v"><div id="world"><div id="env"></div><div id="wl"></div><div id="actors"></div></div><div id="hud"></div><div id="cap"></div></div>
  <script>${COMP}</script><script>${RIG}</script><script>
  const S=${JSON.stringify(s)};LL.setFacts(${JSON.stringify(FACTS)});
  const world=document.getElementById('world'),envN=document.getElementById('env'),cap=document.getElementById('cap');
  const nodes=S.elements.map(e=>{const d=document.createElement('div');d.className='el';d.style.cssText='position:absolute;left:0;top:0;opacity:0';
    d.innerHTML=LL.E[e.type].html(e);(e.layer==='world'?document.getElementById('wl'):document.getElementById('hud')).appendChild(d);return d;});
  const acts=S.actors.map(a=>{const sd=document.createElement('div');sd.className='shadow';const n=document.createElement('div');n.className='actor';
    document.getElementById('actors').appendChild(sd);document.getElementById('actors').appendChild(n);
    const speak=S.lines.filter(l=>l.speaker===a.id);const sw=a.cues.filter(c=>c.pose).map(c=>c.at);
    speak.forEach(l=>{for(let x=l.start;x<l.end;x+=2.2)sw.push(+x.toFixed(2));});sw.sort((p,q)=>p-q);
    const keys=[{at:0,x:a.x,y:a.y,move:0}];a.cues.forEach(c=>{if(c.x!==undefined||c.y!==undefined){const k=keys[keys.length-1];keys.push({at:c.at,x:c.x??k.x,y:c.y??k.y,move:c.move||0.9});}});
    return {a,n,sd,speak,sw,keys};});
  function camAt(t){let k=0;while(k+1<S.shots.length&&S.shots[k+1].at<=t)k++;const s=S.shots[k];
    let z=s.zoom||1,cx=s.cx??960,cy=s.cy??540;
    if(k>0&&!s.cut){const p=LL.smooth((t-s.at)/(s.ease||0.7)),q=S.shots[k-1];if(p<1){z=LL.lerp(q.zoom||1,z,p);cx=LL.lerp(q.cx??960,cx,p);cy=LL.lerp(q.cy??540,cy,p);}}
    z*=1+(s.drift??0.012)*(t-s.at);
    const hx=960/z,hy=540/z;cx=Math.min(1920-hx,Math.max(hx,cx));cy=Math.min(1080-hy,Math.max(hy,cy));
    let ox=0,oy=0;if(s.shake&&t-s.at<0.5){const f=1-(t-s.at)/0.5;ox=Math.sin(t*90)*14*f;oy=Math.cos(t*77)*10*f;}
    return {z,cx,cy,ox,oy};}
  function lvAt(A,t){if(!A.speak.some(l=>t>=l.start-0.05&&t<=l.end+0.05))return 0;const i=Math.min(S.env30.length-1,Math.max(0,Math.round(t*30)));return S.env30[i]||0;}
  function setT(t){
    const c=camAt(t);world.style.transform='translate('+(960-c.cx*c.z+c.ox)+'px,'+(540-c.cy*c.z+c.oy)+'px) scale('+c.z+')';
    envN.innerHTML=LL.ENV[S.env.type](S.env,t);
    S.elements.forEach((e,i)=>{const op=LL.fade(e,t),n=nodes[i];n.style.opacity=op;n.style.display=op<=0.001?'none':'block';if(op>0.001)LL.E[e.type].upd(e,n.firstElementChild||n,t);});
    acts.forEach(A=>{const a=A.a;let pc=null;for(const cu of a.cues)if(cu.pose&&cu.at<=t)pc=cu;
      const pose=pc?pc.pose:(a.pose||'explain'),tIn=pc?pc.at:0;
      let k=0;while(k+1<A.keys.length&&A.keys[k+1].at<=t)k++;let x=A.keys[k].x,y=A.keys[k].y,moving=0;
      if(k>0){const K=A.keys[k],Q=A.keys[k-1],p=(t-K.at)/K.move;if(p<1){x=LL.lerp(Q.x,K.x,LL.smooth(p));y=LL.lerp(Q.y,K.y,LL.smooth(p));moving=1;}}
      const w=420*a.scale,h=w*360/520,bob=moving?Math.abs(Math.sin(t*9))*16*a.scale:0;
      A.n.style.cssText='position:absolute;left:'+(x-w/2)+'px;top:'+(y-h*0.93-bob)+'px;width:'+w+'px';
      A.sd.style.cssText='position:absolute;left:'+(x-w*0.22)+'px;top:'+(y-h*0.05)+'px;width:'+(w*0.44)+'px;height:'+(26*a.scale)+'px;border-radius:50%;background:#00000022';
      A.n.innerHTML=lobeRig({pose:pose,side:a.face==='r'?'l':'r',t:t,lv:lvAt(A,t),tIn:tIn,sw:A.sw,seed:a.who==='broke'?1.3:a.x/1000,who:a.who});});
    if(S.captions!==false){const i=S.chunks.findIndex((ch,k)=>t>=ch[0].s-0.05&&(!S.chunks[k+1]||t<S.chunks[k+1][0].s-0.05));
      const ch=S.chunks[i];cap.innerHTML=(ch&&t<ch[ch.length-1].e+0.6)?ch.map(w=>'<span class="'+(t>=w.s&&t<w.e+0.05?'on':'')+'">'+w.w+'</span>').join(''):'';}
  }
  window.setT=setT;</script></body></html>`;
}

// ------------------------------------------------------------------ render
(async () => {
  const t0 = Date.now(); const log = { version: VERSION, res: RES, scenes: [] };
  const scenes = story.scenes.filter(s => !ONLY || ONLY.includes(s.id)).map(prepare);
  fs.mkdirSync(path.join(OUT, 'pages'), { recursive: true });
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const pg = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: DSF });
  const load = async s => { const f = path.join(OUT, 'pages', s.id + '.html'); fs.writeFileSync(f, page(s));
    await pg.goto('file://' + f); await pg.waitForTimeout(150); return f; };
  if (STILLS) {
    const dir = path.join(OUT, 'stills', RES); fs.mkdirSync(dir, { recursive: true });
    for (const s of scenes) { const want = STILLS.filter(x => x.id === s.id); if (!want.length) continue; await load(s);
      for (const w of want) { await pg.evaluate(t => setT(t), w.t); const f = path.join(dir, `${s.id}_${w.t.toFixed(2)}.jpg`);
        await pg.screenshot({ path: f, type: 'jpeg', quality: 90, clip: { x: 0, y: 0, width: 1920, height: 1080 } }); console.log('still', f); } }
    await b.close(); return;
  }
  const scDir = path.join(OUT, 'scenes'); fs.mkdirSync(scDir, { recursive: true });
  for (const s of scenes) {
    const hash = sha(JSON.stringify({ VERSION, s, FACTS, RES, FPS })).slice(0, 12);
    const mp4 = path.join(scDir, `${s.id}.${hash}.${RES}.mp4`), ts = Date.now();
    const n = Math.round(s.dur * FPS);
    const pageFile = await load(s);
    if (fs.existsSync(mp4) && !flag('--force')) { console.log(`scene ${s.id}: cached (${hash})`); log.scenes.push({ id: s.id, hash, cached: true, frames: n, mp4, page: pageFile, start: s.start, dur: s.dur, events: s.events }); continue; }
    const fdir = path.join(OUT, 'frames', `${s.id}.${hash}.${RES}`); fs.mkdirSync(fdir, { recursive: true });
    let have = 0; while (fs.existsSync(path.join(fdir, `f_${String(have).padStart(5, '0')}.jpg`))) have++;
    const from = Math.max(0, have - 1);   // re-render the last frame in case it was cut off mid-write
    if (from > 0) console.log(`scene ${s.id}: resuming at frame ${from}/${n}`);
    for (let k = from; k < n; k++) {
      await pg.evaluate(t => setT(t), k / FPS);
      await pg.screenshot({ path: path.join(fdir, `f_${String(k).padStart(5, '0')}.jpg`), type: 'jpeg', quality: PREVIEW ? 85 : 92, clip: { x: 0, y: 0, width: 1920, height: 1080 } });
    }
    sh('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-i', path.join(fdir, 'f_%05d.jpg'), '-frames:v', String(n), '-c:v', 'libx264',
      '-preset', PREVIEW ? 'veryfast' : 'medium', '-crf', PREVIEW ? '23' : '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), mp4 + '.tmp.mp4']);
    fs.renameSync(mp4 + '.tmp.mp4', mp4); fs.rmSync(fdir, { recursive: true, force: true });
    const secs = (Date.now() - ts) / 1000;
    const done = n - from;
    console.log(`scene ${s.id}: ${done} of ${n} frames rendered in ${secs.toFixed(1)}s (${(secs / Math.max(1, done) * 1000).toFixed(0)} ms/frame incl. encode)`);
    log.scenes.push({ id: s.id, hash, cached: false, frames: n, rendered: done, resumed_from: from, seconds: +secs.toFixed(1), mp4, page: pageFile, start: s.start, dur: s.dur, events: s.events });
  }
  await b.close();
  const all = story.scenes.every(s => log.scenes.find(x => x.id === s.id));
  if (all && !flag('--no-assemble')) {
    const list = path.join(OUT, 'concat.txt'); fs.writeFileSync(list, log.scenes.map(x => `file '${x.mp4}'`).join('\n'));
    const vid = path.join(OUT, `video_${RES}.mp4`);
    sh('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', vid]);
    const events = []; log.scenes.forEach(x => x.events.forEach(([t, nme, g]) => events.push([+(x.start + t).toFixed(3), nme, g])));
    fs.writeFileSync(path.join(OUT, 'events.json'), JSON.stringify(events));
    sh('python3', ['pipeline/mix.py', path.resolve(OUT)]);                     // reused unchanged: narration + music + SFX
    const narrated = TL.estimated_lines.length < TL.lines.length;
    const fin = path.join(OUT, `story_${RES}.mp4`);
    sh('ffmpeg', ['-v', 'error', '-y', '-i', vid, '-i', path.join(OUT, 'mix.wav'), '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
      '-af', `loudnorm=I=${narrated ? -14 : -20}:TP=-1.5:LRA=11`, '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', fin]);
    fs.writeFileSync(path.join(OUT, 'layout_pages.json'), JSON.stringify(log.scenes.map(x => ({ page: x.page, t0: x.start, t1: x.start + x.dur, width: 1920, height: 1080 })), null, 1));
    log.output = fin; log.narrated = narrated; console.log('story ->', fin);
  }
  log.total_seconds = +((Date.now() - t0) / 1000).toFixed(1);
  fs.writeFileSync(path.join(OUT, `render_log_${RES}.json`), JSON.stringify(log, null, 1));
  console.log(`done in ${log.total_seconds}s`);
})().catch(e => { console.error('RENDER ERROR:', e.message); process.exit(1); });
