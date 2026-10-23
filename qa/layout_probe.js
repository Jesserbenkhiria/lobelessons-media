// Measures where readable text actually lands, frame by frame, in a rendered page (short.html).
// usage: node qa/layout_probe.js PAGE.html WIDTH HEIGHT STEP_SECONDS DURATION > layout.json
// Read-only: loads the page the renderer already wrote and calls its setT(t); nothing is modified.
const { chromium } = require('playwright');
const [, , PAGE, W, H, STEP, DUR] = process.argv;

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const p = await b.newPage({ viewport: { width: +W, height: +H } });
  await p.goto('file://' + require('path').resolve(PAGE)); await p.waitForTimeout(300);
  const out = [];
  for (let t = 0; t <= +DUR + 1e-6; t += +STEP) {
    await p.evaluate(t => setT(t), t);
    out.push(await p.evaluate(t => {
      const vis = el => {
        let o = 1;
        for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
          const s = getComputedStyle(e);
          if (s.display === 'none' || s.visibility === 'hidden') return 0;
          o *= +s.opacity;
        }
        return o;
      };
      const skip = el => el.closest('.prop,#topbar,svg,.props,.rig,.rig1,.rig2,#stage');
      const items = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const byEl = new Map();
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.textContent.trim()) continue;
        const el = n.parentElement; if (!el || skip(el)) continue;
        const r = document.createRange(); r.selectNodeContents(n);
        for (const q of r.getClientRects()) {
          if (q.width < 1 || q.height < 1) continue;
          const k = byEl.get(el) || { el, text: '', x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
          k.x0 = Math.min(k.x0, q.left); k.y0 = Math.min(k.y0, q.top); k.x1 = Math.max(k.x1, q.right); k.y1 = Math.max(k.y1, q.bottom);
          byEl.set(el, k);
        }
        const k = byEl.get(el); if (k && !k.text.includes(n.textContent.trim())) k.text += (k.text ? ' ' : '') + n.textContent.trim();
      }
      for (const k of byEl.values()) {
        const o = vis(k.el); if (o < 0.5) continue;
        const kind = k.el.closest('#cap') ? 'caption' : k.el.closest('#follow') ? 'badge' : 'text';
        items.push({ kind, text: k.text.slice(0, 60), box: [k.x0, k.y0, k.x1, k.y1].map(v => Math.round(v)) });
      }
      const caps = [...document.querySelectorAll('#cap span')].filter(s => vis(s) >= 0.5 && s.getBoundingClientRect().width > 0);
      const lines = new Set(caps.map(s => Math.round(s.getBoundingClientRect().top / 10)));
      return { t: +t.toFixed(2), items, caption_lines: lines.size };
    }, t));
  }
  console.log(JSON.stringify(out));
  await b.close();
})();
