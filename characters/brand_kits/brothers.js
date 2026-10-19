// Brand kits for Lobe's brothers: profile (1080²), YouTube banner (2560×1440), Facebook cover (1640×624).
// Each brother keeps the family drawing style but gets his own colours, type and mood.
const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
const fs = require('fs');
const CH = '/home/claude/lobelessons-media/characters';
const F = '/home/claude/fonts';
const S = (who, pose) => fs.readFileSync(`${CH}/${who}/svg/${who}_${pose}.svg`, 'utf8');
const font = (name, file, w = 400, st = 'normal') => `@font-face{font-family:'${name}';src:url(data:font/woff2;base64,${fs.readFileSync(file).toString('base64')}) format('woff2');font-weight:${w};font-style:${st}}`;
const FONTS = font('Anton', `${F}/fontsource-anton-5.3.0/package/files/anton-latin-400-normal.woff2`) +
  font('Playfair', `${F}/fontsource-playfair-display-5.3.0/package/files/playfair-display-latin-800-normal.woff2`, 800) +
  font('Playfair', `${F}/fontsource-playfair-display-5.3.0/package/files/playfair-display-latin-700-italic.woff2`, 700, 'italic');

// --- decorations -------------------------------------------------------------
const ecg = (w, h, y, c, o = .35, sw = 6) => `<svg width="${w}" height="${h}" style="position:absolute;left:0;top:0" viewBox="0 0 ${w} ${h}"><path d="M0 ${y} ${Array.from({length: Math.ceil(w / 420)}, (_, i) => { const x = i * 420; return `L${x + 150} ${y} L${x + 175} ${y - 30} L${x + 200} ${y + 25} L${x + 225} ${y - 110} L${x + 255} ${y + 70} L${x + 280} ${y} L${x + 420} ${y}`; }).join(' ')}" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round" opacity="${o}"/></svg>`;
const plus = (x, y, s, c, o = .5) => `<div style="position:absolute;left:${x}px;top:${y}px;width:${s}px;height:${s}px;opacity:${o}"><div style="position:absolute;left:35%;top:0;width:30%;height:100%;background:${c};border-radius:4px"></div><div style="position:absolute;top:35%;left:0;height:30%;width:100%;background:${c};border-radius:4px"></div></div>`;
const star = (x, y, s, c = '#fff', o = .9) => `<svg style="position:absolute;left:${x}px;top:${y}px;opacity:${o}" width="${s}" height="${s}" viewBox="-22 -22 44 44"><path d="M0 -22 C2 -6 6 -2 22 0 C6 2 2 6 0 22 C-2 6 -6 2 -22 0 C-6 -2 -2 -6 0 -22 Z" fill="${c}"/></svg>`;
const glow = (x, y, r, c) => `<div style="position:absolute;left:${x - r}px;top:${y - r}px;width:${2 * r}px;height:${2 * r}px;border-radius:50%;background:radial-gradient(circle, ${c} 0%, transparent 68%)"></div>`;
const blob = (x, y, w, h, c, o = 1) => `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:50%;background:${c};opacity:${o};filter:blur(2px)"></div>`;

