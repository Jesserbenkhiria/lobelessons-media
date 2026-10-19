// Retro "rubber-hose" redesigns: Cue (film reel, gloves + sneakers) and Nimbus (meditating line-art cloud).
// Original drawings; only the general cartoon style is shared with 1930s-style references.
const fs = require('fs'), path = require('path');
const INK = '#151515', GOLD = '#C9A24B';
const rad = a => a * Math.PI / 180;
const dir = a => [Math.sin(rad(a)), -Math.cos(rad(a))];

// tube limb: outline stroke then fill stroke on top
const tube = (d, fill, line, w = 13, ow = 5) => `<path d="${d}" fill="none" stroke="${line}" stroke-width="${w + 2 * ow}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${fill}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

// hand / glove in local coords: palm at 0,0, fingers toward -y. kinds: open, point, thumb, fist, mudra
const cap = (x, y, w, h, r, fill, line, sw) => `<rect x="${x - w / 2}" y="${y - h}" width="${w}" height="${h + 6}" rx="${w / 2}" transform="rotate(${r} ${x} ${y})" fill="${fill}" stroke="${line}" stroke-width="${sw}"/>`;
function hand(kind, x, y, a, fill, line, sw, cuff) {
  let f = '';
  if (kind === 'open') f = [[-12, -6, -16], [-4, -10, -5], [5, -10, 6], [13, -6, 17]].map(([fx, fy, r]) => cap(fx, fy, 10, 20, r, fill, line, sw)).join('') + cap(-14, 4, 10, 16, -70, fill, line, sw);
  if (kind === 'point') f = cap(2, -8, 10, 26, 0, fill, line, sw);
  if (kind === 'thumb') f = cap(-6, -8, 11, 22, -8, fill, line, sw);
  if (kind === 'mudra') f = cap(4, -8, 9, 18, 8, fill, line, sw) + cap(12, -4, 9, 16, 22, fill, line, sw) + `<circle cx="-9" cy="-14" r="9" fill="none" stroke="${line}" stroke-width="${sw}"/>`;
  const palm = `<ellipse cx="0" cy="0" rx="17" ry="16" fill="${fill}" stroke="${line}" stroke-width="${sw}"/>`;
  const knuckles = (kind === 'fist' || kind === 'point' || kind === 'thumb') ? `<path d="M-9 -4 q4 3 8 0 M1 -4 q4 3 8 0" fill="none" stroke="${line}" stroke-width="${sw * .7}" stroke-linecap="round"/>` : (kind === 'open' ? `<path d="M-6 4 q6 4 12 0" fill="none" stroke="${line}" stroke-width="${sw * .7}" stroke-linecap="round"/>` : '');
  const c = cuff ? `<rect x="-15" y="12" width="30" height="13" rx="6" fill="${fill}" stroke="${line}" stroke-width="${sw}"/>` : '';
  return `<g transform="translate(${x} ${y}) rotate(${a})">${c}${f}${palm}${knuckles}</g>`;
}
function arm(sx, sy, g, fill, line, w, ow, cuff) {
  const [dx, dy] = dir(g.a); const back = cuff ? 26 : 14;
  const wx = g.x - dx * back, wy = g.y - dy * back;
  const c1x = sx + (wx - sx) * .25, c1y = sy + 30, c2x = wx - dx * 45, c2y = wy - dy * 45;
  return tube(`M${sx} ${sy} C${c1x} ${c1y} ${c2x} ${c2y} ${wx} ${wy}`, fill, line, w, ow);
}

// ============================ CUE: film reel ============================
const CUE = (() => {
  const V = '#7C6CF2', VDK = '#4B3FC0', VHI = '#A99FF8', HOLE = '#2A2340', SHOE = '#F7C948', TONGUE = '#F27C9B';
  const CX = 200, CY = 168, R = 106;
  const holes = [-90, -150, -30, 150, 30].map(t => {
    const r = t === -90 ? 72 : 76; const s = t === -90 ? 18 : 15;
    return `<circle cx="${CX + r * Math.cos(rad(t))}" cy="${CY + r * Math.sin(rad(t))}" r="${s}" fill="${HOLE}" stroke="${INK}" stroke-width="4"/>`;
  }).join('');
  const film = `<g>
    <path d="M262 236 C318 270 330 316 300 344 C282 362 312 380 352 372" fill="none" stroke="${INK}" stroke-width="40" stroke-linecap="butt"/>
    <path d="M262 236 C318 270 330 316 300 344 C282 362 312 380 352 372" fill="none" stroke="#fff" stroke-width="30" stroke-dasharray="5 7"/>
    <path d="M262 236 C318 270 330 316 300 344 C282 362 312 380 352 372" fill="none" stroke="${INK}" stroke-width="20"/>
    <path d="M262 236 C318 270 330 316 300 344 C282 362 312 380 352 372" fill="none" stroke="#3B3550" stroke-width="12" stroke-dasharray="16 4"/></g>`;
  const body = `<circle cx="${CX + 14}" cy="${CY + 6}" r="${R}" fill="${VDK}" stroke="${INK}" stroke-width="5"/>
    <rect x="${CX}" y="${CY - R}" width="14" height="${2 * R}" fill="${VDK}"/>
    <circle cx="${CX}" cy="${CY}" r="${R}" fill="${V}" stroke="${INK}" stroke-width="5"/>
    <circle cx="${CX}" cy="${CY}" r="${R - 13}" fill="none" stroke="${INK}" stroke-width="3" opacity=".55"/>
    <path d="M${CX - 70} ${CY - 66} q30 -30 72 -34" fill="none" stroke="${VHI}" stroke-width="7" stroke-linecap="round" opacity=".8"/>` + holes;
  const shoe = (x, flip) => `<g transform="translate(${x} 362) scale(${flip ? -1 : 1} 1)">
    <path d="M-14 -14 C-14 -30 14 -30 16 -14 L34 -8 C46 -4 46 10 34 10 L-18 10 C-26 10 -26 -10 -14 -14 Z" fill="${SHOE}" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>
    <path d="M-20 4 L38 4" stroke="${INK}" stroke-width="3.5"/><path d="M28 -6 C36 -4 40 0 40 4" fill="#fff" stroke="${INK}" stroke-width="3"/>
    <path d="M0 -20 l8 4 M4 -24 l8 4" stroke="${INK}" stroke-width="3" stroke-linecap="round"/></g>`;
  const legs = tube(`M184 262 C182 300 178 320 182 346`, V, INK, 14, 4.5) + tube(`M216 262 C218 300 222 320 218 346`, V, INK, 14, 4.5) + shoe(176, true) + shoe(224, false);
  // face
  const eye = (x, open = 1, look = 0) => `<ellipse cx="${x}" cy="150" rx="15" ry="${21 * open}" fill="#fff" stroke="${INK}" stroke-width="4"/>` + (open > .5 ? `<ellipse cx="${x + 3 + look}" cy="${154}" rx="7" ry="10" fill="${INK}"/><circle cx="${x + 5 + look}" cy="148" r="2.6" fill="#fff"/>` : '');
  const shut = x => `<path d="M${x - 14} 152 q14 -14 28 0" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`;
  const brow = (x, dy = 0, t = 0) => `<path d="M${x - 13} ${120 + dy} q13 ${-9 + t} 26 0" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/>`;
  const M = {
    talk: `<path d="M180 196 q20 6 40 0 q-4 26 -20 26 q-16 0 -20 -26 Z" fill="${INK}"/><path d="M188 214 q12 -8 24 0 q-4 8 -12 8 q-8 0 -12 -8 Z" fill="${TONGUE}"/>`,
    grin: `<path d="M174 194 q26 8 52 0 q-6 32 -26 32 q-20 0 -26 -32 Z" fill="${INK}"/><path d="M186 216 q14 -9 28 0 q-5 10 -14 10 q-9 0 -14 -10 Z" fill="${TONGUE}"/><path d="M178 196 q22 6 44 0 l-2 6 q-20 5 -40 0 Z" fill="#fff"/>`,
    oh: `<ellipse cx="200" cy="208" rx="11" ry="15" fill="${INK}"/><ellipse cx="200" cy="215" rx="6" ry="5" fill="${TONGUE}"/>`,
    smile: `<path d="M182 200 q18 16 36 0" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`,
  };
  const cheeks = `<ellipse cx="160" cy="190" rx="10" ry="6" fill="#F29BB0" opacity=".7"/><ellipse cx="240" cy="190" rx="10" ry="6" fill="#F29BB0" opacity=".7"/>`;
  const face = {
    explain: brow(182, 0) + brow(218, -2) + eye(182) + eye(218) + M.talk,
    idea: brow(182, -4) + brow(218, -6) + eye(182, 1, -2) + eye(218, 1, -2) + M.grin,
    shock: brow(182, -10, -3) + brow(218, -10, -3) + `<ellipse cx="182" cy="150" rx="17" ry="24" fill="#fff" stroke="${INK}" stroke-width="4"/><ellipse cx="218" cy="150" rx="17" ry="24" fill="#fff" stroke="${INK}" stroke-width="4"/><circle cx="183" cy="152" r="5" fill="${INK}"/><circle cx="217" cy="152" r="5" fill="${INK}"/>` + M.oh,
    approve: brow(182, 0) + brow(218, -4) + shut(182) + eye(218) + M.grin,
    calm: shut(182) + shut(218) + M.smile,
  };
  const G = {
    explain: [{ k: 'open', x: 52, y: 214, a: -70 }, { k: 'open', x: 352, y: 132, a: 30 }],
    idea: [{ k: 'fist', x: 78, y: 262, a: -150 }, { k: 'point', x: 330, y: 70, a: 8 }],
    shock: [{ k: 'open', x: 56, y: 96, a: -28 }, { k: 'open', x: 344, y: 96, a: 28 }],
    approve: [{ k: 'fist', x: 78, y: 262, a: -150 }, { k: 'thumb', x: 346, y: 120, a: 10 }],
    calm: [{ k: 'open', x: 64, y: 228, a: -110 }, { k: 'open', x: 336, y: 228, a: 110 }],
  };
  const spark = (x, y, s = 1) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -22 C2 -6 6 -2 22 0 C6 2 2 6 0 22 C-2 6 -6 2 -22 0 C-6 -2 -2 -6 0 -22 Z" fill="${GOLD}"/>`;
  return n => {
    const [l, r] = G[n];
    const arms = arm(108, 196, l, V, INK, 14, 4.5, true) + arm(292, 196, r, V, INK, 14, 4.5, true);
    const hands = hand(l.k, l.x, l.y, l.a, '#fff', INK, 4.5, true) + hand(r.k, r.x, r.y, r.a, '#fff', INK, 4.5, true);
    const extra = n === 'idea' ? spark(366, 52, .9) : n === 'shock' ? `<g stroke="${GOLD}" stroke-width="5" stroke-linecap="round"><path d="M110 40 l-12 -14 M290 40 l12 -14 M200 30 v-18"/></g>` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 400">${film}${legs}${arms}${body}${cheeks}${face[n]}${hands}${extra}</svg>`;
  };
})();

