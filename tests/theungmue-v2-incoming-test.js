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
    const p = H.mk({ sender: 'u03', f: { mode: 'urgent' } });
    const c2 = H.mk({}); H.to(c2, 'confirmed');
    const d = H.mk({}); H.to(d, 'delivered');
    const c = H.mk({}); H.L.handle(H.tok('u01'), 'act', { id: c, action: 'cancel', note: 'สั่งผิด' });
    const x = H.cod(); H.S.update('Jobs', x, { created_at: new Date(Date.now() - 25 * 36e5).toISOString() });
    H.seen(); return { w, a, p, c2, d, c, x, code: H.job(a).code };
  });
  let u = await login('u02', true); await u.evaluate(() => localStorage.removeItem('tm-fab-pos')); await u.click('.tabbar [data-go=u-incoming]'); await W(u, 900);
  await T('INC-01', 'ต้องทำ', 'ปลายทางที่รอคุณยอมรับอยู่บนสุด', 'ผู้รับเปิด "ของที่จะได้รับ"', 'ส่วน "ต้องทำ" บนสุด · ป้าย "รอคุณยอมรับ" · "ต้องจ่าย ฿13" · บอกเวลาที่เหลือ · ปุ่ม ปฏิเสธ / ดูและยอมรับ',
    async () => { const h = await u.locator('main h2').allInnerTexts(); const t = await txt(u, '.icard.todo'); return [h[0].startsWith('ต้องทำ') && t.includes('รอคุณยอมรับ') && t.includes('ต้องจ่าย ฿13') && t.includes('ยอมรับภายใน') && t.includes('ปฏิเสธ') && t.includes('ดูและยอมรับ'), h.join(' | ').replace(/\s+/g, ' ')]; });
  await T('INC-02', 'กำลังมาถึงคุณ', 'เรียงกำลังนำส่งก่อน แล้วตามเวลาที่ต้องถึง', 'ดูส่วน "กำลังมาถึงคุณ"', 'ลำดับ: กำลังนำส่ง → รอรับของ → รอยืนยัน',
    async () => { let r = await u.locator('main .stack').nth(1).locator('.icard b').allInnerTexts(); r = r.filter(x => x.startsWith('TM')); return [r.join() === [ids.a, ids.c2, ids.p].join(), r.join(' → ')]; });
  await T('INC-03', 'รหัสรับของ', 'การ์ดที่กำลังนำส่งแสดงรหัสรับของ', 'ดูการ์ดที่กำลังนำส่ง', 'มีรหัส 4 หลักบนการ์ด · การ์ดอื่นไม่มี',
    async () => { const n = await u.locator('.icode').count(); const t = await txt(u, '.icode'); return [n === 1 && t.includes(ids.code) && t.includes('บอกไรเดอร์หลังได้รับของแล้วเท่านั้น'), t]; });
  await T('INC-04', 'ราคา', 'แสดงยอดเฉพาะที่ผู้รับต้องจ่าย', 'ดูราคาบนการ์ดทั้งหมด', 'ปลายทาง: "ต้องจ่าย ฿.." · ผู้สั่งจ่าย: "ผู้สั่งเป็นคนจ่าย" (ไม่มีตัวเลขราคา) · ยกเลิก: บอกเหตุผล',
    async () => { const p = await u.locator('.ir2 > span:last-child').allInnerTexts(); return [p.filter(x => /^ต้องจ่าย ฿/.test(x)).length === 1 && p.filter(x => x === 'ผู้สั่งเป็นคนจ่าย').length >= 3 && p.includes('ไม่ได้ตอบรับใน 24 ชม.') && p.includes('ผู้สั่งยกเลิก') && !p.some(x => /^฿/.test(x)), p.join(' / ')]; });
  await T('INC-05', 'ประวัติ', 'หัวข้อ "ประวัติ" มีป้ายได้รับแล้ว/ยกเลิก ไม่มีปุ่มดูทั้งหมดเมื่อไม่เกิน 3', 'ดูส่วนประวัติ (3 รายการ)', 'หัวข้อ "ประวัติ 3" · ป้าย "ได้รับแล้ว" 1 · "ยกเลิก" 2 · ไม่มี "ดูทั้งหมด"',
    async () => { const h = (await u.locator('main h2').allInnerTexts()).pop().replace(/\s+/g, ' '); const ok = await u.locator('.ist.ok').count(), x = await u.locator('.ist.x').count(); return [h === 'ประวัติ 3' && ok === 1 && x === 2, h + ' · ได้รับ ' + ok + ' ยกเลิก ' + x]; });
  await T('INC-06', 'ปุ่มนก', 'ตำแหน่งเริ่มต้นมุมขวาล่าง เหนือเมนูล่าง', 'ผู้ใช้ที่ยังไม่เคยย้ายปุ่ม', 'ปุ่มอยู่ขวา และขอบล่างอยู่เหนือเมนูล่าง',
    async () => { const f = await u.locator('#botfab').boundingBox(); const n = await u.locator('.tabbar').boundingBox(); return [f.x > 300 && f.y + f.height <= n.y && n.y - (f.y + f.height) < 30, 'fab y=' + Math.round(f.y) + ' nav y=' + Math.round(n.y)]; });
  await u.screenshot({ path: SH + 'inc-1.png' });
  await u.click('[data-decline="' + ids.w + '"]'); await W(u, 300);
  const t7 = await txt(u, '[data-decline="' + ids.w + '"]'); const st7 = await E(id => H.job(id).status, ids.w);
  await u.click('[data-decline="' + ids.w + '"]'); await W(u, 800);
  await T('INC-07', 'ต้องทำ', 'ปฏิเสธต้องกด 2 ครั้ง', 'กด "ปฏิเสธ" 1 ครั้ง แล้วกดซ้ำ', 'ครั้งแรก: ปุ่มเปลี่ยนเป็น "กดอีกครั้งเพื่อปฏิเสธ" ยังไม่ยกเลิก · ครั้งที่ 2: ยกเลิก ส่วน "ต้องทำ" หาย ไปอยู่ในประวัติ "คุณปฏิเสธชำระปลายทาง"',
    async () => { const todo = await u.locator('.icard.todo').count(); const st = await E(id => H.job(id).status, ids.w); const t = await txt(u, 'main'); return [t7 === 'กดอีกครั้งเพื่อปฏิเสธ' && st7 === 'pending' && st === 'cancelled' && todo === 0 && t.includes('คุณปฏิเสธชำระปลายทาง') && t.includes('ดูทั้งหมด'), t7 + ' / ' + st7 + ' → ' + st]; });
  const c8 = await E(() => { const id = H.cod(); return id; });
  await u.click('.tabbar [data-go=u-home]'); await W(u, 400); await u.click('.tabbar [data-go=u-incoming]'); await W(u, 800);
  await u.locator('.icard.todo .btn:not(.ghost)').click(); await W(u, 800);
  await T('INC-08', 'ต้องทำ', 'ปุ่ม "ดูและยอมรับ" เปิดหน้าคำสั่งเพื่อเลือกใช้ Point และยอมรับ', 'กด "ดูและยอมรับ"', 'เปิดหน้าคำสั่ง มีการ์ดยอมรับชำระปลายทาง',
    async () => { const t = await txt(u, 'main'); return [t.includes(c8) && (await u.locator('#codcard').count()) === 1, t.slice(0, 60)]; });
  let u4 = await login('u04'); await u4.click('.tabbar [data-go=u-incoming]'); await W(u4, 700);
  await T('INC-09', 'ยังไม่มีของ', 'ไม่มีของ แสดงกล่องเดียวพร้อมวิธีใช้', 'u04 ที่ไม่มีของส่งถึง เปิดหน้า', 'กล่อง "ยังไม่มีของที่ส่งถึงคุณ" + 3 ขั้น · ไม่มีหัวข้อว่างอื่น',
    async () => { const t = await txt(u4, '.incempty'); const h = await u4.locator('main h2').count(); return [t.includes('ยังไม่มีของที่ส่งถึงคุณ') && t.includes('รหัส 4 หลัก') && h === 0, t.slice(0, 80)]; });
  await u4.screenshot({ path: SH + 'inc-2.png' });
  console.log('page errors:', errs.length ? errs : 'none');
  console.log('ผ่าน ' + R.filter(x => x.status === 'ผ่าน').length + '/' + R.length);
  await b.close();
})();