// --- the four brothers -------------------------------------------------------
const B = {
  drbeat: {
    bg: '#EDF5F2', ink: '#14302A', sub: '#4F6B64', acc: '#E0526A',
    title: `Dr.&thinsp;<span style="color:#E0526A">Beat</span>`, titleCss: `font:800 1em 'Inter Display';letter-spacing:-.045em`,
    tag: 'How your body really works.', tagCss: `font:600 1em Inter`,
    pills: ['🫀 Heart', '🧠 Brain', '🦴 Body', '😴 Sleep'], pillCss: c => `background:#fff;color:#14302A;border:2px solid #CFE3DC`,
    handle: '@drbeat.explains', poseP: 'approve', poseB: 'explain',
    deco: (w, h, k) => ecg(w, h, k.ecgY, '#E0526A', .22, k.sw) + plus(k.p1[0], k.p1[1], k.ps, '#7CC3AE', .45) + plus(k.p2[0], k.p2[1], k.ps * .7, '#E0526A', .35),
  },
  lumi: {
    bg: '#15151B', ink: '#FFFFFF', sub: '#B9B9C6', acc: '#F7C948',
    title: `LUMI <span style="color:#F7C948">CREATES</span>`, titleCss: `font:400 1em Anton;letter-spacing:.01em`,
    tag: 'Make content people actually finish.', tagCss: `font:600 1em Inter`,
    pills: ['🎣 Hooks', '💡 Lighting', '✂️ Editing', '📈 Growth'], pillCss: c => `background:#F7C948;color:#15151B`,
    handle: '@lumi.creates', poseP: 'idea', poseB: 'explain',
    deco: (w, h, k) => glow(k.gx, k.gy, k.gr, 'rgba(247,201,72,.33)') + `<div style="position:absolute;left:${k.rec[0]}px;top:${k.rec[1]}px;font:700 ${k.rs}px Inter;color:#fff;letter-spacing:.12em;display:flex;align-items:center;gap:${k.rs * .5}px"><span style="width:${k.rs * .8}px;height:${k.rs * .8}px;border-radius:50%;background:#FF4D4D;display:inline-block"></span>REC</div>`,
  },
  nimbus: {
    bg: 'linear-gradient(160deg,#DCE7FA 0%,#E9E3F7 55%,#F6EEF3 100%)', ink: '#2E4470', sub: '#62729A', acc: '#7C93D6',
    title: `nimbus`, titleCss: `font:300 1em 'Inter Display';letter-spacing:-.03em;text-transform:lowercase`,
    tag: 'slow down. breathe. feel better.', tagCss: `font:400 1em Inter;letter-spacing:.02em`,
    pills: ['🌙 Sleep', '🌿 Stress', '🫁 Breathing', '☁️ Calm'], pillCss: c => `background:rgba(255,255,255,.65);color:#2E4470;border:2px solid rgba(255,255,255,.9)`,
    handle: '@nimbus.calm', poseP: 'calm', poseB: 'calm',
    deco: (w, h, k) => k.stars.map(([x, y, s]) => star(x, y, s, '#fff', .9)).join('') + blob(k.c1[0], k.c1[1], k.c1[2], k.c1[3], '#fff', .45) + blob(k.c2[0], k.c2[1], k.c2[2], k.c2[3], '#fff', .35),
  },
  roux: {
    bg: '#FBF3E8', ink: '#2B1B12', sub: '#7A5A47', acc: '#D9724A',
    title: `Roux <i style="color:#D9724A;font-style:italic;font-weight:700">Food Lab</i>`, titleCss: `font:800 1em Playfair;letter-spacing:-.01em`,
    tag: 'The science behind your food.', tagCss: `font:600 1em Inter`,
    pills: ['🍳 Why it works', '🧪 Fix it', '🥖 Try it'], pillCss: c => `background:#2B1B12;color:#FBF3E8`,
    handle: '@roux.foodlab', poseP: 'approve', poseB: 'explain',
    grid: true,
    deco: () => '',
  },
};
const bgCss = b => `background:${b.bg};` + (b.grid ? `background-image:linear-gradient(rgba(217,114,74,.10) 2px,transparent 2px),linear-gradient(90deg,rgba(217,114,74,.10) 2px,transparent 2px);background-size:64px 64px;` : '');

