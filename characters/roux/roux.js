// Roux: octopus chef of kitchen science (family style: cream bg, same face, gold accent).
const fs = require('fs'), path = require('path');
const C = '#F4936A', CHI = '#FBC1A4', CDK = '#D9724A', INK = '#151515', GOLD = '#C9A24B', BLUSH = '#E8676E';
const L = (w = 5, c = INK) => `fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
const T = (d, w = 24) => `<path d="${d}" fill="none" stroke="${C}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
// resting tentacles under the head (curly tips)
const legs = [
  'M128 236 C104 270 92 300 108 322 C118 336 136 326 128 314',
  'M160 252 C152 290 146 318 164 334 C176 344 190 332 180 322',
  'M200 258 C200 296 204 322 218 336 C230 346 244 332 232 322',
  'M240 252 C250 290 258 316 274 328 C288 338 300 322 288 314',
  'M272 236 C296 268 310 296 298 318 C290 332 272 328 280 314'];
const cups = `<g fill="${CHI}">${[[112,300],[150,312],[206,318],[262,312],[296,298]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="4.5"/>`).join('')}</g>`;
const head = `<ellipse cx="200" cy="176" rx="108" ry="92" fill="${C}"/><ellipse cx="200" cy="232" rx="86" ry="34" fill="${C}"/>
  <g fill="${CHI}" opacity=".7"><ellipse cx="146" cy="128" rx="24" ry="15" transform="rotate(-25 146 128)"/><circle cx="120" cy="166" r="8"/></g>
  <g fill="${CDK}" opacity=".55"><circle cx="262" cy="122" r="6"/><circle cx="278" cy="140" r="4"/><circle cx="252" cy="140" r="3.5"/></g>`;
const hat = `<path d="M150 104 C130 96 128 64 152 58 C156 36 186 30 200 46 C214 30 244 36 248 58 C272 64 270 96 250 104 Z" fill="#fff" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>
  <rect x="150" y="96" width="100" height="22" rx="6" fill="#fff" stroke="${INK}" stroke-width="4.5"/><path d="M182 62 q4 18 0 30 M218 62 q-4 18 0 30" ${L(3,'#d8d2c6')}/>`;
const blush = `<ellipse cx="150" cy="214" rx="14" ry="7.5" fill="${BLUSH}" opacity=".4"/><ellipse cx="250" cy="214" rx="14" ry="7.5" fill="${BLUSH}" opacity=".4"/>`;
const eyes = `<circle cx="176" cy="186" r="8.5" fill="${INK}"/><circle cx="224" cy="186" r="8.5" fill="${INK}"/><circle cx="178.8" cy="183.2" r="2.8" fill="#fff"/><circle cx="226.8" cy="183.2" r="2.8" fill="#fff"/>`;
const eyesShock = `<circle cx="176" cy="184" r="12.5" fill="#fff" stroke="${INK}" stroke-width="4"/><circle cx="224" cy="184" r="12.5" fill="#fff" stroke="${INK}" stroke-width="4"/><circle cx="176" cy="186" r="4.8" fill="${INK}"/><circle cx="224" cy="186" r="4.8" fill="${INK}"/>`;
const eyesHappy = `<path d="M165 188 q11 -10 22 0 M213 188 q11 -10 22 0" ${L(5)}/>`;
const wink = `<path d="M165 188 q11 -10 22 0" ${L(5)}/><circle cx="224" cy="186" r="8.5" fill="${INK}"/><circle cx="226.8" cy="183.2" r="2.8" fill="#fff"/>`;
const brows = { up: `<path d="M164 162 q12 -9 24 -2 M212 160 q12 -7 24 2" ${L(4)}/>`, shock: `<path d="M162 154 q13 -10 26 -2 M212 152 q13 -8 26 2" ${L(4)}/>`, soft: `<path d="M165 166 q11 -6 22 -1 M213 165 q11 -5 22 1" ${L(4)}/>` };
const M = { talk: `<path d="M186 218 q14 4 28 0 q-3 17 -14 17 q-11 0 -14 -17 Z" fill="${INK}"/><path d="M193 230 q7 -4 14 0" fill="none" stroke="${CHI}" stroke-width="3" stroke-linecap="round"/>`,
  grin: `<path d="M184 218 q16 4 32 0 q-4 20 -16 20 q-12 0 -16 -20 Z" fill="${INK}"/>`, smile: `<path d="M186 220 q14 12 28 0" ${L(5)}/>`, big: `<path d="M185 218 q15 15 30 0" ${L(5)}/>`, oh: `<ellipse cx="200" cy="226" rx="8.5" ry="11" fill="${INK}"/>` };
// props held at a tentacle tip (x,y), rotation r
const whisk = (x, y, r) => `<g transform="translate(${x} ${y}) rotate(${r})"><path d="M0 0 V-34" ${L(5, GOLD)}/><path d="M0 -34 C-14 -48 -12 -72 0 -78 C12 -72 14 -48 0 -34 M0 -34 C-6 -50 -5 -70 0 -78 C5 -70 6 -50 0 -34" ${L(3.2, GOLD)}/></g>`;
const spoon = (x, y, r) => `<g transform="translate(${x} ${y}) rotate(${r})"><path d="M0 0 V-38" ${L(5, GOLD)}/><ellipse cx="0" cy="-50" rx="9" ry="13" fill="${GOLD}"/></g>`;
const thermo = (x, y, r) => `<g transform="translate(${x} ${y}) rotate(${r})"><rect x="-5" y="-62" width="10" height="56" rx="5" fill="#fff" stroke="${INK}" stroke-width="3.5"/><rect x="-2" y="-30" width="4" height="24" fill="#E5534B"/><circle cy="-2" r="8" fill="#E5534B" stroke="${INK}" stroke-width="3.5"/></g>`;
const spark = (x, y, s = 1) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -22 C2 -6 6 -2 22 0 C6 2 2 6 0 22 C-2 6 -6 2 -22 0 C-6 -2 -2 -6 0 -22 Z" fill="${GOLD}"/>`;
const steam = `<path d="M318 70 q-10 -12 0 -24 q10 -12 0 -24 M338 80 q-8 -10 0 -20 q8 -10 0 -20" ${L(4, '#c9c2b4')}/>`;
// raised arms (tentacles from the head sides)
const armL = { rest: 'M104 214 C82 236 78 262 92 274', up: 'M104 206 C78 196 66 168 74 140', out: 'M104 210 C76 206 56 196 46 176' };
const armR = { rest: 'M296 214 C318 236 322 262 308 274', up: 'M296 206 C322 196 334 168 326 140', out: 'M296 210 C324 206 344 196 354 176' };
const POSES = {
  explain: { arms: T(armL.rest, 20) + T(armR.out, 20), props: whisk(354, 178, 20), face: eyes + brows.up + M.talk },
  idea:    { arms: T(armL.rest, 20) + T(armR.up, 20), props: spoon(326, 142, 6), face: eyes + brows.up + M.grin, front: spark(70, 84, 1) },
  shock:   { arms: T(armL.up, 20) + T(armR.up, 20), props: '', face: eyesShock + brows.shock + M.oh, front: steam },
  approve: { arms: T(armL.rest, 20) + T(armR.up, 20), props: thermo(326, 142, 8), face: wink + brows.up + M.big },
  calm:    { arms: T(armL.out, 20) + T(armR.out, 20), props: whisk(354, 178, 20) + spoon(46, 178, -20), face: eyesHappy + brows.soft + M.smile },
};
const svg = n => { const p = POSES[n]; return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 20 400 350">${legs.map(d => T(d)).join('')}${cups}${p.arms}${p.props}${head}${blush}${p.face}${hat}${p.front || ''}</svg>`; };
const d = path.join(__dirname, 'svg'); fs.mkdirSync(d, { recursive: true });
Object.keys(POSES).forEach(n => fs.writeFileSync(path.join(d, `roux_${n}.svg`), svg(n)));
console.log('ok');
