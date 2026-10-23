// Documentary-comedy ("essay") components for Lobe Lessons. Registered into the 16:9 renderer's LL.E,
// loaded only by stories that list this file in "components". Same rule as the core library:
// upd(e, node, t) is a pure function of time, so frames are deterministic and cacheable.
(function (root) {
  const LL = root.LL, { clamp, smooth, outBack, outCubic, lerp } = LL;
  const INK = '#151515', RED = '#E0463A', GOLD = '#C9A24B', CHAR = '#22252B';
  const ease = (e, t, d = 0.45) => smooth((t - e.in) / d);
  const MARK = "'Permanent Marker','Comic Sans MS','Chalkboard SE','Inter',sans-serif";

  Object.assign(LL.E, {
    // Full-frame (or boxed) photo with a slow Ken Burns move: kb.from/to = [scale, focusX 0..1, focusY 0..1]
    photo: {
      html: e => `<div style="position:absolute;left:${e.x || 0}px;top:${e.y || 0}px;width:${e.w || 1920}px;height:${e.h || 1080}px;overflow:hidden;${e.radius ? `border-radius:${e.radius}px;` : ''}${e.border ? `border:${e.border};` : ''}background:#111">
        <img src="${e.src}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:${(e.pos || [0.5, 0.5]).map(v => v * 100 + '%').join(' ')};filter:${e.grade === 'gray' ? 'grayscale(1) contrast(.9)' : e.grade === 'warm' ? 'sepia(.12) saturate(1.08) contrast(1.04)' : 'none'}"></div>`,
      upd(e, n, t) {
        const kb = e.kb || { from: [1.04, 0.5, 0.5], to: [1.14, 0.5, 0.5] }, p = smooth(clamp((t - e.in) / Math.max(0.5, (e.out - e.in))));
        const s = lerp(kb.from[0], kb.to[0], p), fx = lerp(kb.from[1], kb.to[1], p), fy = lerp(kb.from[2], kb.to[2], p);
        const img = n.querySelector('img'); img.style.transformOrigin = `${fx * 100}% ${fy * 100}%`; img.style.transform = `scale(${s})`;
      },
    },
    vignette: { html: e => `<div style="position:absolute;inset:0;width:1920px;height:1080px;background:radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,${e.strength ?? 0.45}) 100%)"></div>`, upd() {} },
    fill: { html: e => `<div style="position:absolute;left:0;top:0;width:1920px;height:1080px;background:${e.color || CHAR}"></div>`, upd() {} },
    // hand-drawn marker circle that draws itself on
    marker: {
      html: e => { const rx = e.rx || 160, ry = e.ry || 110, pts = [];
        for (let k = 0; k <= 64; k++) { const a = -0.6 + k / 64 * (2 * Math.PI + 0.5), w = 1 + 0.035 * Math.sin(a * 2 + 1) + 0.04 * (k / 64);
          pts.push(`${(Math.cos(a) * rx * w).toFixed(1)},${(Math.sin(a) * ry * w).toFixed(1)}`); }
        return `<svg style="position:absolute;left:${e.x - rx - 20}px;top:${e.y - ry - 20}px;overflow:visible" width="${2 * rx + 40}" height="${2 * ry + 40}">
          <polyline class="mk" points="${pts.join(' ')}" transform="translate(${rx + 20} ${ry + 20}) rotate(${e.rot || -8})" fill="none" stroke="${e.color || RED}" stroke-width="${e.width || 11}" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/></svg>`; },
      upd(e, n, t) { n.querySelector('.mk').style.strokeDashoffset = 1 - outCubic((t - e.in) / (e.dur || 0.55)); },
    },
    // handwritten / marker text that writes itself left to right
    write: {
      html: e => `<div style="position:absolute;left:${e.x}px;top:${e.y}px;transform:translate(-50%,-50%) rotate(${e.rot || 0}deg);white-space:pre;text-align:${e.align || 'center'};font:${e.weight || 900} ${e.size || 56}px/1.12 ${e.font === 'sans' ? "'Inter Display',Inter" : MARK};color:${e.color || RED};${e.shadow ? 'text-shadow:0 3px 0 #0006;' : ''}${e.bg ? `background:${e.bg};padding:6px 18px;border-radius:10px;` : ''}"><span class="wr">${e.text}</span></div>`,
      upd(e, n, t) { const p = clamp((t - e.in) / (e.dur || 0.6)); n.querySelector('.wr').style.clipPath = `inset(-20% ${100 - p * 100}% -20% -5%)`; },
    },
    // plain integer counter (not money: money must use `counter` with a verified fact)
    ticker: {
      html: e => `<div style="position:absolute;left:${e.x}px;top:${e.y}px;transform:translate(-50%,-50%);text-align:center;white-space:nowrap">
        <div class="tk" style="font:900 ${e.size || 200}px/1 'Inter Display',Inter;color:${e.color || '#fff'};font-variant-numeric:tabular-nums;${e.shadow !== false ? 'text-shadow:0 6px 0 #0007;' : ''}">0</div>
        ${e.label ? `<div style="font:900 ${Math.round((e.size || 200) * 0.2)}px Inter;letter-spacing:.08em;color:${e.color || '#fff'};${e.shadow !== false ? 'text-shadow:0 3px 0 #0007;' : ''}">${e.label}</div>` : ''}</div>`,
      upd(e, n, t) { const p = clamp((t - e.start) / (e.end - e.start)), v = Math.round(lerp(e.from ?? 0, e.to, p));
        const el = n.querySelector('.tk'); el.textContent = (e.prefix || '') + v + (e.suffix || '');
        const land = t - e.end; el.style.transform = `scale(${1 + (land >= 0 && land < 0.4 ? Math.sin(land / 0.4 * Math.PI) * 0.18 : 0)})`; },
    },
    // phone "incoming call" card (generic UI, no logos)
    phone: {
      html: e => `<div style="position:absolute;left:${e.x}px;top:${e.y}px;width:440px;transform:translate(-50%,-50%)"><div class="ph" style="background:#16181dEE;border:4px solid #fff3;border-radius:46px;padding:34px 30px 30px;color:#fff;text-align:center;box-shadow:0 30px 60px #0008">
        <div style="font:600 26px Inter;opacity:.7">${e.kicker || 'incoming call…'}</div><div style="font:800 64px/1.1 'Inter Display',Inter;margin:10px 0 6px">${e.caller}</div>
        <div style="font:500 26px Inter;opacity:.7">${e.sub || ''}</div>
        <div style="display:flex;justify-content:space-around;margin-top:34px"><div style="width:96px;height:96px;border-radius:50%;background:#E5484D"></div><div style="width:96px;height:96px;border-radius:50%;background:#30A46C"></div></div></div></div>`,
      upd(e, n, t) { const p = outBack((t - e.in) / 0.45), ring = Math.sin(t * 38) * 2.2 * (Math.floor((t - e.in) * 1.5) % 2 === 0 ? 1 : 0);
        n.querySelector('.ph').style.transform = `translateY(${(1 - p) * 700}px) rotate(${ring}deg)`; },
    },
    // editorial card: kicker + big title + body; optional typewriter body
    card: {
      html: e => `<div style="position:absolute;left:${e.x}px;top:${e.y}px;width:${e.w || 640}px;transform:translate(-50%,-50%)"><div class="cd" style="background:${e.bg || '#F6EFE4'};color:${e.fg || INK};border-radius:${e.radius ?? 26}px;padding:${e.pad || '40px 46px'};box-shadow:0 18px 0 #0003;${e.border ? `border:${e.border};` : ''}">
        ${e.kicker ? `<div style="font:900 30px Inter;letter-spacing:.14em;color:${e.accent || RED}">${e.kicker}</div>` : ''}
        ${e.title ? `<div style="font:900 ${e.size || 96}px/1.02 'Inter Display',Inter;letter-spacing:-.03em;margin-top:8px">${e.title}</div>` : ''}
        ${e.body ? `<div class="cb" style="font:${e.bodyWeight || 700} ${e.bodySize || 40}px/1.25 ${e.mono ? "'Courier New',monospace" : 'Inter'};margin-top:18px;white-space:pre-wrap">${e.body}</div>` : ''}</div></div>`,
      upd(e, n, t) {
        const p = (e.enter || 'pop') === 'pop' ? outBack((t - e.in) / 0.4) : 1;
        const cd = n.querySelector('.cd'), fl = e.float === false ? 0 : Math.sin((t + e.i) * 1.3) * 5;
        cd.style.transform = `translateY(${fl}px) scale(${(0.7 + 0.3 * p) * (1 + 0.012 * Math.sin(t * 0.9 + e.i))}) rotate(${(e.rot || 0) + Math.sin(t * 0.7 + e.i) * 0.6}deg)`;
        if (e.dim !== undefined) cd.style.filter = `grayscale(${smooth((t - e.dim) / 0.5)}) brightness(${1 - 0.35 * smooth((t - e.dim) / 0.5)})`;
        if (e.type_on) { const b = n.querySelector('.cb'); if (!b._full) b._full = b.textContent;
          const k = Math.floor(clamp((t - (e.typeStart ?? e.in + 0.3)) / (e.typeDur || 1.4)) * b._full.length); b.textContent = b._full.slice(0, k); }
      },
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
