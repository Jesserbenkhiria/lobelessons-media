// Lobe Lessons 16:9 component library. Runs inside the scene page (render_long.js inlines it).
// Everything is a pure function of scene time t: setT(t) can be called for any frame in any order,
// which makes renders deterministic, resumable and cacheable.
// Coordinates are a 1920x1080 design space; previews only change the device pixel ratio.
(function (root) {
  const INK = '#151515', GOLD = '#C9A24B', GREEN = '#2F9E6B', RED = '#D9534F', CREAM = '#F6EFE4';
  const C = { green: GREEN, red: RED, gold: GOLD, dark: '#111', muted: '#7d766a', white: '#fff' };
  const col = c => C[c] || c || '#111';
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  const outBack = x => { x = clamp(x); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  const outCubic = x => 1 - Math.pow(1 - clamp(x), 3);
  const lerp = (a, b, p) => a + (b - a) * p;
  const rnd = (i, s = 1) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); }; // seeded, deterministic
  const fmtMoney = (v, pre = '$') => (v < 0 ? '−' : '') + pre + Math.round(Math.abs(v)).toLocaleString('en-US');
  const fade = (e, t) => Math.min(smooth((t - e.in) / (e.fin || 0.3)), 1 - smooth((t - (e.out - (e.fout || 0.3))) / (e.fout || 0.3)));

  // ------------------------------------------------------------------ props (flat SVG, drawn around 0,0, ~100 units)
  const P = {
    bag: (c = '#E86A5B') => `<path d="M-38 -20 h76 l8 70 h-92 z" fill="${c}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><path d="M-18 -20 q0 -30 18 -30 q18 0 18 30" fill="none" stroke="${INK}" stroke-width="5"/>`,
    box: (c = '#D9A86C') => `<rect x="-42" y="-34" width="84" height="68" rx="6" fill="${c}" stroke="${INK}" stroke-width="5"/><path d="M-42 -14 h84 M0 -34 v20" stroke="${INK}" stroke-width="4"/>`,
    phone: () => `<rect x="-24" y="-44" width="48" height="88" rx="10" fill="#222" stroke="${INK}" stroke-width="4"/><rect x="-18" y="-34" width="36" height="62" rx="4" fill="#7FC8F8"/>`,
    coffee: () => `<path d="M-26 -24 h52 l-6 56 h-40 z" fill="#fff" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><rect x="-30" y="-34" width="60" height="12" rx="4" fill="#8B5A3C" stroke="${INK}" stroke-width="4"/><rect x="-22" y="-2" width="44" height="14" fill="#C9A24B"/>`,
    coin: () => `<circle r="22" fill="#F2C94C" stroke="${INK}" stroke-width="4"/><text y="9" text-anchor="middle" font-family="Inter" font-weight="900" font-size="26" fill="#8a6a10">$</text>`,
    bill: () => `<rect x="-34" y="-18" width="68" height="36" rx="5" fill="#8FD19E" stroke="${INK}" stroke-width="4"/><circle r="10" fill="none" stroke="#2F7A44" stroke-width="3"/>`,
    receipt: () => `<path d="M-26 -40 h52 v80 l-9 -7 l-9 7 l-8 -7 l-9 7 l-8 -7 l-9 7 z" fill="#fff" stroke="${INK}" stroke-width="4"/><path d="M-16 -24 h32 M-16 -10 h24 M-16 4 h32" stroke="#bbb" stroke-width="4"/>`,
    wallet: () => `<rect x="-44" y="-28" width="88" height="56" rx="10" fill="#7A4E2D" stroke="${INK}" stroke-width="5"/><rect x="14" y="-12" width="34" height="24" rx="6" fill="#5C3A20" stroke="${INK}" stroke-width="4"/>`,
    laptop: (p = 1) => { const pts = [...Array(8).keys()].map(i => `${-50 + i * 14},${8 - Math.pow(i / 7, 1.6) * 40 * p}`).join(' ');
      return `<rect x="-62" y="-50" width="124" height="80" rx="8" fill="#2A2F3A" stroke="${INK}" stroke-width="5"/><rect x="-54" y="-42" width="108" height="64" rx="3" fill="#EAF7EF"/><polyline points="${pts}" fill="none" stroke="${GREEN}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M-80 30 h160 l-12 14 h-136 z" fill="#9AA3B2" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`; },
    shop: () => `<rect x="-90" y="-120" width="180" height="200" fill="#FFF3E6" stroke="${INK}" stroke-width="6"/><path d="M-100 -120 h200 l-10 -40 h-180 z" fill="${RED}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/><path d="M-80 -160 v40 M-40 -160 v40 M0 -160 v40 M40 -160 v40 M80 -160 v40" stroke="#fff" stroke-width="10"/><rect x="-36" y="-10" width="72" height="90" fill="#7FC8F8" stroke="${INK}" stroke-width="5"/><text y="-74" text-anchor="middle" font-family="Inter" font-weight="900" font-size="34" fill="${INK}">SHOP</text>`,
    jar: (lv = 0, glow = 0) => { const h = 150 * clamp(lv); let coins = '';
      for (let i = 0; i < Math.floor(lv * 9); i++) coins += `<ellipse cx="${-30 + (i % 3) * 30}" cy="${70 - Math.floor(i / 3) * 18 - 12}" rx="16" ry="7" fill="#F2C94C" stroke="#8a6a10" stroke-width="3"/>`;
      return `${glow ? `<circle r="${120 + 10 * glow}" fill="#F5C84C" opacity="${0.25 * glow}"/>` : ''}<rect x="-62" y="${80 - h}" width="124" height="${h}" fill="#BFE6CC"/>${coins}<path d="M-62 -70 v140 q0 12 12 12 h100 q12 0 12 -12 v-140" fill="none" stroke="${INK}" stroke-width="6"/><rect x="-70" y="-88" width="140" height="22" rx="8" fill="#D8D2C4" stroke="${INK}" stroke-width="5"/>`; },
    plant: (g = 0) => { g = clamp(g); const h = 30 + 230 * g; let leaves = '';
      const n = Math.floor(2 + g * 7);
      for (let i = 0; i < n; i++) { const y = -40 - (i + 1) * (h / (n + 1)), s = i % 2 ? 1 : -1, sz = 22 + 18 * g;
        leaves += `<path d="M0 ${y} q${s * sz} ${-sz * 0.9} ${s * sz * 2} 0 q${-s * sz} ${sz * 0.6} ${-s * sz * 2} 0" fill="#59B36B" stroke="${INK}" stroke-width="3.5"/>`; }
      let fruit = ''; if (g > 0.65) { const k = Math.floor((g - 0.65) / 0.35 * 6);
        for (let i = 0; i < k; i++) fruit += `<g transform="translate(${(rnd(i, 3) - 0.5) * 120} ${-40 - h * (0.55 + rnd(i, 7) * 0.4)}) scale(0.55)">${P.coin()}</g>`; }
      return `<path d="M0 -40 V${-40 - h}" stroke="#3E8E4F" stroke-width="${6 + 6 * g}" stroke-linecap="round"/>${leaves}${fruit}<path d="M-56 -40 h112 l-14 70 h-84 z" fill="#C46A3A" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`; },
  };

  // ------------------------------------------------------------------ environments (world layer, full 1920x1080 SVG)
  function skyColor(phase, minDay = 0) { // 0..1 one day; returns sky colours
    const d = minDay + (1 - minDay) * (Math.cos(phase * 2 * Math.PI - Math.PI) + 1) / 2; // 0 night .. 1 noon
    const mix = (a, b, p) => '#' + [0, 2, 4].map(i => Math.round(lerp(parseInt(a.substr(i + 1, 2), 16), parseInt(b.substr(i + 1, 2), 16), p)).toString(16).padStart(2, '0')).join('');
    return { top: mix('#1E2A4A', '#8FD0F5', d), bot: mix('#3A3F6B', '#DFF3FB', d), d };
  }
  const ENV = {
    room(e, t) {
      const ph = e.day ? (e.day[0] + (e.day[1] - e.day[0]) * clamp(t / (e.dur || 1))) % 1 : 0.5, sk = skyColor(ph);
      const cl = (t * 12) % 500;
      return `<svg viewBox="0 0 1920 1080" width="1920" height="1080"><rect width="1920" height="1080" fill="${e.wall || '#F3E6D3'}"/>
        <rect y="760" width="1920" height="320" fill="${e.floor || '#D9B48C'}"/><rect y="752" width="1920" height="16" fill="#C49A6C"/>
        <g transform="translate(1220 170)"><rect width="420" height="330" rx="10" fill="${sk.top}" stroke="${INK}" stroke-width="8"/><rect y="165" width="420" height="165" fill="${sk.bot}" opacity=".6"/>
          <g opacity="${0.4 + 0.5 * sk.d}"><ellipse cx="${(80 + cl) % 460 - 20}" cy="80" rx="60" ry="22" fill="#fff"/><ellipse cx="${(300 + cl * 0.7) % 460 - 20}" cy="130" rx="44" ry="16" fill="#fff"/></g>
          <path d="M210 0 V330 M0 165 H420" stroke="${INK}" stroke-width="8"/></g>
        <g transform="translate(250 230)"><rect width="300" height="20" fill="#A8774F" stroke="${INK}" stroke-width="5"/>${[0, 1, 2, 3, 4].map(i => `<rect x="${20 + i * 34}" y="${-70 + (i % 2) * 12}" width="28" height="${70 - (i % 2) * 12}" fill="${['#D9534F', '#2F9E6B', '#C9A24B', '#5B7DB1', '#E8A87C'][i]}" stroke="${INK}" stroke-width="4"/>`).join('')}</g>
        <g transform="translate(700 210)"><rect width="230" height="170" rx="6" fill="#fff" stroke="${INK}" stroke-width="7"/><path d="M20 150 L80 70 L120 115 L160 80 L210 150 Z" fill="#8CC084"/><circle cx="170" cy="45" r="18" fill="#F2C94C"/></g>
        <g transform="translate(1040 0)"><path d="M0 760 V470" stroke="${INK}" stroke-width="8"/><path d="M-50 470 h100 l-20 -70 h-60 z" fill="#F2C94C" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/><ellipse cx="0" cy="762" rx="44" ry="10" fill="${INK}"/></g>
        <ellipse cx="960" cy="900" rx="560" ry="70" fill="${e.rug || '#E9C6A8'}" opacity=".7"/></svg>`;
    },
    split(e, t) {
      const L = e.left || {}, R = e.right || {};
      return `<svg viewBox="0 0 1920 1080" width="1920" height="1080">
        <rect width="960" height="1080" fill="${L.wall || '#F7D8CE'}"/><rect x="960" width="960" height="1080" fill="${R.wall || '#D6EEDF'}"/>
        <rect y="780" width="960" height="300" fill="${L.floor || '#E7B9A6'}"/><rect x="960" y="780" width="960" height="300" fill="${R.floor || '#B9DCC5'}"/>
        <rect y="772" width="1920" height="14" fill="#00000018"/><rect x="950" width="20" height="1080" fill="#fff"/></svg>`;
    },
    sky(e, t) {
      const days = e.days || 0, ph = (0.35 + days * clamp(t / (e.dur || 1))) % 1, sk = skyColor(ph, e.minDay ?? 0.4);
      const a = ph * 2 * Math.PI, sx = 960 - Math.sin(a) * 1100, sy = 900 + Math.cos(a) * 760, mx = 960 + Math.sin(a) * 1100, my = 900 - Math.cos(a) * 760;
      let stars = ''; for (let i = 0; i < 40; i++) stars += `<circle cx="${rnd(i) * 1920}" cy="${rnd(i, 2) * 560}" r="${1.5 + rnd(i, 3) * 2.5}" fill="#fff"/>`;
      return `<svg viewBox="0 0 1920 1080" width="1920" height="1080"><defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sk.top}"/><stop offset="1" stop-color="${sk.bot}"/></linearGradient></defs>
        <rect width="1920" height="1080" fill="url(#sg)"/><g opacity="${clamp(1 - sk.d * 2.2)}">${stars}</g>
        <circle cx="${sx}" cy="${sy}" r="70" fill="#FFD45C"/><circle cx="${mx}" cy="${my}" r="50" fill="#F1F1F8"/>
        <path d="M0 830 Q480 780 960 820 T1920 810 V1080 H0 Z" fill="${e.ground || '#8CC084'}"/><path d="M0 880 Q600 850 1200 880 T1920 870 V1080 H0 Z" fill="${e.ground2 || '#79B070'}"/></svg>`;
    },
    plain(e) { return `<svg viewBox="0 0 1920 1080" width="1920" height="1080"><rect width="1920" height="1080" fill="${e.color || CREAM}"/></svg>`; },
  };

  // ------------------------------------------------------------------ elements: html(e) once, upd(e, node, t) every frame
  const svgAt = (x, y, s, inner, extra = '') => `<svg class="prop" style="position:absolute;left:${x - 150 * s}px;top:${y - 150 * s}px;width:${300 * s}px;height:${300 * s}px;overflow:visible${extra}" viewBox="-150 -150 300 300">${inner}</svg>`;
  const E = {
    title: {
      html: e => `<div class="ttl" style="position:absolute;left:0;right:0;top:${e.y || 380}px;text-align:center">
        <div style="font:900 ${e.size || 118}px/1.05 'Inter Display',Inter;letter-spacing:-.03em;color:#111">${e.text.split(' ').map(w => `<span class="tw" style="display:inline-block;margin:0 .14em">${w.replace(/\*(.+?)\*/g, `<span style="color:${GOLD}">$1</span>`)}</span>`).join('')}</div>
        ${e.sub ? `<div class="tsub" style="margin-top:26px;font:700 44px Inter;color:#5c564b">${e.sub}</div>` : ''}</div>`,
      upd(e, n, t) {
        n.querySelectorAll('.tw').forEach((w, i) => { const p = (t - e.in - i * 0.13) / 0.45;
          w.style.opacity = clamp(p * 2); w.style.transform = `translateY(${(1 - outBack(p)) * 60}px) scale(${0.7 + 0.3 * outBack(p)})`; });
        const s = n.querySelector('.tsub'); if (s) s.style.opacity = smooth((t - e.in - 0.6) / 0.5);
      },
    },
    label: {
      html: e => `<div style="position:absolute;left:${e.x}px;top:${e.y}px;transform:translate(-50%,-50%)"><div class="lb" style="white-space:nowrap;font:800 ${e.size || 40}px Inter;padding:${(e.size || 40) * 0.35}px ${(e.size || 40) * 0.7}px;border-radius:999px;background:${col(e.bg || 'dark')};color:${e.fg || '#fff'}">${e.text}</div></div>`,
      upd(e, n, t) { const p = outBack((t - e.in) / 0.4); n.firstChild.style.transform = `scale(${0.6 + 0.4 * p})`; },
    },
    counter: {
      html: e => `<div style="position:absolute;left:${e.x}px;top:${e.y}px;transform:translate(-50%,-50%);text-align:center;white-space:nowrap${e.card ? `;background:#ffffffe6;border-radius:28px;padding:18px 40px;box-shadow:0 8px 0 #00000018` : ''}">
        ${e.title ? `<div style="font:800 ${Math.round((e.size || 110) * 0.32)}px Inter;letter-spacing:.06em;color:${col(e.titleColor || 'muted')}">${e.title}</div>` : ''}
        <div class="cv" style="font:900 ${e.size || 110}px/1 'Inter Display',Inter;letter-spacing:-.03em;color:${col(e.color)};font-variant-numeric:tabular-nums">$0</div>
        ${e.label ? `<div class="cl" style="font:800 ${Math.round((e.size || 110) * 0.26)}px Inter;letter-spacing:.06em;color:${col(e.color)}">${e.label}</div>` : ''}</div>`,
      upd(e, n, t) {
        const v = counterValue(e, t); n.querySelector('.cv').textContent = fmtMoney(v, e.prefix ?? '$');
        const land = t - e.end, bump = land >= 0 && land < 0.5 ? Math.sin(land / 0.5 * Math.PI) * 0.12 : 0;
        n.firstElementChild.parentElement.style.transform = `translate(-50%,-50%) scale(${1 + bump})`;
      },
    },
    stamp: {
      html: e => `<div style="position:absolute;left:${e.x}px;top:${e.y}px;transform:translate(-50%,-50%)"><div class="st" style="white-space:nowrap;font:900 ${e.size || 64}px Inter;color:${col(e.color || 'green')};border:8px solid ${col(e.color || 'green')};border-radius:18px;padding:8px 30px;background:#ffffffd0">${e.text}</div></div>`,
      upd(e, n, t) { const p = outCubic((t - e.in) / 0.28); n.firstChild.style.transform = `scale(${lerp(1.7, 1, p)}) rotate(${e.rot ?? -5}deg)`; n.firstChild.style.opacity = clamp(p * 1.5); },
    },
    note: { // short on-screen assumptions; the full wording lives in the description
      html: e => `<div style="position:absolute;left:${e.x}px;top:${e.y}px;transform:translate(-50%,-50%)"><div style="white-space:nowrap;font:700 ${e.size || 30}px Inter;color:#3d3830;background:#ffffffd9;border:3px solid #00000020;border-radius:999px;padding:10px 26px">ⓘ ${noteText(e)}</div></div>`,
      upd() {},
    },
    prop: {
      html: e => svgAt(e.x, e.y, e.size || 1, `<g class="pi" transform="rotate(${e.rot || 0})">${P[e.kind](...(e.args || []))}</g>`),
      upd(e, n, t) { const b = e.bob ? Math.sin((t + (e.phase || 0)) * 2.2) * 8 : 0, p = outBack((t - e.in) / 0.35);
        n.style.transform = `translateY(${b}px) scale(${0.5 + 0.5 * p})`; },
    },
    jar: {
      html: e => svgAt(e.x, e.y, e.size || 1, '<g class="ji"></g>'),
      upd(e, n, t) { const lv = rampValue(e.level, t); n.querySelector('.ji').innerHTML = P.jar(lv, e.glow ? smooth((t - e.glow) / 0.6) * (1 + 0.15 * Math.sin(t * 6)) : 0); },
    },
    plant: {
      html: e => svgAt(e.x, e.y, e.size || 1, '<g class="pg"></g>'),
      upd(e, n, t) { const g = rampValue(e.grow, t); n.querySelector('.pg').innerHTML = `<g transform="rotate(${Math.sin(t * 1.3) * 2})">${P.plant(g)}</g>`; },
    },
    laptop: {
      html: e => svgAt(e.x, e.y, e.size || 1, '<g class="lp"></g>'),
      upd(e, n, t) { n.querySelector('.lp').innerHTML = P.laptop(rampValue(e.chart || { start: e.in, end: e.in + 1, from: 1, to: 1 }, t)); },
    },
    pile: { // things bought pile up, then lose their shine
      html: e => `<div style="position:absolute;left:0;top:0">${[...Array(e.max || 8).keys()].map(i => {
        const x = e.x + (i % 3 - 1) * 70 * (e.size || 1) + (rnd(i, 5) - 0.5) * 20, y = e.y - Math.floor(i / 3) * 62 * (e.size || 1);
        const k = (e.kinds || ['box', 'bag'])[i % (e.kinds || ['box', 'bag']).length];
        return svgAt(x, y, 0.62 * (e.size || 1), `<g transform="rotate(${(rnd(i, 9) - 0.5) * 16})">${P[k](['#D9A86C', '#E86A5B', '#5B7DB1', '#C9A24B'][i % 4])}</g>`, ';opacity:0');
      }).join('')}</div>`,
      upd(e, n, t) { const items = n.querySelectorAll('.prop'), N = items.length;
        items.forEach((it, i) => { const ti = e.start + (e.end - e.start) * (i / Math.max(1, N - 1)), p = outBack((t - ti) / 0.35);
          it.style.opacity = t >= ti ? 1 : 0; it.style.transform = `translateY(${(1 - p) * -80}px) scale(${0.6 + 0.4 * clamp(p)})`;
          if (e.fade) it.style.filter = `grayscale(${smooth((t - e.fade[0]) / (e.fade[1] - e.fade[0]))}) brightness(${1 - 0.25 * smooth((t - e.fade[0]) / (e.fade[1] - e.fade[0]))})`; });
      },
    },
    emitter: { // coins/bills flying from -> to (an arc), one every `every` seconds
      html: e => { const n = Math.max(1, Math.floor((e.end - e.start) / (e.every || 0.5)));
        return `<div>${[...Array(n).keys()].map(() => svgAt(0, 0, e.size || 0.6, P[e.kind || 'coin'](), ';opacity:0')).join('')}</div>`; },
      upd(e, n, t) { const fl = e.flight || 0.8;
        n.querySelectorAll('.prop').forEach((it, i) => { const t0 = e.start + i * (e.every || 0.5), p = (t - t0) / fl;
          if (p < 0 || p > 1) { it.style.opacity = 0; return; }
          const x = lerp(e.from[0], e.to[0], p), y = lerp(e.from[1], e.to[1], p) + (e.arc ?? -220) * 4 * p * (1 - p);
          it.style.opacity = p > 0.9 ? (1 - p) * 10 : 1; it.style.left = (x - 150 * (e.size || 0.6)) + 'px'; it.style.top = (y - 150 * (e.size || 0.6)) + 'px';
          it.style.transform = `rotate(${p * 360 * (e.spin ?? 1)}deg)`; });
      },
    },
    thought: {
      html: e => `<div style="position:absolute;left:${e.x}px;top:${e.y}px;transform:translate(-50%,-50%)"><div class="tb" style="position:relative;background:#fff;border:6px solid #151515;border-radius:60px;padding:18px 34px;font-size:${e.size || 64}px;white-space:nowrap">${e.icons.map(i => `<span class="ti" style="display:inline-block;margin:0 8px">${i}</span>`).join('')}
        <div style="position:absolute;left:${e.tail === 'r' ? 75 : 20}%;bottom:-38px;width:26px;height:26px;border-radius:50%;background:#fff;border:5px solid #151515"></div><div style="position:absolute;left:${e.tail === 'r' ? 82 : 12}%;bottom:-66px;width:14px;height:14px;border-radius:50%;background:#fff;border:4px solid #151515"></div></div></div>`,
      upd(e, n, t) { const p = outBack((t - e.in) / 0.4); n.firstChild.style.transform = `scale(${0.4 + 0.6 * p})`;
        n.querySelectorAll('.ti').forEach((s, i) => { s.style.transform = `translateY(${Math.sin(t * 5 + i) * 6}px) scale(${outBack((t - e.in - 0.15 - i * 0.18) / 0.35)})`; }); },
    },
    chart: { // progressive line chart from fact series; a dot + value tag ride the head of each line
      html: e => { const s = e.series.map((d, i) => `<path class="ca${i}" fill="${d.fill || 'none'}" opacity=".25"/><polyline class="cs${i}" fill="none" stroke="${col(d.color)}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><circle class="cd${i}" r="14" fill="${col(d.color)}" stroke="#fff" stroke-width="5"/>`).join('');
        const ticks = (e.xlabels || []).map((l, i, a) => `<text x="${e.w * i / (a.length - 1)}" y="${e.h + 46}" text-anchor="middle" font-family="Inter" font-weight="800" font-size="30" fill="#5c564b">${l}</text>`).join('');
        const tags = e.series.map((d, i) => `<div class="ct${i}" style="position:absolute;white-space:nowrap;font:900 36px Inter;color:#fff;background:${col(d.color)};padding:6px 16px;border-radius:12px;transform:translate(-50%,-140%)"></div>`).join('');
        const leg = e.series.map(d => `<span style="display:inline-flex;align-items:center;margin-right:26px"><span style="width:28px;height:10px;border-radius:5px;background:${col(d.color)};margin-right:10px"></span>${d.label}</span>`).join('');
        return `<div style="position:absolute;left:${e.x}px;top:${e.y}px;width:${e.w}px;height:${e.h}px">
          <div style="position:absolute;left:0;top:-64px;font:800 30px Inter;color:#3d3830">${leg}</div>
          <svg width="${e.w}" height="${e.h + 60}" style="position:absolute;overflow:visible"><rect width="${e.w}" height="${e.h}" fill="#ffffffb8" rx="18"/>
          ${[0.25, 0.5, 0.75].map(f => `<path d="M0 ${e.h * f} H${e.w}" stroke="#00000014" stroke-width="3"/>`).join('')}${s}${ticks}</svg>${tags}</div>`; },
      upd(e, n, t) {
        const p = rampP(e, t), ymax = e.ymax;
        e.series.forEach((d, i) => { const data = SERIES(d.id, d.from ?? 0), m = Math.max(1, Math.round(p * (data.length - 1)));
          const xs = k => e.w * k / (data.length - 1), ys = v => e.h - e.h * v / ymax;
          const pts = []; for (let k = 0; k <= m; k++) pts.push(`${xs(k).toFixed(1)},${ys(data[k]).toFixed(1)}`);
          n.querySelector('.cs' + i).setAttribute('points', pts.join(' '));
          if (d.fill) n.querySelector('.ca' + i).setAttribute('d', `M0 ${e.h} L${pts.join(' L')} L${xs(m)} ${e.h} Z`);
          const dot = n.querySelector('.cd' + i); dot.setAttribute('cx', xs(m)); dot.setAttribute('cy', ys(data[m])); dot.style.opacity = p > 0.01 ? 1 : 0;
          const tag = n.querySelector('.ct' + i); tag.style.left = xs(m) + 'px'; tag.style.top = (ys(data[m]) + (d.tagDy || 0)) + 'px';
          tag.textContent = fmtMoney(data[m]); tag.style.opacity = p > 0.01 && d.tag !== false ? 1 : 0; });
      },
    },
    timeline: { // track with year ticks and a marker that hops year by year
      html: e => `<div style="position:absolute;left:${e.x}px;top:${e.y}px;width:${e.w}px">
        <div style="position:absolute;left:0;right:0;top:0;height:14px;border-radius:7px;background:#00000022"></div><div class="tf" style="position:absolute;left:0;top:0;height:14px;border-radius:7px;background:${col(e.color || 'gold')}"></div>
        ${[...Array(e.years + 1).keys()].map(y => `<div style="position:absolute;left:${e.w * y / e.years}px;top:-9px;width:32px;height:32px;margin-left:-16px;border-radius:50%;background:#fff;border:6px solid ${col(e.color || 'gold')}"></div><div style="position:absolute;left:${e.w * y / e.years}px;top:36px;transform:translateX(-50%);font:800 26px Inter;color:#3d3830;white-space:nowrap;background:#ffffffd9;padding:3px 12px;border-radius:999px">${y === 0 ? (e.startLabel || 'TODAY') : 'YEAR ' + y}</div>`).join('')}
        <div class="tm" style="position:absolute;top:-36px;width:76px;height:76px;margin-left:-38px;border-radius:50%;background:${col(e.color || 'gold')};border:7px solid #fff;box-shadow:0 6px 0 #00000025"></div></div>`,
      upd(e, n, t) { const yrs = yearProgress(e, t), x = e.w * yrs / e.years;
        n.querySelector('.tm').style.left = x + 'px'; n.querySelector('.tf').style.width = x + 'px';
        const hop = yrs % 1; n.querySelector('.tm').style.transform = `translateY(${-Math.sin(Math.PI * clamp(hop * 1.6)) * 26}px)`; },
    },
    calendar: { // flips a page for every month, a big flip each year
      html: e => `<div style="position:absolute;left:${e.x}px;top:${e.y}px;transform:translate(-50%,-50%);perspective:800px">
        <div class="cp" style="width:${e.w || 230}px;background:#fff;border:6px solid #151515;border-radius:22px;overflow:hidden;text-align:center;box-shadow:0 10px 0 #00000022">
        <div style="background:${col(e.color || 'red')};color:#fff;font:900 30px Inter;letter-spacing:.08em;padding:10px">MONTH</div>
        <div class="cm" style="font:900 96px/1.1 'Inter Display',Inter;color:#111;padding:8px 0 0">0</div><div class="cy" style="font:800 30px Inter;color:#5c564b;padding:0 0 14px">YEAR 0</div></div></div>`,
      upd(e, n, t) { const yrs = yearProgress(e, t), m = Math.min(e.years * 12, Math.floor(yrs * 12 + 1e-6));
        n.querySelector('.cm').textContent = m; n.querySelector('.cy').textContent = 'YEAR ' + Math.min(e.years, Math.ceil(m / 12));
        const f = (yrs * 12) % 1; n.querySelector('.cp').style.transform = `rotateX(${m < e.years * 12 && f > 0.75 ? (f - 0.75) * 4 * 70 : 0}deg)`; },
    },
  };

  // ------------------------------------------------------------------ value helpers (numbers come from FACTS only)
  let FACTS = { values: {}, series: {}, assumptions: [] };
  const SERIES = (id, from = 0) => { const s = FACTS.series[id]; if (!s) throw new Error('unknown series ' + id); return from === 0 ? [0, ...s] : s; };
  function rampP(e, t) { return smooth(((t - e.start) / Math.max(1e-3, e.end - e.start))); }
  function rampValue(r, t) { if (r === undefined) return 1; if (typeof r === 'number') return r;
    if (r.series) { const s = SERIES(r.series), i = clamp((t - r.start) / (r.end - r.start)) * (r.idx ? r.idx[1] - r.idx[0] : s.length - 1) + (r.idx ? r.idx[0] : 0);
      const v = lerp(s[Math.floor(i)], s[Math.min(s.length - 1, Math.floor(i) + 1)], i % 1); return v / (r.scale || 1); }
    return lerp(r.from ?? 0, r.to ?? 1, (r.ease === 'linear' ? clamp : smooth)((t - r.start) / (r.end - r.start))); }
  function yearProgress(e, t) { const p = clamp((t - e.start) / (e.end - e.start)) * e.years;
    if (e.mode !== 'stepped') return p; const k = Math.floor(p), f = p - k; return k + smooth(clamp((f - 0.35) / 0.65)); }
  function counterValue(e, t) {
    if (t >= e.end) return e.final;                       // lands exactly on the verified value
    if (e.series) { const s = SERIES(e.series, 0), i0 = e.idx ? e.idx[0] : 0, i1 = e.idx ? e.idx[1] : s.length - 1;
      const p = (e.stepped ? yearProgress({ ...e, years: e.stepped }, t) / e.stepped : clamp((t - e.start) / (e.end - e.start)));
      const i = i0 + (i1 - i0) * p, k = Math.floor(i), f = e.steps === false ? i - k : smooth(clamp((i - k - 0.7) / 0.3));   // rolls in the last 30% of the month, lands as the calendar flips
      return lerp(s[k], s[Math.min(s.length - 1, k + 1)], f); }   // rests on whole months: $300 steps, never in-between amounts
    return lerp(e.from || 0, e.final, outCubic((t - e.start) / (e.end - e.start)));
  }
  function noteText(e) { return (e.assumptions || []).map(id => { const a = FACTS.assumptions.find(x => x.id === id); return a ? (a.screen || a.text) : '??' + id; }).join(' · '); }

  root.LL = { E, ENV, P, clamp, smooth, outBack, outCubic, lerp, rnd, fade, setFacts: f => { FACTS = f; } };
})(typeof window !== 'undefined' ? window : globalThis);
