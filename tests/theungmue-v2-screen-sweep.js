// TheungMue v2 — ชุดทดสอบ: ผู้ใช้ + แอดมิน
const { chromium } = require('playwright');
const fs = require('fs');
const URL = (process.env.TM_URL || 'file://' + require('path').resolve(__dirname, '../dist/TheungMue.html'));
const R = []; let b, ctx, seed, errs = [];
const W = (p, ms = 400) => p.waitForTimeout(ms);
async function T(id, mod, title, steps, expect, fn) {
  let ok = false, actual = '';
  try { const r = await fn(); ok = !!r[0]; actual = String(r[1] || ''); } catch (e) { actual = 'ERROR: ' + String(e.message || e).split('\n')[0]; }
  R.push({ id, mod, title, steps, expect, actual, status: ok ? 'ผ่าน' : 'ไม่ผ่าน' });
  console.log((ok ? 'PASS ' : 'FAIL ') + id + ' ' + title + ' | ' + actual.slice(0, 150));
}
const HELP = () => {
  window.H = {
    S: createLocalStore(), get L() { return createLogic(this.S); },
    reset() { localStorage.clear(); sessionStorage.clear(); this.S = createLocalStore(); this.S.insert('Settings', { id: 'service_override', value: 'on' }); }, // ทดสอบได้ทุกเวลา
    tok(u) { return this.L.handle(null, 'login', { username: u, password: 'demo1234' }).token; },
    ph: ['data:image/jpeg;base64,AAAA'],
    mk(o) { o = o || {}; return this.L.handle(this.tok(o.sender || 'u01'), 'create', Object.assign({ item_type: 'เอกสาร / ชีท', item_detail: 'เอกสารทดสอบ', dropoff_zone: 'อาคาร 3', recipient_id: 'U02', mode: 'normal', photos: this.ph }, o.f || {})).job.id; },
    job(id) { return this.S.list('Jobs').find(x => x.id === id); },
    act(id, action, extra) { return this.L.handle(this.tok('admin'), 'act', Object.assign({ id, action, photos: this.ph }, extra || {})).job; },
    cod(f) { return this.mk({ f: Object.assign({ pay_method: 'cod' }, f || {}) }); },
    racc(id, u, pts) { return this.L.handle(this.tok(u || 'u02'), 'act', { id, action: 'cod_accept', note: pts === false ? '' : 'use_points' }).job; },
    to(id, stage) { const seq = ['confirm', 'pickup', 'start', 'deliver']; const n = { confirmed: 1, picked: 2, delivering: 3, delivered: 4 }[stage];
      for (let i = 0; i < n; i++) this.act(id, seq[i], seq[i] === 'deliver' ? { code: this.job(id).code, note: 'cod_collected' } : {}); return id; },
    err(fn) { try { fn(); return 'OK'; } catch (e) { return e.message; } },
    seen() { this.S.list('Rewards').forEach(x => this.S.update('Rewards', x.id, { seen_at: 'x' })); },
  };
};
const E = (fn, arg) => seed.evaluate(fn, arg);
async function login(u, keepPopup) {
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(u + ': ' + e.message));
  if (!keepPopup) p.addLocatorHandler(p.locator('.rwpop [data-rw=ok]'), async l => { await l.click(); });
  await p.goto(URL); await p.fill('#loginf [name=username]', u); await p.fill('#loginf [name=password]', 'demo1234'); await p.click('#loginf #submit'); await W(p, 700); return p;
}
const txt = async (p, s) => (await p.locator(s).first().innerText()).replace(/\s+/g, ' ').trim();