const text = (b, sz) => `
  <div style="${b.titleCss};font-size:${sz.t}px;color:${b.ink};line-height:1;white-space:nowrap">${b.title}</div>
  <div style="${b.tagCss};font-size:${sz.s}px;color:${b.sub};margin-top:${sz.s * .5}px">${b.tag}</div>
  <div style="display:flex;gap:${sz.p * .5}px;margin-top:${sz.p * 1.1}px;flex-wrap:nowrap">${b.pills.map(t => `<div style="${b.pillCss()};font:700 ${sz.p}px Inter;padding:${sz.p * .45}px ${sz.p * .95}px;border-radius:99px;white-space:nowrap">${t}</div>`).join('')}</div>
  <div style="font:600 ${sz.h}px Inter;color:${b.sub};margin-top:${sz.h * .9}px;white-space:nowrap"><b style="color:${b.ink}">${b.handle}</b> · YouTube · Instagram · TikTok</div>`;

const pages = (id, b) => ({
  profile: [1080, 1080, `<div style="width:1080px;height:1080px;${bgCss(b)};position:relative;overflow:hidden">
     ${id === 'lumi' ? glow(540, 560, 520, 'rgba(247,201,72,.38)') : ''}
     ${id === 'nimbus' ? star(180, 200, 60) + star(860, 260, 40) + star(820, 830, 34) : ''}
     ${id === 'drbeat' ? ecg(1080, 1080, 900, '#E0526A', .18, 8) : ''}
     <div style="position:absolute;left:50%;top:50%;width:${id==='roux'?720:800}px;transform:translate(-50%,-50%) translate(${id==='drbeat'?-20:id==='lumi'?0:0}px,${id==='roux'?10:20}px)">${S(id, b.poseP)}</div></div>`],
  banner: [2560, 1440, `<div style="width:2560px;height:1440px;${bgCss(b)};position:relative;overflow:hidden">
     ${b.deco(2560, 1440, { ecgY: 1000, sw: 8, p1: [400, 300], p2: [2200, 1100], ps: 70, gx: 820, gy: 720, gr: 520, rec: [1880, 560], rs: 34,
        stars: [[300, 260, 70], [2150, 320, 50], [2300, 1100, 60], [500, 1150, 40], [1950, 520, 36]], c1: [-120, 1180, 900, 380], c2: [1900, -160, 900, 360] })}
     <div style="position:absolute;left:507px;top:508px;width:1546px;height:423px;display:flex;align-items:center;gap:40px">
        <div style="width:440px;flex:none;margin-left:30px">${S(id, b.poseB)}</div>
        <div>${text(b, { t: id === 'lumi' ? 150 : 140, s: 44, p: 28, h: 28 })}</div>
     </div></div>`],
  fbcover: [1640, 624, `<div style="width:1640px;height:624px;${bgCss(b)};position:relative;overflow:hidden">
     ${b.deco(1640, 624, { ecgY: 520, sw: 5, p1: [700, 90], p2: [1500, 470], ps: 44, gx: 1285, gy: 300, gr: 300, rec: [1480, 60], rs: 22,
        stars: [[760, 80, 40], [1520, 120, 30], [1060, 470, 26], [80, 70, 24]], c1: [-80, 470, 600, 220], c2: [1100, -90, 640, 220] })}
     <div style="position:absolute;left:110px;top:0;height:624px;display:flex;flex-direction:column;justify-content:center">
       ${text(b, { t: id === 'lumi' ? 92 : 86, s: 30, p: 22, h: 22 })}</div>
     <div style="position:absolute;left:1120px;top:150px;width:330px">${S(id, b.poseB)}</div></div>`],
});

(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await br.newPage();
  const only = process.argv[2];
  for (const [id, b] of Object.entries(B)) {
    if (only && only !== id) continue;
    fs.mkdirSync(`/home/claude/brand/brothers/${id}`, { recursive: true });
    for (const [name, [w, h, html]] of Object.entries(pages(id, b))) {
      await p.setViewportSize({ width: w, height: h });
      await p.setContent(`<html><head><style>${FONTS} body{margin:0}</style></head><body>${html}</body></html>`);
      await p.evaluate(() => document.fonts.ready);
      await p.waitForTimeout(150);
      await p.screenshot({ path: `/home/claude/brand/brothers/${id}/${id}_${name}.png` });
    }
  }
  await br.close();
})();
