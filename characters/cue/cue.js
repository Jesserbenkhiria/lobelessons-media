// Cue: clapperboard creator coach. The clapper opens like a mouth when he talks.
const fs = require('fs'), path = require('path');
const INK = '#151515', GOLD = '#C9A24B';
const L = (w = 5, c = INK) => `fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
const palm = (x, y, r = 0, f = 1) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${1.3 * f} 1.3)"><path d="M0 4 C-7 4 -9 -4 -6 -9 M0 4 C2 -6 0 -14 -1 -18 M0 4 C4 -5 6 -12 8 -15 M0 4 C6 0 10 -4 13 -8" ${L(4.2)}/></g>`;
const fist = (x, y) => `<circle cx="${x}" cy="${y}" r="9" fill="#fff" stroke="${INK}" stroke-width="4.2"/>`;
const pointUp = (x, y) => `<g transform="translate(${x} ${y}) scale(1.3)"><circle r="7" fill="#fff" stroke="${INK}" stroke-width="4.2"/><path d="M2 -6 L3 -26" ${L(4.2)}/></g>`;
const thumb = (x, y) => `<g transform="translate(${x} ${y}) scale(1.3)"><rect x="-9" y="-7" width="18" height="16" rx="7" fill="#fff" stroke="${INK}" stroke-width="4.2"/><path d="M-3 -6 L-5 -22" ${L(4.2)}/></g>`;
const spark = (x, y, s = 1, c = GOLD) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -22 C2 -6 6 -2 22 0 C6 2 2 6 0 22 C-2 6 -6 2 -22 0 C-6 -2 -2 -6 0 -22 Z" fill="${c}"/>`;
const eyes = `<circle cx="176" cy="186" r="8" fill="${INK}"/><circle cx="224" cy="186" r="8" fill="${INK}"/><circle cx="178.6" cy="183.4" r="2.6" fill="#fff"/><circle cx="226.6" cy="183.4" r="2.6" fill="#fff"/>`;
const eyesShock = `<circle cx="176" cy="184" r="12" fill="#fff" stroke="${INK}" stroke-width="4"/><circle cx="224" cy="184" r="12" fill="#fff" stroke="${INK}" stroke-width="4"/><circle cx="176" cy="186" r="4.5" fill="${INK}"/><circle cx="224" cy="186" r="4.5" fill="${INK}"/>`;
const eyesHappy = `<path d="M165 186 q11 -10 22 0 M213 186 q11 -10 22 0" ${L(5)}/>`;
const eyesSleepy = `<path d="M165 184 q11 9 22 0 M213 184 q11 9 22 0" ${L(5)}/>`;
const wink = `<path d="M165 188 q11 -10 22 0" ${L(5)}/><circle cx="224" cy="186" r="8" fill="${INK}"/><circle cx="226.6" cy="183.4" r="2.6" fill="#fff"/>`;
const brows = { up: `<path d="M164 162 q12 -9 24 -2 M212 160 q12 -7 24 2" ${L(4)}/>`, soft: `<path d="M165 166 q11 -6 22 -1 M213 165 q11 -5 22 1" ${L(4)}/>`, shock: `<path d="M162 154 q13 -10 26 -2 M212 152 q13 -8 26 2" ${L(4)}/>` };
const mouth = (hi) => ({ talk: `<path d="M186 218 q14 4 28 0 q-3 17 -14 17 q-11 0 -14 -17 Z" fill="${INK}"/><path d="M193 230 q7 -4 14 0" fill="none" stroke="${hi}" stroke-width="3" stroke-linecap="round"/>`,
  grin: `<path d="M184 218 q16 4 32 0 q-4 20 -16 20 q-12 0 -16 -20 Z" fill="${INK}"/>`, smile: `<path d="M186 220 q14 12 28 0" ${L(5)}/>`, big: `<path d="M185 218 q15 15 30 0" ${L(5)}/>`, oh: `<ellipse cx="200" cy="226" rx="8.5" ry="11" fill="${INK}"/>` });