const SH = require('path').resolve(__dirname, 'shots') + '/'; fs.mkdirSync(SH, { recursive: true });
const OUT = require('path').resolve(__dirname, 'shots/sweep') + '/';
async function openJob(p, id) { await p.evaluate(id => { const a = document.createElement('a'); a.setAttribute('data-job', id); document.getElementById('app').appendChild(a); a.click(); a.remove(); }, id); await W(p, 800); }
async function nav(p, go) { if (!(await p.locator('.tabbar').isVisible().catch(() => false))) { await p.reload(); await W(p, 1000); for (let i = 0; i < 5 && await p.locator('.rwpop').count(); i++) { await p.locator('.rwpop [data-rw=ok]').click(); await W(p, 300); } } await p.click('.tabbar [data-go="' + go + '"]'); await W(p, 700); }
async function page(p, go) { await nav(p, 'profile'); await p.click('[data-page=' + go + ']'); await W(p, 700); }
const CHECK = () => {
  const W = innerWidth, bad = [];
  if (document.documentElement.scrollWidth > W + 1) bad.push('หน้ากว้างเกินจอ ' + document.documentElement.scrollWidth + '>' + W);
  const scrollers = el => el.closest('.otabs,.segtabs,.photorow,.presets,.tabs,.chips,.hchips,.svcgrid.scroll,table,pre');
  document.querySelectorAll('#app *').forEach(el => {
    if (!el.offsetParent || scrollers(el)) return;
    const r = el.getBoundingClientRect(); if (r.width === 0) return;
    if (r.right > W + 1 && getComputedStyle(el).position !== 'fixed') bad.push('ล้นขวา: ' + (el.className || el.tagName) + ' "' + (el.innerText || '').trim().slice(0, 25) + '"');
    if (/^(BUTTON|A|SPAN|B|STRONG|EM|LABEL)$/.test(el.tagName) && el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow !== 'visible') bad.push('ตัวหนังสือถูกตัด: ' + (el.className || el.tagName) + ' "' + (el.innerText || '').trim().slice(0, 25) + '"');
  });
  return [...new Set(bad)].slice(0, 6);
};
(async () => {
  b = await chromium.launch();
  const res = {};
  for (const w of (process.argv[2] ? process.argv[2].split(',').map(Number) : [320, 360, 768, 1280])) {
    ctx = await b.newContext({ viewport: { width: w, height: w >= 768 ? 900 : 720 }, timezoneId: 'Asia/Bangkok' });
    seed = await ctx.newPage(); await seed.goto(URL); await seed.evaluate(HELP); await E(() => H.reset());
    const J = await E(() => { const o = {}, L = H.L, A = H.tok('admin');
      o.codw = H.cod({ dropoff_zone: 'อาคาร 22' }); o.conf = H.mk({ f: { mode: 'urgent' } }); H.to(o.conf, 'confirmed');
      o.deli = H.cod({}); H.racc(o.deli, 'u02', false); H.to(o.deli, 'delivering'); o.done = H.mk({}); H.to(o.done, 'delivered');
      o.shop = H.mk({}); H.to(o.shop, 'delivering'); H.act(o.shop, 'arrive'); L.handle(A, 'act', { id: o.shop, action: 'fail', code: 'item_damaged', note: 'กล่องบุบ', photos: { list: H.ph, verdict: 'shop' } });
      L.handle(H.tok('u01'), 'send', { id: o.conf, text: 'ขอเปลี่ยนเวลาได้ไหมครับ' }); L.handle(H.tok('u02'), 'bot_send', { text: 'ของเสียหาย อยากได้เงินคืน' }); H.seen(); return o; });
    const shots = [];
    const go = async (p, name, fn) => { try { await fn(); } catch (e) { res[w + ' ' + name] = ['เปิดไม่ได้: ' + e.message.slice(0, 60)]; return; } const r = await p.evaluate(CHECK); if (r.length) res[w + ' ' + name] = r; const f = OUT + w + '-' + name + '.png'; await p.screenshot({ path: f, fullPage: true }); shots.push(f); };
    const u = await login('u01', true); for (let i = 0; i < 5 && await u.locator('.rwpop').count(); i++) { await u.locator('.rwpop [data-rw=ok]').click(); await W(u, 300); }
    await go(u, 'u-home', () => nav(u, 'u-home'));
    await go(u, 'u-new', async () => { await nav(u, 'u-home'); await u.locator('[data-svc]').nth(1).click(); await W(u, 700); });
    await go(u, 'u-orders', () => nav(u, 'u-orders'));
    await go(u, 'u-job-conf', () => openJob(u, J.conf));
    await go(u, 'u-job-shop', () => openJob(u, J.shop));
    await go(u, 'u-profile', () => nav(u, 'profile'));
    await go(u, 'u-points', () => page(u, 'points'));
    await go(u, 'u-chats', async () => { await u.reload(); await W(u, 900); await u.click('[data-go=chats]'); await W(u, 700); });
    await go(u, 'u-bot', async () => { await u.reload(); await W(u, 900); await u.click('#botfab'); await W(u, 800); });
    const r = await login('u02', true); for (let i = 0; i < 5 && await r.locator('.rwpop').count(); i++) { await r.locator('.rwpop [data-rw=ok]').click(); await W(r, 300); }
    await go(r, 'r-incoming', () => nav(r, 'u-incoming'));
    await go(r, 'r-job-codw', () => openJob(r, J.codw));
    await go(r, 'r-job-deli', () => openJob(r, J.deli));
    const a = await login('admin', true);
    await go(a, 'a-orders', () => nav(a, 'a-orders'));
    await go(a, 'a-job', () => openJob(a, J.deli));
    await go(a, 'a-job-shop', () => openJob(a, J.shop));
    await go(a, 'a-home', () => nav(a, 'a-home'));
    await go(a, 'a-ai', async () => { await nav(a, 'a-home'); await a.click('[data-htab=bot]'); await W(a, 900); });
    await go(a, 'a-chats', () => nav(a, 'chats'));
    await go(a, 'a-users', async () => { await page(a, 'resetpw'); await a.fill('#rf [name=username]', 'u02'); await a.click('#rf .btn'); await W(a, 700); });
    await go(a, 'a-pricing', () => page(a, 'pricing'));
    await go(a, 'a-profile', () => nav(a, 'profile'));
    await ctx.close();
  }
  console.log(JSON.stringify(res, null, 1));
  console.log('page errors:', errs.length ? errs : 'none');
  await b.close();
})();
