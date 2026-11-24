// TheungMue v2 — ชุดทดสอบ: ผู้ใช้ + ร้าน (แอดมิน)
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
const botMsgs = (p) => p.locator('#bchat .bmsg').allInnerTexts();
const lastBot = async (p) => { const t = await p.locator('#bchat .brow.bot .bmsg').allInnerTexts(); return (t[t.length - 1] || '').replace(/\s+/g, ' '); };
async function ask(p, q) { await p.fill('#bmsg', q); await p.click('#bsend button'); await W(p, 600); return lastBot(p); }
(async () => {
  b = await chromium.launch(); ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Bangkok' });
  seed = await ctx.newPage(); seed.on('pageerror', e => errs.push('seed: ' + e.message)); await seed.goto(URL); await seed.evaluate(HELP); await E(() => H.reset());
  await E(() => { for (let i = 0; i < 4; i++) { const id = H.mk({ f: { use_points: i < 2 } }); H.to(id, 'delivered'); } H.seen();
    const old = H.mk({}); H.to(old, 'delivered'); H.S.update('Jobs', old, { delivered_at: new Date(Date.now() - 2 * 864e5).toISOString(), created_at: new Date(Date.now() - 2 * 864e5).toISOString() }); H.seen(); });
  const n = await E(() => H.L.handle(H.tok('u01'), 'points', {}).items.length);
  let u = await login('u01'); await u.evaluate(() => localStorage.setItem('tm-fab-tip', '1'));
  await u.click('.tabbar [data-go=profile]'); await W(u, 600); await u.click('[data-page=points]'); await W(u, 700);
  await T('PT-01', 'ประวัติ Point', 'หน้า Point แสดง 5 รายการล่าสุด', 'บัญชีมีประวัติ ' + n + ' รายการ เปิดหน้า Point', 'แสดง 5 รายการ · มีปุ่ม "ดูทั้งหมด" และบอกจำนวนที่เหลือ',
    async () => { const rows = await u.locator('.crlist .lr').count(); const t = await txt(u, '#ptbody'); return [rows === 5 && t.includes('ดูทั้งหมด') && t.includes('อีก ' + (n - 5) + ' รายการ'), rows + ' แถว / ทั้งหมด ' + n]; });
  await u.screenshot({ path: SH + 'pt-1.png', fullPage: true });
  await u.click('[data-page="points-all"]'); await W(u, 700);
  await T('PT-02', 'ประวัติ Point', 'หน้าดูทั้งหมดแบ่งตามวัน', 'กด "ดูทั้งหมด"', 'ครบทุกรายการ · หัวข้อวัน "วันนี้" และวันก่อน พร้อมยอดรวมของวัน',
    async () => { const rows = await u.locator('.crlist .lr').count(); const d = await u.locator('.logday').allInnerTexts(); return [rows === n && d.length >= 2 && d[0].includes('วันนี้'), rows + ' แถว · ' + d.join(' | ').replace(/\s+/g, ' ')]; });
  await u.screenshot({ path: SH + 'pt-2.png', fullPage: true });
  await u.click('[data-act=nav-back]'); await W(u, 600);
  await T('PT-03', 'ประวัติ Point', 'กดกลับมาหน้า Point', 'กดปุ่มกลับ', 'กลับหน้า Point ของฉัน',
    async () => [(await u.locator('#ptbody').count()) === 1, 'ok']);
  console.log('page errors:', errs.length ? errs : 'none');
  console.log('ผ่าน ' + R.filter(x => x.status === 'ผ่าน').length + '/' + R.length);
  await b.close();
})();
