// Dr. Beat: heart mascot, same line style as Lobe.
const fs = require('fs');
const RED = '#EF6F7E', RED_HI = '#F9A3AD', RED_DK = '#D24A5C', INK = '#151515', GOLD = '#C9A24B', BLUSH = '#D9485C';
const L = (w = 5, c = INK) => `fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
const HEART = 'M200 300 C150 272 92 228 84 172 C76 120 118 92 156 98 C178 101 194 114 200 128 C206 114 222 101 244 98 C282 92 324 120 316 172 C308 228 250 272 200 300 Z';
const body = () => `
 <path d="M206 112 C204 86 222 70 246 74" fill="none" stroke="${RED_DK}" stroke-width="18" stroke-linecap="round"/>
 <rect x="168" y="76" width="18" height="46" rx="9" fill="${RED_DK}"/>
 <path d="${HEART}" fill="${RED}"/>
 <g fill="${RED_HI}" opacity=".55"><ellipse cx="128" cy="140" rx="24" ry="18"/><circle cx="104" cy="178" r="9"/><circle cx="262" cy="122" r="8"/></g>
 <g ${L(4.4, RED_DK)}><path d="M120 214 q16 6 26 22"/><path d="M286 196 q-10 18 -26 26"/><path d="M238 118 q16 -6 30 6"/></g>`;
const blush = `<ellipse cx="150" cy="212" rx="13" ry="7" fill="${BLUSH}" opacity=".35"/><ellipse cx="250" cy="212" rx="13" ry="7" fill="${BLUSH}" opacity=".35"/>`;
const eyes = `<circle cx="176" cy="186" r="8" fill="${INK}"/><circle cx="224" cy="186" r="8" fill="${INK}"/><circle cx="178.6" cy="183.4" r="2.6" fill="#fff"/><circle cx="226.6" cy="183.4" r="2.6" fill="#fff"/>`;
const eyesShock = `<circle cx="176" cy="184" r="12" fill="#fff" stroke="${INK}" stroke-width="4"/><circle cx="224" cy="184" r="12" fill="#fff" stroke="${INK}" stroke-width="4"/><circle cx="176" cy="186" r="4.5" fill="${INK}"/><circle cx="224" cy="186" r="4.5" fill="${INK}"/>`;
const eyesHappy = `<path d="M165 186 q11 -10 22 0 M213 186 q11 -10 22 0" ${L(5)}/>`;
const brows = { up: `<path d="M164 162 q12 -9 24 -2 M212 160 q12 -7 24 2" ${L(4)}/>`, shock: `<path d="M162 154 q13 -10 26 -2 M212 152 q13 -8 26 2" ${L(4)}/>`, think: `<path d="M165 168 q11 -2 22 0 M213 158 q11 -8 22 0" ${L(4)}/>` };
const mouths = { talk: `<path d="M186 218 q14 4 28 0 q-3 17 -14 17 q-11 0 -14 -17 Z" fill="${INK}"/><path d="M193 230 q7 -4 14 0" fill="none" stroke="${RED_HI}" stroke-width="3" stroke-linecap="round"/>`,
  smile: `<path d="M186 220 q14 12 28 0" ${L(5)}/>`, oh: `<ellipse cx="200" cy="226" rx="8.5" ry="11" fill="${INK}"/>`, hmm: `<path d="M190 226 q10 -5 20 1" ${L(5)}/>` };
// gold head mirror (doctor) + gold stethoscope
const mirror = `<path d="M104 132 q22 -46 86 -44" ${L(4, GOLD)}/><circle cx="116" cy="112" r="15" fill="#FBF3DD" stroke="${GOLD}" stroke-width="4"/><circle cx="116" cy="112" r="4" fill="${GOLD}"/>`;
const stetho = `<path d="M118 196 C126 284 274 284 282 196" ${L(5, GOLD)}/><circle cx="118" cy="192" r="5" fill="${GOLD}"/><circle cx="282" cy="192" r="5" fill="${GOLD}"/><path d="M200 262 C202 278 212 286 228 286" ${L(5, GOLD)}/><circle cx="234" cy="288" r="10" fill="#FBF3DD" stroke="${GOLD}" stroke-width="4"/>`;
const stand = `<path d="M184 288 L181 346 L166 348 M216 288 L219 346 L234 348" ${L(5)}/>`;
const palm = (x, y, r = 0, f = 1) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${1.3 * f} 1.3)"><path d="M0 4 C-7 4 -9 -4 -6 -9 M0 4 C2 -6 0 -14 -1 -18 M0 4 C4 -5 6 -12 8 -15 M0 4 C6 0 10 -4 13 -8" ${L(4.2)}/></g>`;
const fist = (x, y) => `<circle cx="${x}" cy="${y}" r="9" fill="#fff" stroke="${INK}" stroke-width="4.2"/>`;
const pointUp = (x, y) => `<g transform="translate(${x} ${y}) scale(1.3)"><circle r="7" fill="#fff" stroke="${INK}" stroke-width="4.2"/><path d="M2 -6 L3 -26" ${L(4.2)}/></g>`;
const thumb = (x, y) => `<g transform="translate(${x} ${y}) scale(1.3)"><rect x="-9" y="-7" width="18" height="16" rx="7" fill="#fff" stroke="${INK}" stroke-width="4.2"/><path d="M-3 -6 L-5 -22" ${L(4.2)}/></g>`;
const spark = (x, y, s = 1) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -22 C2 -6 6 -2 22 0 C6 2 2 6 0 22 C-2 6 -6 2 -22 0 C-6 -2 -2 -6 0 -22 Z" fill="${GOLD}"/>`;
const pulse = `<path d="M300 70 h14 l8 -16 l10 30 l8 -14 h14" ${L(4.5, RED_DK)}/>`;
const POSES = {
  explain: { arms: `<path d="M110 232 C88 244 84 262 92 276 M292 220 C318 206 330 186 330 162" ${L(5)}/>` + fist(92, 282) + palm(332, 156, 14), face: eyes + brows.up + mouths.talk },
  idea: { arms: `<path d="M110 232 C88 244 84 262 92 276 M292 214 C314 196 322 170 318 140" ${L(5)}/>` + fist(92, 282) + pointUp(318, 132), face: eyes + brows.up + `<path d="M184 218 q16 4 32 0 q-4 20 -16 20 q-12 0 -16 -20 Z" fill="${INK}"/>`, front: spark(345, 78, 1.05) },
  shock: { arms: `<path d="M106 214 C80 202 74 178 82 158 M294 214 C320 202 326 178 318 158" ${L(5)}/>` + palm(82, 152, -18) + palm(318, 152, 18, -1), face: eyesShock + brows.shock + mouths.oh, front: pulse },
  approve: { arms: `<path d="M110 232 C88 244 84 262 92 276 M292 214 C318 202 330 180 328 158" ${L(5)}/>` + fist(92, 282) + thumb(328, 150), face: `<path d="M165 188 q11 -10 22 0" ${L(5)}/><circle cx="224" cy="186" r="8" fill="${INK}"/><circle cx="226.6" cy="183.4" r="2.6" fill="#fff"/>` + brows.up + `<path d="M185 218 q15 15 30 0" ${L(5)}/>` },
  calm: { arms: `<path d="M108 236 C92 252 96 270 112 276 M292 236 C308 252 304 270 288 276" ${L(5)}/>` + fist(116, 278) + fist(284, 278), face: eyesHappy + brows.up + mouths.smile },
};
function svg(n) { const p = POSES[n]; return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 40 400 330">${stand}${p.arms}${body()}${blush}${p.face}${stetho}${mirror}${p.front || ''}</svg>`; }
fs.mkdirSync(__dirname + '/svg', { recursive: true });
Object.keys(POSES).forEach(n => fs.writeFileSync(`${__dirname}/svg/drbeat_${n}.svg`, svg(n)));
module.exports = { svg, POSES };
console.log('ok');
