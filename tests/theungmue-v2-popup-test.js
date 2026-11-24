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
(async () => {
  b = await chromium.launch(); ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Bangkok', deviceScaleFactor: 2 });
  seed = await ctx.newPage(); seed.on('pageerror', e => errs.push('seed: ' + e.message)); await seed.goto(URL); await seed.evaluate(HELP); await E(() => H.reset());
  await E(() => { // u01: ได้ Point 3 รายการ (สำเร็จ 2 + ชดเชย 1)
    for (let i = 0; i < 2; i++) { const j = H.mk({}); H.to(j, 'delivered'); }
    const l = H.mk({}); H.to(l, 'delivering'); H.S.update('Jobs', l, { due_at: new Date(Date.now() - 20 * 60000).toISOString() }); H.act(l, 'deliver', { code: H.job(l).code });
    // u03: ถูกหัก + ยกเลิกอัตโนมัติ + ได้ Point 2
    const p = H.cod({ recipient_id: 'U03' }); H.racc(p, 'u03', false); H.to(p, 'delivering'); H.L.handle(H.tok('u03'), 'act', { id: p, action: 'refuse', code: 'changed_mind' });
    const x = H.mk({ sender: 'u03', f: { pay_method: 'cod', recipient_id: 'U04' } }); H.S.update('Jobs', x, { created_at: new Date(Date.now() - 25 * 36e5).toISOString() });
    for (let i = 0; i < 2; i++) { const j = H.mk({ sender: 'u03', f: { recipient_id: 'U04' } }); H.to(j, 'delivered'); }
    // u04: ได้ Point 1 รายการ
    // (u04 เป็นผู้รับเท่านั้น ใช้ u02 แทน)
    const s1 = H.mk({ sender: 'u02', f: { recipient_id: 'U04' } }); H.to(s1, 'delivered');
  });
  let u = await login('u01', true); await W(u, 800);
  const n1 = await u.locator('.rwpop').count(); const t1 = await txt(u, '.rwpop'); const rows = await u.locator('.rwlist > div').count();
  await u.screenshot({ path: SH + 'pop-1.png' });
  await u.click('.rwpop [data-rw=ok]'); await W(u, 700);
  const n1b = await u.locator('.rwpop').count(); const left1 = await E(() => H.S.list('Rewards').filter(r => r.user_id === 'U01' && !r.seen_at).length);
  await T('POP-01', 'Popup', 'ได้ Point หลายรายการ รวมเป็น popup เดียว', 'u01 ได้ Point 4 รายการ (สำเร็จ 3 + ชดเชยส่งช้า 1) แล้วเข้าสู่ระบบ', 'popup เดียว "+8 Point" "ได้รับ Point 4 รายการ" แสดง 3 บรรทัด + "และอีก 1 รายการ" บอกคงเหลือ · กดตกลงครั้งเดียวหมด',
    async () => [n1 === 1 && /\+8 Point/.test(t1) && t1.includes('ได้รับ Point 4 รายการ') && t1.includes('และอีก 1 รายการ') && /คงเหลือ \d+ Point/.test(t1) && rows === 3 && n1b === 0 && left1 === 0, t1.slice(0, 120) + ' · หลังกด ' + n1b + ' · ค้าง ' + left1]);
  let v = await login('u03', true); await W(v, 800);
  const seq = [];
  for (let i = 0; i < 5 && await v.locator('.rwpop').count(); i++) { seq.push((await txt(v, '.rwpop')).slice(0, 70)); if (i === 0) await v.screenshot({ path: SH + 'pop-2.png' }); await v.locator('.rwpop [data-rw=ok]').click(); await W(v, 600); }
  await T('POP-02', 'Popup', 'เรื่องที่ต้องรับทราบขึ้นก่อนทีละอัน แล้วตาม Point รวม', 'u03 ถูกหัก + ยกเลิกอัตโนมัติ + ได้ Point 2 รายการ', '3 popup: "เรื่องที่ 1 จาก 2" → "เรื่องที่ 2 จาก 2" → "+N Point ได้รับ Point 2 รายการ"',
    async () => [seq.length === 3 && seq[0].startsWith('เรื่องที่ 1 จาก 2') && seq[1].startsWith('เรื่องที่ 2 จาก 2') && seq[2].includes('ได้รับ Point 2 รายการ'), seq.join(' → ')]);
  let w = await login('u02', true); await W(w, 800);
  const t3 = await txt(w, '.rwpop'); const r3 = await w.locator('.rwlist').count();
  await T('POP-03', 'Popup', 'ได้ Point รายการเดียว แบบเดิม', 'u02 ได้ Point 1 รายการ', '"ได้รับ Point จากคำสั่งที่สำเร็จ" ไม่มีรายการ ไม่มีตัวบอกลำดับ', async () => [t3.includes('ได้รับ Point จากคำสั่งที่สำเร็จ') && r3 === 0 && !t3.includes('เรื่องที่'), t3.slice(0, 80)]);
  console.log('page errors:', errs.length ? errs : 'none');
  console.log('ผ่าน ' + R.filter(x => x.status === 'ผ่าน').length + '/' + R.length);
  await b.close();
})();
