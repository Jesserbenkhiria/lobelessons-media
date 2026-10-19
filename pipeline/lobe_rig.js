// Animated Lobe rig for Shorts: talking mouth (voice envelope), blinking, eye glances, hand gestures (2-bone IK).
// Runs in the browser page (render.js injects this file). lobeRig(state) returns an SVG string for one frame.
// state = {pose, side: 'r'|'l' (which side of the screen Lobe stands on), t, lv (0..1 voice level),
//          tIn (scene start), sw: [gesture switch times], scene time info}
(function (root) {
  const PINK = '#EE9AAB', PINK_HI = '#F6B9C6', FOLD = '#D97088', INK = '#151515', GOLD = '#C9A24B', BLUSH = '#E77F95';
  const L = (w = 5, c = INK) => `fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
  const f1 = n => n.toFixed(1);

  let BRAIN = `<g transform="translate(200 196) scale(0.74) translate(-200 -200)"><g fill="${PINK}"><ellipse cx="200" cy="200" rx="128" ry="86"/>`;
  const R = [44, 40, 46, 38, 44, 42, 40, 46, 42, 40, 44, 38, 46, 42, 40, 44];
  for (let i = 0; i < 16; i++) { const a = Math.PI * 2 * i / 16; BRAIN += `<circle cx="${f1(200 + 132 * Math.cos(a))}" cy="${f1(200 + 88 * Math.sin(a) * (Math.sin(a) > 0 ? 0.85 : 1.08))}" r="${R[i]}"/>`; }
  BRAIN += `</g><g fill="${PINK_HI}" opacity=".5"><circle cx="138" cy="128" r="26"/><circle cx="96" cy="170" r="16"/><circle cx="190" cy="106" r="15"/></g><g ${L(4.6, FOLD)}>` +
    ['M118 150 q18 -24 40 -8', 'M150 128 q8 20 -6 34', 'M196 112 q22 -6 30 14 q6 14 -6 22', 'M250 132 q24 -10 36 10', 'M298 168 q-20 4 -22 26', 'M96 206 q22 -6 30 14', 'M128 250 q-6 -20 16 -28', 'M178 268 q4 -22 26 -20', 'M246 256 q18 4 22 -16', 'M290 236 q18 -4 26 12', 'M210 292 q12 -8 24 2', 'M146 284 q-14 -2 -18 -14'].map(d => `<path d="${d}"/>`).join('') +
    `</g><path d="M246 92 L246 136 L256 126 L266 136 L266 88 Z" fill="${GOLD}"/></g>`;
  const BLUSHES = `<ellipse cx="148" cy="214" rx="13" ry="7" fill="${BLUSH}" opacity=".45"/><ellipse cx="252" cy="214" rx="13" ry="7" fill="${BLUSH}" opacity=".45"/>`;
  const GLASSES = `<path d="M157 194 h34 a17 17 0 0 1 -34 0 Z M209 194 h34 a17 17 0 0 1 -34 0 Z" fill="rgba(255,255,255,.28)" stroke="${GOLD}" stroke-width="4" stroke-linejoin="round"/><path d="M191 195 q9 -6 18 0" ${L(4, GOLD)}/>`;
  const STAND = `<path d="M181 270 L178 346 L163 348 M219 270 L222 346 L237 348" ${L(5)}/>`;
  const SIT = `<path d="M150 262 C142 290 146 312 170 316 L230 316 C254 312 258 290 250 262" fill="#fff" stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M162 296 C182 314 218 314 238 296 M238 296 C220 282 198 290 188 306 M162 296 C180 282 202 290 212 306" ${L(5)}/>`;
  const spark = (x, y, s) => `<path transform="translate(${f1(x)} ${f1(y)}) scale(${s.toFixed(3)})" d="M0 -22 C2 -6 6 -2 22 0 C6 2 2 6 0 22 C-2 6 -6 2 -22 0 C-6 -2 -2 -6 0 -22 Z" fill="${GOLD}"/>`;
  const qmark = (x, y, o) => `<text x="${x}" y="${y}" opacity="${o.toFixed(2)}" font-family="Inter Display, Inter, sans-serif" font-weight="800" font-size="58" fill="${GOLD}">?</text>`;
  const drops = `<path d="M86 104 q-7 13 0 17 q7 -4 0 -17 Z M318 98 q-7 13 0 17 q7 -4 0 -17 Z" fill="#8DBDE8"/>`;
  const book = (x, y) => `<g transform="translate(${x} ${y})"><path d="M0 0 C-18 -8 -42 -8 -54 -3 L-54 44 C-42 40 -18 40 0 47 C18 40 42 40 54 44 L54 -3 C42 -8 18 -8 0 0 Z" fill="#fff" stroke="${INK}" stroke-width="4.2" stroke-linejoin="round"/><path d="M0 0 V47" ${L(3.5)}/><path d="M-44 10 h30 M-44 20 h26 M-44 30 h30 M14 10 h18" ${L(2.5, '#c8c8ce')}/><path d="M28 -4 V30 l6 -6 l6 6 V-6" fill="${GOLD}"/></g>`;

  // ---- hands, drawn at (0,0) pointing "up" before rotation ----
  const HAND = {
    palm: `<path d="M0 4 C-7 4 -9 -4 -6 -9 M0 4 C2 -6 0 -14 -1 -18 M0 4 C4 -5 6 -12 8 -15 M0 4 C6 0 10 -4 13 -8" ${L(4.2)}/>`,
    fist: `<circle r="7" fill="#fff" stroke="${INK}" stroke-width="4.2"/>`,
    point: `<circle r="7" fill="#fff" stroke="${INK}" stroke-width="4.2"/><path d="M2 -6 L3 -26" ${L(4.2)}/>`,
    thumb: `<rect x="-9" y="-7" width="18" height="16" rx="7" fill="#fff" stroke="${INK}" stroke-width="4.2"/><path d="M-3 -6 L-5 -22" ${L(4.2)}/>`,
    mudra: `<circle r="6.5" ${L(4.2)}/><path d="M-4 -5 C-10 -10 -9 -18 -4 -21 M5 -4 C6 -11 10 -15 14 -16" ${L(4.2)}/>`,
  };
  // ---- gestures for the RIGHT arm (the left arm is mirrored). x,y = hand target, r = hand rotation ----
  const G = {
    rest: { x: 334, y: 280, r: 0, h: 'fist' },
    present: { x: 378, y: 148, r: 18, h: 'palm', beat: 1 },
    open: { x: 398, y: 196, r: 55, h: 'palm', beat: 1 },
    up: { x: 346, y: 118, r: 4, h: 'point', beat: 0.6 },
    toward: { x: 386, y: 136, r: 42, h: 'point', beat: 0.6 },
    thumb: { x: 360, y: 136, r: 0, h: 'thumb', beat: 0.5 },
    wave: { x: 372, y: 138, r: 14, h: 'palm', wave: 1 },
    shake: { x: 352, y: 128, r: 18, h: 'palm', shake: 1 },
    chin: { x: 236, y: 252, r: -30, h: 'fist', front: 1 },
    mudra: { x: 352, y: 178, r: 0, h: 'mudra', sitArm: 1 },
    book: { x: 246, y: 288, r: 0, h: 'fist', front: 1 },
  };
  // per pose: a sequence of [rightArm, leftArm] gestures; 'toward' goes on the arm nearest the content
  const SEQ = {
    explain: [['present', 'rest'], ['TOWARD'], ['open', 'open'], ['present', 'rest'], ['rest', 'present']],
    idea: [['up', 'rest'], ['present', 'rest'], ['TOWARD'], ['up', 'rest']],
    think: [['chin', 'rest'], ['chin', 'rest'], ['present', 'rest'], ['chin', 'rest']],
    shock: [['shake', 'shake'], ['shake', 'shake'], ['open', 'open']],
    approve: [['thumb', 'rest'], ['wave', 'rest'], ['thumb', 'rest']],
    calm: [['mudra', 'mudra']],
    read: [['book', 'book']],
  };
  const FACE = { // eyes: open | happy | shock ; brows: soft | up | think | shock ; rest mouth
    explain: { eyes: 'open', brows: 'up', rest: 'smile' }, idea: { eyes: 'open', brows: 'up', rest: 'grin' },
    think: { eyes: 'open', brows: 'think', rest: 'hmm' }, shock: { eyes: 'shock', brows: 'shock', rest: 'oh' },
    approve: { eyes: 'open', brows: 'up', rest: 'smile' }, calm: { eyes: 'happy', brows: 'soft', rest: 'smile' },
    read: { eyes: 'happy', brows: 'soft', rest: 'smile' },
  };
  const BROWS = {
    soft: [[163, 166, 11, -6, 22, -1], [215, 165, 11, -5, 22, 1]], up: [[162, 160, 12, -9, 24, -2], [214, 158, 12, -7, 24, 2]],
    think: [[163, 170, 11, -2, 22, 0], [215, 158, 11, -8, 22, 0]], shock: [[160, 154, 13, -10, 26, -2], [214, 152, 13, -8, 26, 2]],
  };

  const SH = { x: 304, y: 214 }, UP = 50, LO = 50, HS = 1.45;
  const smooth = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
  const lerp = (a, b, p) => a + (b - a) * p;

  function arm(g, t, lv, seed) {
    let { x, y, r } = g;
    if (g.beat) { const b = Math.sin(t * 8.5 + seed) * lv * 7 * g.beat; y += b; r += b * 0.8; }
    if (g.wave) r += Math.sin(t * 11 + seed) * 22;
    if (g.shake) { x += Math.sin(t * 31 + seed) * 2.5; y += Math.cos(t * 27 + seed) * 2; }
    if (!g.beat && !g.wave && !g.shake) y += Math.sin(t * 2.2 + seed) * 1.5; // breathing
    const sh = g.sitArm ? { x: 302, y: 210 } : SH;
    let dx = x - sh.x, dy = y - sh.y; let d = Math.hypot(dx, dy); const mx = UP + LO - 0.5;
    if (d > mx) { x = sh.x + dx / d * mx; y = sh.y + dy / d * mx; dx = x - sh.x; dy = y - sh.y; d = mx; }
    const base = Math.atan2(dy, dx), k = Math.acos(Math.min(1, Math.max(-1, (UP * UP + d * d - LO * LO) / (2 * UP * d))));
    const c1 = { x: sh.x + UP * Math.cos(base + k), y: sh.y + UP * Math.sin(base + k) }, c2 = { x: sh.x + UP * Math.cos(base - k), y: sh.y + UP * Math.sin(base - k) };
    const sc = p => (p.x - 200) + (p.y - sh.y) * 0.6; // elbow bends outward/down
    const e = sc(c1) >= sc(c2) ? c1 : c2;
    const cx = 2 * e.x - (sh.x + x) / 2, cy = 2 * e.y - (sh.y + y) / 2;
    const path = `<path d="M${f1(sh.x)} ${f1(sh.y)} Q${f1(cx)} ${f1(cy)} ${f1(x)} ${f1(y)}" ${L(6.5)}/>`;
    const hand = `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(r)}) scale(${HS})">${HAND[g.h]}</g>`;
    return { path, hand, front: !!g.front };
  }
  function blend(a, b, p) {
    const o = Object.assign({}, p < 0.5 ? a : b);
    o.x = lerp(a.x, b.x, p); o.y = lerp(a.y, b.y, p); o.r = lerp(a.r, b.r, p);
    if (a.h !== b.h && p > 0.25 && p < 0.75) o.h = 'fist'; // hand closes briefly while changing shape
    o.front = (p < 0.5 ? a : b).front;
    return o;
  }

  function lobeRig(st) {
    const pose = SEQ[st.pose] ? st.pose : 'explain';
    const t = st.t, lv = st.lv || 0, ts = t - st.tIn;
    const seq = SEQ[pose];
    // gesture index from switch times
    const sw = st.sw || [];
    let k = 0; while (k < sw.length && t >= sw[k]) k++;
    const pick = i => {
      const s = seq[((i % seq.length) + seq.length) % seq.length];
      if (s[0] === 'TOWARD') return st.side === 'l' ? ['toward', 'rest'] : ['rest', 'toward'];
      return s;
    };
    const cur = pick(k), prev = k === 0 ? ['rest', 'rest'] : pick(k - 1);
    const t0 = k === 0 ? st.tIn + 0.15 : sw[k - 1];
    const p = smooth((t - t0) / 0.32);
    const sit = pose === 'calm' || pose === 'read';
    const gR = sit ? G[cur[0]] : blend(G[prev[0]], G[cur[0]], p), gL = sit ? G[cur[1]] : blend(G[prev[1]], G[cur[1]], p);
    const aR = arm(gR, t, lv, 0), aL = arm(gL, t, lv, 1.7);
    const mir = s => `<g transform="translate(400 0) scale(-1 1)">${s}</g>`;

    // ---- face ----
    const fc = FACE[pose];
    const look = (st.side === 'l' ? 1 : -1) * 2.2 * smooth((ts - 0.6) / 0.4) * (Math.sin(t * 0.9) > -0.6 ? 1 : 0.2);
    const blinkPh = (t + st.seed * 1.3) % 3.4; const blink = blinkPh < 0.13;
    let eyes;
    const eyeMode = fc.eyes === 'shock' && ts > 1.6 ? 'open' : fc.eyes;
    if (eyeMode === 'happy' || blink) eyes = `<path d="M163 184 q11 9 22 0 M215 184 q11 9 22 0" ${L(5)}/>`;
    else if (eyeMode === 'shock') eyes = `<circle cx="174" cy="184" r="12" fill="#fff" stroke="${INK}" stroke-width="4"/><circle cx="226" cy="184" r="12" fill="#fff" stroke="${INK}" stroke-width="4"/><circle cx="${f1(174 + look)}" cy="186" r="4.5" fill="${INK}"/><circle cx="${f1(226 + look)}" cy="186" r="4.5" fill="${INK}"/>`;
    else eyes = `<circle cx="${f1(174 + look)}" cy="186" r="7.5" fill="${INK}"/><circle cx="${f1(226 + look)}" cy="186" r="7.5" fill="${INK}"/><circle cx="${f1(176.5 + look)}" cy="183.5" r="2.4" fill="#fff"/><circle cx="${f1(228.5 + look)}" cy="183.5" r="2.4" fill="#fff"/>`;
    const bl = BROWS[eyeMode === 'open' && fc.brows === 'shock' ? 'up' : fc.brows], lift = -lv * 5;
    const brows = `<path d="${bl.map(b => `M${b[0]} ${f1(b[1] + lift)} q${b[2]} ${b[3]} ${b[4]} ${b[5]}`).join(' ')}" ${L(4)}/>`;
    const o = Math.min(1, Math.max(0, (lv - 0.07) * 1.5));
    let mouth;
    if (o < 0.06) {
      mouth = { smile: `<path d="M187 228 q13 11 26 0" ${L(5)}/>`, grin: `<path d="M185 226 q15 13 30 0" ${L(5)}/>`, hmm: `<path d="M190 232 q10 -5 20 1" ${L(5)}/>`,
        oh: `<ellipse cx="200" cy="232" rx="8.5" ry="11" fill="${INK}"/>` }[eyeMode === 'open' && fc.rest === 'oh' ? 'smile' : fc.rest];
    } else {
      const w = 11 + 4 * o + Math.sin(t * 23) * 1.5 * o, h = 5 + 15 * o;
      mouth = `<path d="M${f1(200 - w)} 225 q${f1(w)} 4 ${f1(2 * w)} 0 q-3 ${f1(h)} -${f1(w)} ${f1(h)} q-${f1(w - 3)} 0 -${f1(w)} -${f1(h)} Z" fill="${INK}"/>` +
        (h > 11 ? `<path d="M${f1(200 - w * 0.45)} ${f1(225 + h * 0.8)} q${f1(w * 0.45)} -5 ${f1(w * 0.9)} 0" fill="none" stroke="${BLUSH}" stroke-width="3" stroke-linecap="round"/>` : '');
    }
    // ---- props ----
    let front = '';
    if (pose === 'idea') { const q = smooth(ts / 0.5); front = spark(338, 80, (0.4 + 0.65 * q) * (1 + Math.sin(t * 5) * 0.08)); }
    if (pose === 'calm') front = spark(318, 82, 0.7 * (1 + Math.sin(t * 3) * 0.1));
    if (pose === 'think') front = qmark(304, 104 + Math.sin(t * 2.5) * 4, smooth(ts / 0.6));
    if (pose === 'shock' && ts < 2) front = drops;
    if (pose === 'read') front = book(200, 282);

    const legs = sit ? SIT : STAND;
    const backR = aR.path + (aR.front ? '' : aR.hand), backL = aL.path + (aL.front ? '' : aL.hand);
    const frontHands = (aR.front ? aR.hand : '') + (aL.front ? mir(aL.hand) : '');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-60 20 520 360">${legs}${backR}${mir(backL)}${BRAIN}${BLUSHES}${eyes}${brows}${mouth}${fc.eyes === 'happy' || pose !== 'shock' || ts > 1.6 ? GLASSES : ''}${frontHands}${front}</svg>`;
  }
  root.lobeRig = lobeRig;
  if (typeof module !== 'undefined') module.exports = { lobeRig };
})(typeof window !== 'undefined' ? window : globalThis);