const ARMS = {
  explain: `<path d="M110 232 C88 244 84 262 92 276 M292 220 C318 206 330 186 330 162" ${L(5)}/>` + fist(92, 282) + palm(332, 156, 14),
  idea: `<path d="M110 232 C88 244 84 262 92 276 M292 214 C314 196 322 170 318 140" ${L(5)}/>` + fist(92, 282) + pointUp(318, 132),
  shock: `<path d="M106 214 C80 202 74 178 82 158 M294 214 C320 202 326 178 318 158" ${L(5)}/>` + palm(82, 152, -18) + palm(318, 152, 18, -1),
  approve: `<path d="M110 232 C88 244 84 262 92 276 M292 214 C318 202 330 180 328 158" ${L(5)}/>` + fist(92, 282) + thumb(328, 150),
  calm: `<path d="M108 236 C92 252 96 270 112 276 M292 236 C308 252 304 270 288 276" ${L(5)}/>` + fist(116, 278) + fist(284, 278),
};

const V = '#7C6CF2', VHI = '#A89DF7', VDK = '#5A4BD1';
// slate body (the board)
const body = `<rect x="112" y="132" width="176" height="160" rx="24" fill="${V}"/>
 <g fill="${VHI}" opacity=".6"><ellipse cx="142" cy="160" rx="16" ry="9" transform="rotate(-25 142 160)"/><circle cx="130" cy="186" r="5"/></g>
 <g stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".55"><path d="M128 262 h52 M128 276 h34"/></g>
 <text x="272" y="280" text-anchor="end" font-family="Inter, sans-serif" font-weight="800" font-size="17" fill="#fff" opacity=".75">TAKE 2</text>`;
// striped bar: base (fixed) + clapper arm (hinged at left, opens upward)
const stripes = (x, y, w, h, id) => `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/></clipPath>
 <g clip-path="url(#${id})"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${INK}"/>${Array.from({length: 8}, (_, i) => `<path d="M${x + 6 + i * 26} ${y + h} l14 0 l14 -${h} l-14 0 Z" fill="#fff"/>`).join('')}</g>`;
const base = stripes(112, 110, 176, 24, 'cb');
const arm = a => `<g transform="rotate(${-a} 116 108)">${stripes(110, 84, 180, 24, 'ca')}<circle cx="116" cy="108" r="6" fill="${GOLD}" stroke="${INK}" stroke-width="3"/></g>`;
const legs = `<path d="M182 290 L179 348 L164 350 M218 290 L221 348 L236 350" ${L(5)}/>`;
const m = mouth('#F3A9C6');
const blush = `<ellipse cx="148" cy="214" rx="12" ry="6.5" fill="#F29BB0" opacity=".55"/><ellipse cx="252" cy="214" rx="12" ry="6.5" fill="#F29BB0" opacity=".55"/>`;
const face = { explain: eyes + brows.up + m.talk, idea: eyes + brows.up + m.grin, shock: eyesShock + brows.shock + m.oh, approve: wink + brows.up + m.big, calm: eyesHappy + brows.up + m.smile };
const open = { explain: 16, idea: 24, shock: 34, approve: 10, calm: 0 };
const CUE = n => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 30 400 340">${legs}${ARMS[n]}${body}${blush}<g transform="translate(0 4)">${face[n]}</g>${base}${arm(open[n])}${n === 'idea' ? spark(340, 70, 1) : ''}${n === 'shock' ? `<g ${L(4.5, GOLD)}><path d="M300 70 l12 -12 M312 92 l18 -4 M84 80 l-12 -10"/></g>` : ''}</svg>`;
const d = path.join(__dirname, 'svg');
for (const p of Object.keys(ARMS)) fs.writeFileSync(path.join(d, `cue_${p}.svg`), CUE(p));
console.log('ok');
