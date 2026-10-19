// Lumi (creator tips, lightbulb) and Nimbus (calm, cloud): same line style as Lobe and Dr. Beat.
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

// ---------- LUMI: lightbulb creator with a little camera ----------
const LUMI = (() => {
  const Y = '#F6CF5E', YHI = '#FBE6A2', YDK = '#D9A93A', MET = '#A79F92', METD = '#7E776C';
  const body = `<path d="M154 254 C112 226 98 194 102 162 C108 108 150 78 200 78 C250 78 292 108 298 162 C302 194 288 226 246 254 L244 268 L156 268 Z" fill="${Y}"/>
   <g fill="${YHI}" opacity=".8"><ellipse cx="146" cy="124" rx="22" ry="14" transform="rotate(-30 146 124)"/><circle cx="122" cy="160" r="7"/></g>
   <path d="M232 104 q24 12 30 40" ${L(4.4, YDK)}/>
   <rect x="152" y="266" width="96" height="13" rx="6.5" fill="${MET}"/><rect x="156" y="279" width="88" height="12" rx="6" fill="${METD}"/><rect x="160" y="291" width="80" height="12" rx="6" fill="${MET}"/><path d="M186 303 h28 l-6 9 h-16 Z" fill="${METD}"/>`;
  const glow = (s = 1) => `<g ${L(5, GOLD)} opacity="${s}"><path d="M200 50 v-14 M128 78 l-10 -10 M272 78 l10 -10 M86 150 h-14 M314 150 h14"/></g>`;
  const camera = `<path d="M136 212 C148 246 252 246 264 212" ${L(4, INK)}/><rect x="176" y="232" width="48" height="31" rx="7" fill="${INK}"/><rect x="186" y="226" width="14" height="8" rx="2" fill="${INK}"/><circle cx="200" cy="247.5" r="10" fill="#FBF3DD" stroke="${GOLD}" stroke-width="3.5"/><circle cx="216" cy="238" r="2.6" fill="#E5534B"/>`;
  const legs = `<path d="M186 310 L183 348 L168 350 M214 310 L217 348 L232 350" ${L(5)}/>`;
  const m = mouth('#F3A9A0'); const face = { explain: eyes + brows.up + m.talk, idea: eyes + brows.up + m.grin, shock: eyesShock + brows.shock + m.oh, approve: wink + brows.up + m.big, calm: eyesHappy + brows.up + m.smile };
  const mouthUp = s => s.replace(/(M18\d 2)(1|2)(\d)/g, (a) => a); // keep
  return n => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 30 400 340">${legs}<g transform="translate(200 0) scale(0.88 1) translate(-200 0)">${ARMS[n]}</g>${glow(n === 'idea' || n === 'shock' ? 1 : 0.55)}${body}<g transform="translate(0 -24)">${face[n]}</g>${camera}${n === 'idea' ? spark(340, 70, 1) : ''}</svg>`;
})();

// ---------- NIMBUS: soft calm cloud with a gold crescent moon ----------
const NIMBUS = (() => {
  const B = '#A9CBF2', BHI = '#D6E7FA', BDK = '#7FA9DD';
  const body = `<g fill="${B}"><circle cx="142" cy="196" r="58"/><circle cx="204" cy="160" r="72"/><circle cx="266" cy="194" r="60"/><circle cx="104" cy="236" r="42"/><circle cx="296" cy="236" r="42"/><rect x="104" y="196" width="192" height="82" rx="40"/></g>
   <g fill="${BHI}" opacity=".85"><ellipse cx="172" cy="118" rx="26" ry="14" transform="rotate(-18 172 118)"/><circle cx="110" cy="182" r="9"/><circle cx="248" cy="132" r="7"/></g>
   <g ${L(4.4, BDK)}><path d="M122 250 q14 10 30 8"/><path d="M262 256 q16 0 26 -12"/></g>`;
  const moon = `<g transform="translate(276 92) rotate(18)"><path d="M0 -22 A22 22 0 1 0 14 17 A17 17 0 1 1 0 -22 Z" fill="${GOLD}"/></g>`;
  const zz = `<text x="318" y="96" font-family="Inter Display, Inter, sans-serif" font-weight="800" font-size="30" fill="${BDK}">z</text><text x="338" y="70" font-family="Inter Display, Inter, sans-serif" font-weight="800" font-size="22" fill="${BDK}">z</text>`;
  const legs = `<path d="M184 272 L181 346 L166 348 M216 272 L219 346 L234 348" ${L(5)}/>`;
  const m = mouth('#F4B6C2'); const blush = `<ellipse cx="150" cy="212" rx="13" ry="7" fill="#F29BB0" opacity=".45"/><ellipse cx="250" cy="212" rx="13" ry="7" fill="#F29BB0" opacity=".45"/>`;
  const face = { explain: eyes + brows.soft + m.talk, idea: eyes + brows.up + m.grin, shock: eyesShock + brows.shock + m.oh, approve: wink + brows.soft + m.big, calm: eyesSleepy + brows.soft + m.smile };
  return n => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 30 400 340">${legs}<g transform="translate(200 0) scale(1.06 1) translate(-200 0)">${ARMS[n]}</g>${body}${blush}${face[n]}${moon}${n === 'calm' ? zz : ''}${n === 'idea' ? spark(70, 96, 0.9) : ''}</svg>`;
})();

for (const [name, fn] of [['lumi', LUMI], ['nimbus', NIMBUS]]) {
  const d = path.join(__dirname, name, 'svg'); fs.mkdirSync(d, { recursive: true });
  for (const p of Object.keys(ARMS)) fs.writeFileSync(path.join(d, `${name}_${p}.svg`), fn(p));
}
console.log('ok');
