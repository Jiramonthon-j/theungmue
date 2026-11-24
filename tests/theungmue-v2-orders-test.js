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
  const ids = await E(() => {
    const w = H.cod({ dropoff_zone: 'อาคาร 22' });
    const a = H.mk({ f: { dropoff_zone: 'คณะบัญชี' } }); H.to(a, 'delivering');
    const p = H.mk({ f: { mode: 'urgent' } });
    const c2 = H.mk({}); H.to(c2, 'confirmed');
    const d = []; for (let i = 0; i < 3; i++) { const x = H.mk({}); H.to(x, 'delivered'); d.push(x); }
    const c = H.mk({}); H.L.handle(H.tok('u01'), 'act', { id: c, action: 'cancel', note: 'สั่งผิด' });
    const x = H.cod(); H.S.update('Jobs', x, { created_at: new Date(Date.now() - 25 * 36e5).toISOString() });
    H.S.update('Jobs', w, { created_at: new Date(Date.now() - 3 * 36e5).toISOString() });
    return { w, a, p, c2, d, c, x };
  });
  let u = await login('u01', true); for (let i = 0; i < 5 && await u.locator('.rwpop').count(); i++) { await u.locator('.rwpop button').last().click(); await W(u, 400); }
  await u.click('.tabbar [data-go=u-orders]'); await W(u, 900);
  const sec = i => u.locator('#olist .stack').nth(i).locator('.icard .ir1 b');
  await T('ORD2-01', 'ทั้งหมด', 'แบ่ง กำลังดำเนินการ / จบแล้ว', 'เปิด "คำสั่งของฉัน" แท็บทั้งหมด', 'หัวข้อ "กำลังดำเนินการ 4" แล้ว "จบแล้ว 5" มีปุ่มดูทั้งหมด · จบแล้วแสดง 3 รายการ',
    async () => { const h = (await u.locator('#olist h2').allInnerTexts()).map(x => x.replace(/\s+/g, ' ')); const n = await sec(1).count(); return [h[0] === 'กำลังดำเนินการ 4' && h[1] === 'จบแล้ว 5 ดูทั้งหมด' && n === 3, h.join(' | ') + ' · ' + n]; });
  await T('ORD2-02', 'ทั้งหมด', 'เรียง กำลังนำส่ง → รอรับของ → รอยืนยัน → รอผู้รับยอมรับ', 'ดูลำดับในกำลังดำเนินการ', 'ลำดับตรง',
    async () => { const r = await sec(0).allInnerTexts(); return [r.join() === [ids.a, ids.c2, ids.p, ids.w].join(), r.join(' → ')]; });
  await T('ORD2-03', 'การ์ด', 'บอกว่าส่งถึงใคร', 'ดูบรรทัดที่ 2 ของการ์ด', '"ถึง User U02 → ..." ทุกการ์ด',
    async () => { const r = await u.locator('.icard .ir2 > span:first-child').allInnerTexts(); return [r.length === 7 && r.every(x => x.startsWith('ถึง User U02 → ')), r[0]]; });
  await T('ORD2-04', 'การ์ด', 'ปลายทางรอผู้รับ บอกเวลาที่เหลือ', 'ดูการ์ดเก็บเงินปลายทางที่สั่งมา 3 ชม.', '"ผู้รับต้องตอบภายใน 21 ชม. ไม่งั้นยกเลิกอัตโนมัติ"',
    async () => { const t = await txt(u, '.owait'); return [t === 'ผู้รับต้องตอบภายใน 21 ชม. ไม่งั้นยกเลิกอัตโนมัติ', t]; });
  await T('ORD2-05', 'การ์ด', 'งานจบแล้วบอกเวลาจบ · ยกเลิกไม่แสดงราคา', 'ดูส่วนจบแล้ว', 'สำเร็จ: "ส่งถึงเมื่อ" + ราคา · ยกเลิก: "ยกเลิกเมื่อ" + เหตุผล ไม่มี ฿',
    async () => { const c = await u.locator('#olist .stack').nth(1).locator('.icard').allInnerTexts(); const x = c.map(s => s.replace(/\s+/g, ' '));
      const can = x.filter(s => s.includes('ยกเลิกเมื่อ')), ok = x.filter(s => s.includes('ส่งถึงเมื่อ'));
      return [can.length >= 1 && can.every(s => !s.includes('฿') && /(คุณยกเลิกเอง|ผู้รับไม่ตอบรับใน 24 ชม\.)/.test(s)) && ok.every(s => s.includes('฿10')), x.join(' / ').slice(0, 200)]; });
  await u.screenshot({ path: SH + 'ord2-1.png' });
  await u.click('[data-t=cancelled]'); await W(u, 500);
  await T('ORD2-06', 'แท็บยกเลิก', 'เหตุผลการยกเลิกจากมุมผู้สั่ง', 'กดแท็บยกเลิก', '"คุณยกเลิกเอง" และ "ผู้รับไม่ตอบรับใน 24 ชม." · แท็บยกเลิกเห็นในจอ',
    async () => { const t = await txt(u, '#olist'); const v = await u.evaluate(() => { const tb = document.querySelector('.otabs').getBoundingClientRect(), on = document.querySelector('.otabs .on').getBoundingClientRect(); return on.right <= tb.right + 1 && on.left >= tb.left - 1; });
      return [t.includes('คุณยกเลิกเอง') && t.includes('ผู้รับไม่ตอบรับใน 24 ชม.') && v, 'เห็นแท็บ=' + v]; });
  await u.click('[data-t=confirmed]'); await W(u, 400); const nConf = await u.locator('#olist .icard').count();
  await u.click('[data-t=active]'); await W(u, 400); const act = await u.locator('#olist .icard .ir1 b').allInnerTexts();
  await T('ORD2-07', 'แท็บ', 'แยก "รอรับของ" ออกจาก "กำลังส่ง"', 'กดแท็บรอรับของ และกำลังส่ง', 'รอรับของ 1 รายการ · กำลังส่งมีเฉพาะงานที่ไรเดอร์รับของ/กำลังนำส่ง',
    async () => [nConf === 1 && act.join() === ids.a, 'รอรับของ ' + nConf + ' · กำลังส่ง ' + act.join()]);
  await u.click('[data-t=all]'); await W(u, 400); await u.click('#olist [data-hist=sent]'); await W(u, 800);
  await T('ORD2-08', 'ดูทั้งหมด', 'ปุ่มดูทั้งหมดเปิดประวัติคำสั่ง ใช้การ์ดแบบเดียวกัน', 'กด "ดูทั้งหมด" ในจบแล้ว', 'หน้าประวัติคำสั่ง 5 รายการ · การ์ดยกเลิกไม่มีราคา',
    async () => { const n = await u.locator('.hitem .icard').count(); const t = await txt(u, '#hlist'); return [n === 5 && t.includes('คุณยกเลิกเอง'), n + ' รายการ']; });
  let u4 = await login('u04'); await u4.click('.tabbar [data-go=u-orders]'); await W(u4, 700);
  await T('ORD2-09', 'ยังไม่มีคำสั่ง', 'กล่องเดียว + ปุ่มสั่งส่งของ', 'u04 ที่ยังไม่เคยสั่ง เปิดหน้า แล้วกดปุ่ม', 'ไม่มีช่องค้นหา/แท็บ · กดแล้วไปหน้าแรก',
    async () => { const t = await txt(u4, '.incempty'); const s = await u4.locator('#oq, .otabs').count(); await u4.click('.oempty'); await W(u4, 500); const home = await u4.locator('.tabbar [data-go=u-home].on').count();
      return [t.includes('ยังไม่มีคำสั่ง') && s === 0 && home === 1, t.slice(0, 40) + ' · หน้าแรก=' + home]; });
  await u4.screenshot({ path: SH + 'ord2-2.png' });
  console.log('page errors:', errs.length ? errs : 'none');
  console.log('ผ่าน ' + R.filter(x => x.status === 'ผ่าน').length + '/' + R.length);
  await b.close();
})();
