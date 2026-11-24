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
async function openJob(p, id) { await p.evaluate(id => { const a = document.createElement('a'); a.setAttribute('data-job', id); document.getElementById('app').appendChild(a); a.click(); a.remove(); }, id); await W(p, 900); }
(async () => {
  b = await chromium.launch(); ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Bangkok' });
  seed = await ctx.newPage(); seed.on('pageerror', e => errs.push('seed: ' + e.message)); await seed.goto(URL); await seed.evaluate(HELP); await E(() => H.reset());
  const J = await E(() => {
    const o = {}, L = H.L, ago = m => new Date(Date.now() - m * 60000).toISOString();
    o.pend = H.mk({});
    o.conf = H.mk({}); H.to(o.conf, 'confirmed');
    o.codConf = H.cod({ recipient_id: 'U03' }); H.racc(o.codConf, 'u03', false); H.to(o.codConf, 'confirmed');
    o.pen = H.cod({}); H.racc(o.pen, 'u02', false); H.to(o.pen, 'delivering'); L.handle(H.tok('u02'), 'act', { id: o.pen, action: 'refuse', code: 'changed_mind' });
    o.nonCod = H.mk({}); H.to(o.nonCod, 'delivering');
    o.codw = H.cod({}); H.S.update('Jobs', o.codw, { created_at: ago(5 * 60) });
    o.shop = H.mk({}); H.to(o.shop, 'delivering'); H.act(o.shop, 'arrive'); L.handle(H.tok('admin'), 'act', { id: o.shop, action: 'fail', code: 'item_damaged', note: 'กล่องบุบ', photos: { list: H.ph, verdict: 'shop' } });
    o.shopCod = H.cod({}); H.racc(o.shopCod, 'u02', false); H.to(o.shopCod, 'delivering'); H.act(o.shopCod, 'arrive'); L.handle(H.tok('admin'), 'act', { id: o.shopCod, action: 'fail', code: 'item_damaged', note: 'บุบ', photos: { list: H.ph, verdict: 'shop' } });
    o.chat = H.mk({}); L.handle(H.tok('u01'), 'send', { id: o.chat, text: 'วางของแล้วครับ' });
    o.sj = L.handle(H.tok('u01'), 'job', { id: o.pen }).job; o.rj = L.handle(H.tok('u02'), 'job', { id: o.pen }).job;
    o.refuseErr = H.err(() => L.handle(H.tok('u02'), 'act', { id: o.nonCod, action: 'refuse', code: 'cannot_pay' }));
    o.shopJob = H.job(o.shop); o.shopCodJob = H.job(o.shopCod);
    H.seen(); return o;
  });
  await T('UF-01', 'ความเป็นส่วนตัว', 'ผู้สั่งไม่เห็นบทลงโทษของผู้รับ', 'ผู้รับไม่รับของ (ความผิดผู้รับ) แล้วผู้สั่งเปิดคำสั่ง', 'ข้อมูลที่ผู้สั่งได้ไม่มี penalty_/appeal_ · ผู้รับยังเห็นของตัวเอง',
    async () => { const sk = Object.keys(J.sj).filter(k => /^(penalty_|appeal_)/.test(k)); return [sk.length === 0 && J.rj.penalty_user === J.sj.recipient_id, 'ผู้สั่งได้: ' + (sk.join() || 'ไม่มี') + ' / ผู้รับได้ penalty_user=' + !!J.rj.penalty_user]; });
  await T('UF-02', 'ไม่รับของ', 'ผู้สั่งจ่ายแล้ว เลือก "ไม่สะดวกจ่ายเงิน" ไม่ได้', 'ผู้รับคำสั่งที่ผู้สั่งจ่าย ส่ง cannot_pay', 'ระบบปฏิเสธ', async () => [/ผู้สั่งจ่ายแล้ว/.test(J.refuseErr), J.refuseErr]);
  await T('UF-03', 'ส่งไม่สำเร็จ', 'TheungMue ผิด คืนเงินผู้สั่งที่จ่ายตอนฝาก · ปลายทางไม่คืน', 'ส่งไม่สำเร็จ ของเสียหาย ตัดสินว่า TheungMue ผิด', 'จ่ายตอนฝาก: refund_amount=10 · ปลายทาง: ไม่มี',
    async () => [J.shopJob.refund_amount === '10' && !J.shopCodJob.refund_amount, 'จ่ายตอนฝาก ' + J.shopJob.refund_amount + ' / ปลายทาง ' + (J.shopCodJob.refund_amount || '-')]);
  let u = await login('u01');
  await T('UF-04', 'หน้าแรก', 'การ์ดคำสั่งแบบใหม่ · ข้อความแนะนำใหม่', 'ผู้สั่งเปิดหน้าแรก', 'การ์ด "ถึง User U02 → ..." · ข้อความ "ส่งปกติภายใน 1 วัน ด่วนภายใน 1–2 ชม. · จ่ายตอนฝาก หรือให้ผู้รับจ่ายปลายทาง"',
    async () => { const c = await u.locator('main .icard .ir2 > span:first-child').allInnerTexts(); const h = await txt(u, '.hero'); return [c.length >= 1 && c.every(x => x.startsWith('ถึง ')) && h.includes('ส่งปกติภายใน 1 วัน ด่วนภายใน 1–2 ชม.') && h.includes('ให้ผู้รับจ่ายปลายทาง') && !h.includes('ภายในวัน'), c[0] + ' / ' + h.slice(0, 60)]; });
  await openJob(u, J.pend);
  await T('UF-05', 'หน้าคำสั่ง', 'รอยืนยัน: บอกขั้นต่อไป', 'ผู้สั่งเปิดคำสั่งรอยืนยัน', '"ขั้นต่อไป: รอแอดมินยืนยัน" "ยังไม่ต้องนำของมา" + 3 ขั้น', async () => { const t = await txt(u, '.nextcard'); return [t.includes('รอแอดมินยืนยัน') && t.includes('ยังไม่ต้องนำของมา') && t.includes('จ่ายเงินสด ฿10'), t.slice(0, 80)]; });
  await openJob(u, J.conf);
  await T('UF-06', 'หน้าคำสั่ง', 'รอรับของ: บอกให้นำของมาฝาก', 'ผู้สั่งเปิดคำสั่งรอรับของ', 'กล่อง "นำของมาฝากที่จุดรับฝากได้เลย" + เวลาเปิด + เตรียมเงินสด ฿10 + ปุ่มดูเส้นทาง/แชท',
    async () => { const t = await txt(u, '.dropcard'); const n = await u.locator('.dropcard .btn').count(); return [t.includes('นำของมาฝากที่จุดรับฝากได้เลย') && t.includes('08:00–18:00') && t.includes('เตรียมเงินสด ฿10') && n === 2, t.slice(0, 90)]; });
  await openJob(u, J.codConf);
  await T('UF-07', 'หน้าคำสั่ง', 'รอรับของแบบปลายทาง: ผู้สั่งไม่ต้องจ่าย', 'เปิดคำสั่งปลายทางที่ยืนยันแล้ว', '"ไม่ต้องจ่าย ผู้รับจ่ายตอนได้รับของ"', async () => { const t = await txt(u, '.dropcard'); return [t.includes('ไม่ต้องจ่าย ผู้รับจ่ายตอนได้รับของ'), t.slice(30, 120)]; });
  await openJob(u, J.pen);
  await T('UF-08', 'ความเป็นส่วนตัว', 'หน้าคำสั่งผู้สั่งไม่มีบรรทัดบทลงโทษ', 'ผู้สั่งเปิดคำสั่งที่ผู้รับไม่รับของ', 'ไม่มีคำว่า "บทลงโทษ" / "นับการปฏิเสธ"', async () => { const t = await txt(u, 'main'); return [!/บทลงโทษ|นับการปฏิเสธ/.test(t), 'มี=' + /บทลงโทษ|นับการปฏิเสธ/.test(t)]; });
  await openJob(u, J.shop);
  const rt = await txt(u, '.returncard'); const bl = await txt(u, '.returncard [data-do=returned]');
  await u.click('.returncard [data-do=returned]'); await W(u, 900);
  await T('UF-09', 'ส่งไม่สำเร็จ', 'ผู้สั่งเห็นว่าจะได้เงินคืน แล้วยืนยันได้รับของและเงินคืน', 'เปิดคำสั่งที่ TheungMue ผิด → กด "ได้รับของและเงินคืนแล้ว"', 'ก่อน: "คืนเงินค่าส่ง ฿10 ให้คุณตอนมารับของคืน" · หลัง: "คืนเงินค่าส่ง ฿10 แล้ว" และบันทึกเวลา',
    async () => { const t = await txt(u, '.returncard'); const at = await E(id => H.job(id).refunded_at, J.shop); return [rt.includes('คืนเงินค่าส่ง ฿10 ให้คุณตอนมารับของคืน') && bl === 'ได้รับของและเงินคืนแล้ว' && t.includes('คืนเงินค่าส่ง ฿10 แล้ว') && !!at, bl + ' → ' + t.slice(0, 60)]; });
  await u.click('[data-go=chats]'); await W(u, 800);
  await T('UF-10', 'แชท', 'แสดงเฉพาะห้องที่มีข้อความ · ไอคอนแทนตัวอักษร', 'ผู้สั่งที่ทักแชทไว้ 1 คำสั่ง เปิดหน้าแชท', '1 ห้อง (คำสั่งที่ทัก) · ไม่มี "ยังไม่มีข้อความ" · รูปเป็นไอคอน',
    async () => { const n = await u.locator('.conv').count(); const t = await txt(u, 'main'); const svg = await u.locator('.conv .cav svg').count(); return [n === 1 && t.includes(J.chat) && !t.includes('ยังไม่มีข้อความ') && svg === 1, n + ' ห้อง']; });
  // จำกัดคำสั่งรอยืนยัน
  const lim = await E(() => { const r = []; for (let i = 0; i < 6; i++) r.push(H.err(() => H.mk({ sender: 'u03', f: { recipient_id: 'U04' } }))); return r; });
  await T('UF-11', 'สั่งของ', 'คำสั่งรอยืนยันได้ไม่เกิน 5 ต่อคน', 'u03 สั่ง 6 ครั้งติดกัน (ยังไม่มีใครยืนยัน)', 'ครั้งที่ 1–5 ได้ · ครั้งที่ 6 ขึ้น "มีคำสั่งรอยืนยันครบ 5 รายการแล้ว..."',
    async () => [lim.slice(0, 5).every(x => x === 'OK') && /รอยืนยันครบ 5/.test(lim[5]), lim[5]]);
  const lim2 = await E(() => { const id = H.S.list('Jobs').find(j => j.sender_id === 'U03' && j.status === 'pending').id; H.act(id, 'confirm'); return H.err(() => H.mk({ sender: 'u03', f: { recipient_id: 'U04' } })); });
  await T('UF-12', 'สั่งของ', 'แอดมินยืนยันไป 1 รายการ สั่งเพิ่มได้', 'แอดมินยืนยัน 1 แล้ว u03 สั่งใหม่', 'สั่งได้', async () => [lim2 === 'OK', lim2]);
  // ผู้รับ
  let r = await login('u02');
  await T('UF-13', 'หน้าแรก', 'การ์ดของที่มาถึงแบบใหม่', 'ผู้รับเปิดหน้าแรก', 'การ์ด "จาก User U01 → ..." บอกยอดเฉพาะที่ผู้รับจ่าย',
    async () => { const c = await r.locator('main .icard .ir2').allInnerTexts(); return [c.length >= 1 && c.every(x => x.startsWith('จาก ')) && c.every(x => /ต้องจ่าย ฿|ผู้สั่งเป็นคนจ่าย/.test(x)), c.map(x => x.replace(/\s+/g, ' ')).join(' / ').slice(0, 120)]; });
  await openJob(r, J.codw);
  await T('UF-14', 'ปลายทาง', 'หน้าคำสั่งผู้รับบอกเวลาที่เหลือ', 'ผู้รับเปิดคำสั่งปลายทางที่สั่งมา 5 ชม.', '"ตอบภายใน 19 ชม. ไม่งั้นคำสั่งจะถูกยกเลิกอัตโนมัติ"', async () => { const t = await txt(r, '.coddue'); return [t === 'ตอบภายใน 19 ชม. ไม่งั้นคำสั่งจะถูกยกเลิกอัตโนมัติ', t]; });
  await openJob(r, J.nonCod); await r.click('details.refuse > summary'); await W(r, 300);
  await T('UF-15', 'ไม่รับของ', 'ผู้สั่งจ่ายแล้ว ไม่มีตัวเลือก "ไม่สะดวกจ่ายเงิน"', 'ผู้รับเปิดฟอร์มไม่รับของ', 'ไม่มีตัวเลือกนี้', async () => { const o = await r.locator('#refusef .rsn span').allInnerTexts(); return [!o.includes('ไม่สะดวกจ่ายเงิน') && o.length >= 1, o.join(' / ')]; });
  // คำ
  let a = await ctx.newPage(); await a.goto(URL); await a.getByText('สมัครสมาชิก').first().click(); await W(a, 400);
  const reg = await txt(a, 'main'); await r.click('.tabbar [data-go=profile]'); await W(r, 500); await r.click('[data-page=editprofile]'); await W(r, 600); const ed = await txt(r, 'main');
  await T('UF-16', 'คำ', 'ไม่มีคำว่า "คนส่ง" ในหน้าผู้ใช้', 'เปิดหน้าสมัคร และแก้ไขข้อมูลส่วนตัว', 'ใช้ "ไรเดอร์" แทน', async () => [!reg.includes('คนส่ง') && !ed.includes('คนส่ง') && reg.includes('ไรเดอร์') && ed.includes('ไรเดอร์'), 'สมัคร/แก้ไข มีคนส่ง=' + reg.includes('คนส่ง') + '/' + ed.includes('คนส่ง')]);
  await u.click('.tabbar [data-go=u-home]'); await W(u, 600); await u.locator('[data-svc]').nth(1).click(); await W(u, 800);
  await T('UF-17', 'คำ', 'คำใบ้เวลาส่งด่วนใช้ "ไรเดอร์"', 'เปิดฟอร์มส่งด่วน', '"เผื่อเวลาให้ไรเดอร์ 30 นาที"', async () => { const t = await txt(u, '#dlhint'); return [t.includes('เผื่อเวลาให้ไรเดอร์ 30 นาที'), t.slice(0, 80)]; });
  const th = await E(() => [H.err(() => H.L.handle(null, 'register', { username: 'mint01', name: 'มิ้นท์ ใจดี', phone: '0812345678', password: 'abcd1234' })), H.err(() => H.L.handle(H.tok('u03'), 'update_profile', { name: 'ต้นกล้า', phone: '0800000003', password: 'demo1234' }))]);
  await T('UF-18', 'ชื่อโปรไฟล์', 'ตั้งชื่อภาษาไทยได้', 'สมัครด้วยชื่อ "มิ้นท์ ใจดี" / แก้ชื่อเป็น "ต้นกล้า"', 'บันทึกได้ทั้งสอง', async () => [th[0] === 'OK' && th[1] === 'OK', th.join(' / ')]);
  await u.click('.tabbar [data-go=profile]'); await W(u, 500); await u.click('[data-page=deleteacc]'); await W(u, 800);
  await T('UF-19', 'ลบบัญชี', 'มีงานค้าง ปุ่มลบและช่องกรอกกดไม่ได้', 'u01 ที่มีคำสั่งค้าง เปิดหน้าลบบัญชี', 'ปุ่ม "ยืนยันลบบัญชีถาวร" disabled · ช่องรหัสผ่าน disabled · ปุ่มยกเลิกยังกดได้',
    async () => { const d1 = await u.locator('#delf .btn.danger').isDisabled(); const d2 = await u.locator('#delf [name=password]').isDisabled(); const d3 = await u.locator('#delf [data-act=nav-back]').isDisabled(); return [d1 && d2 && !d3, 'ลบ=' + d1 + ' รหัส=' + d2 + ' ยกเลิก=' + d3]; });
  await u.click('.tabbar [data-go=u-home]'); await W(u, 600);
  await T('UF-20', 'ปุ่มนก', 'เว้นที่ท้ายหน้าให้ปุ่มนก', 'เลื่อนหน้าแรกลงสุด', 'เนื้อหาส่วนท้ายอยู่เหนือปุ่มนก ไม่ถูกบัง',
    async () => { await u.evaluate(() => scrollTo(0, 1e6)); await W(u, 300); const r = await u.evaluate(() => { const els = [...document.querySelectorAll('#app > *:not(.tabbar):not(header)')]; const last = els[els.length - 1].getBoundingClientRect(); const f = document.getElementById('botfab').getBoundingClientRect(); return [Math.round(last.bottom), Math.round(f.top)]; }); return [r[0] <= r[1], 'เนื้อหาสุดท้ายจบที่ y=' + r[0] + ' · ปุ่มนกเริ่ม y=' + r[1]]; });
  console.log('page errors:', errs.length ? errs : 'none');
  console.log('ผ่าน ' + R.filter(x => x.status === 'ผ่าน').length + '/' + R.length);
  await b.close();
})();