// ============================ NIMBUS: line-art meditating cloud ============================
const NIMBUS = (() => {
  const BL = '#1E5BD8', LT = '#A9C4F5', W = '#FFFFFF', SW = 4.5;
  const C = [[148, 178, 52], [206, 140, 64], [266, 172, 54], [118, 218, 40], [292, 214, 40], [206, 206, 70], [160, 236, 36], [250, 238, 38]];
  const cloud = C.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${W}" stroke="${BL}" stroke-width="${SW * 2}"/>`).join('') + C.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${W}"/>`).join('') +
    `<g fill="none" stroke="${BL}" stroke-width="3.5" stroke-linecap="round"><path d="M128 196 q10 -14 24 -14"/><path d="M262 132 q14 2 22 14"/><path d="M190 96 q16 -8 32 -4"/></g>`;
  // crossed legs (lotus) in front of the cloud bottom
  const legs = tube(`M150 250 C96 266 104 312 160 312 C210 312 248 300 270 286`, W, BL, 18, SW) + tube(`M262 250 C316 266 308 312 252 312 C202 312 164 300 142 286`, W, BL, 18, SW) +
    `<ellipse cx="282" cy="282" rx="22" ry="14" transform="rotate(-24 282 282)" fill="${W}" stroke="${BL}" stroke-width="${SW}"/><path d="M268 274 q10 -6 24 2" fill="none" stroke="${LT}" stroke-width="6" stroke-linecap="round"/>` +
    `<ellipse cx="130" cy="282" rx="22" ry="14" transform="rotate(24 130 282)" fill="${W}" stroke="${BL}" stroke-width="${SW}"/><path d="M120 276 q10 -6 22 0" fill="none" stroke="${LT}" stroke-width="6" stroke-linecap="round"/>`;
  const shadow = `<ellipse cx="206" cy="352" rx="110" ry="10" fill="${LT}" opacity=".45"/>`;
  const eyeL = (x, mode) => {
    const base = `<ellipse cx="${x}" cy="176" rx="15" ry="20" fill="${W}" stroke="${BL}" stroke-width="${SW}"/>`;
    if (mode === 'calm') return `<clipPath id="ec${x}"><ellipse cx="${x}" cy="176" rx="15" ry="20"/></clipPath><ellipse cx="${x}" cy="176" rx="15" ry="20" fill="${W}"/><rect x="${x - 16}" y="150" width="32" height="28" fill="${LT}" clip-path="url(#ec${x})"/><ellipse cx="${x}" cy="176" rx="15" ry="20" fill="none" stroke="${BL}" stroke-width="${SW}"/><path d="M${x - 15} 178 q15 8 30 0" fill="none" stroke="${BL}" stroke-width="${SW}" stroke-linecap="round"/>`;
    if (mode === 'wink') return `<path d="M${x - 14} 178 q14 -12 28 0" fill="none" stroke="${BL}" stroke-width="${SW + .5}" stroke-linecap="round"/>`;
    if (mode === 'shock') return `<ellipse cx="${x}" cy="174" rx="17" ry="23" fill="${W}" stroke="${BL}" stroke-width="${SW}"/><circle cx="${x}" cy="176" r="5" fill="${BL}"/>`;
    return base + `<ellipse cx="${x + 2}" cy="180" rx="7" ry="10" fill="${BL}"/><circle cx="${x + 4}" cy="175" r="2.4" fill="${W}"/>`;
  };
  const brow = (x, dy = 0) => `<path d="M${x - 12} ${146 + dy} q12 -8 24 0" fill="none" stroke="${BL}" stroke-width="3.5" stroke-linecap="round"/>`;
  const M = {
    talk: `<path d="M190 214 q18 -4 34 2 q-2 18 -18 18 q-15 0 -16 -20 Z" fill="${BL}"/><path d="M196 228 q10 -6 20 0 q-4 5 -10 5 q-6 0 -10 -5 Z" fill="${LT}"/>`,
    grin: `<path d="M186 212 q22 6 42 0 q-4 26 -21 26 q-17 0 -21 -26 Z" fill="${BL}"/><path d="M194 228 q13 -7 26 0 q-5 8 -13 8 q-8 0 -13 -8 Z" fill="${LT}"/>`,
    oh: `<ellipse cx="207" cy="222" rx="9" ry="12" fill="${BL}"/>`,
    smile: `<path d="M192 216 q15 12 30 0" fill="none" stroke="${BL}" stroke-width="${SW}" stroke-linecap="round"/>`,
  };
  const cheeks = `<ellipse cx="166" cy="206" rx="10" ry="5.5" fill="${LT}" opacity=".8"/><ellipse cx="248" cy="206" rx="10" ry="5.5" fill="${LT}" opacity=".8"/>`;
  const face = {
    calm: brow(188) + brow(226) + eyeL(188, 'calm') + eyeL(226, 'calm') + M.talk,
    explain: brow(188, -2) + brow(226, -2) + eyeL(188, 'calm') + eyeL(226, 'calm') + M.talk,
    idea: brow(188, -6) + brow(226, -6) + eyeL(188) + eyeL(226) + M.grin,
    shock: brow(188, -10) + brow(226, -10) + eyeL(188, 'shock') + eyeL(226, 'shock') + M.oh,
    approve: brow(188, -2) + brow(226, -4) + eyeL(188, 'wink') + eyeL(226) + M.grin,
  };
  const G = {
    calm: [{ k: 'mudra', x: 46, y: 176, a: -42 }, { k: 'mudra', x: 366, y: 176, a: 42 }],
    explain: [{ k: 'mudra', x: 46, y: 176, a: -42 }, { k: 'open', x: 368, y: 150, a: 40 }],
    idea: [{ k: 'mudra', x: 46, y: 176, a: -42 }, { k: 'point', x: 350, y: 92, a: 10 }],
    shock: [{ k: 'open', x: 52, y: 104, a: -30 }, { k: 'open', x: 360, y: 104, a: 30 }],
    approve: [{ k: 'mudra', x: 46, y: 176, a: -42 }, { k: 'thumb', x: 358, y: 126, a: 10 }],
  };
  const moon = `<g transform="translate(300 70) rotate(18)"><path d="M0 -22 A22 22 0 1 0 14 17 A17 17 0 1 1 0 -22 Z" fill="${GOLD}"/></g>`;
  const star = (x, y, s) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -22 C2 -6 6 -2 22 0 C6 2 2 6 0 22 C-2 6 -6 2 -22 0 C-6 -2 -2 -6 0 -22 Z" fill="${LT}"/>`;
  return n => {
    const [l, r] = G[n];
    const arms = arm(122, 214, l, W, BL, 14, SW, false) + arm(290, 214, r, W, BL, 14, SW, false);
    const hands = hand(l.k, l.x, l.y, l.a, W, BL, SW, false) + hand(r.k, r.x, r.y, r.a, W, BL, SW, false);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 20 420 360">${shadow}${arms}${cloud}${legs}${cheeks}${face[n]}${hands}${moon}${star(96, 70, .6)}${n === 'idea' ? star(380, 50, .9) : ''}</svg>`;
  };
})();

for (const [name, fn] of [['cue', CUE], ['nimbus', NIMBUS]]) {
  const d = path.join(__dirname, name, 'svg'); fs.mkdirSync(d, { recursive: true });
  for (const p of ['explain', 'idea', 'shock', 'approve', 'calm']) fs.writeFileSync(path.join(d, `${name}_${p}.svg`), fn(p));
}
console.log('ok');
