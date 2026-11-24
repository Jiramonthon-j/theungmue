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
    tok(u) { const usr = this.S.list('Users').find(x => x.username === u); const t = 'T' + Math.random().toString(36).slice(2) + Date.now().toString(36); this.S.insert('Sessions', { token: t, user_id: usr.id, created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 864e5).toISOString(), revoked: '' }); return t; }, // ทดสอบ: เปิดเซสชันตรง ไม่ทำให้หน้าเว็บที่ล็อกอินอยู่หลุด
    ph: ['data:image/jpeg;base64,AAAA'],
    mk(o) { o = o || {}; return this.L.handle(this.tok(o.sender || 'u01'), 'create', Object.assign({ item_type: 'เอกสาร / ชีท', item_detail: 'เอกสารทดสอบ', dropoff_zone: 'อาคาร 3', recipient_id: 'U02', mode: 'normal', photos: this.ph }, o.f || {})).job; },
    job(id) { return this.S.list('Jobs').find(x => x.id === id); },
    act(id, action, extra) { return this.L.handle(this.tok('admin'), 'act', Object.assign({ id, action, photos: this.ph }, extra || {})).job; },
    to(id, stage) { const seq = ['confirm', 'pickup', 'start', 'deliver']; const n = { confirmed: 1, picked: 2, delivering: 3, delivered: 4 }[stage];
      for (let i = 0; i < n; i++) this.act(id, seq[i], seq[i] === 'deliver' ? { code: this.job(id).code } : {}); return id; },
    err(fn) { try { fn(); return 'OK'; } catch (e) { return e.message; } },
    nf(id) { const ago = m => new Date(Date.now() - m * 60000).toISOString(); if (this.job(id).status !== 'delivering') this.to(id, 'delivering'); this.S.update('Jobs', id, { arrived_at: ago(40), contact_log: JSON.stringify([{ k: 'call', t: ago(35) }, { k: 'call', t: ago(28) }, { k: 'sender', t: ago(20) }]) }); return this.L.handle(this.tok('admin'), 'act', { id, action: 'fail', code: 'not_found', note: '', photos: { list: this.ph } }).job; },
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

(async () => {
  b = await chromium.launch(); ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Bangkok' });
  seed = await ctx.newPage(); seed.on('pageerror', e => errs.push('seed: ' + e.message)); await seed.goto(URL); await seed.evaluate(HELP); await E(() => H.reset());
  // ===== Point ตั้งต้นของบัญชีทดลอง =====
  const sp = await E(() => ['u01', 'u02', 'u03', 'u04'].map(u => H.L.handle(H.tok(u), 'points', {}).balance));
  await T('SEED-01', 'ตั้งค่าทดสอบ', 'บัญชีทดลองมี Point ตั้งต้นไว้ทดสอบส่วนลด', 'ดู Point ของ u01–u04 หลังล้างข้อมูล', 'u01 20 / u02 20 / u03 10 / u04 0', async () => [sp.join('/') === '20/20/10/0', sp.join('/')]);
  const sq = await E(() => [H.L.handle(H.tok('u01'), 'quote', { mode: 'normal', dropoff_zone: 'อาคาร 3', item_type: 'เอกสาร / ชีท' }).max_discount, H.L.handle(H.tok('u04'), 'quote', { mode: 'normal', dropoff_zone: 'อาคาร 3', item_type: 'เอกสาร / ชีท' }).max_discount]);
  await T('SEED-02', 'ตั้งค่าทดสอบ', 'u01 ใช้ส่วนลดได้ทันที u04 ใช้ไม่ได้', 'ขอราคางานปกติ ฿10', 'u01 ลดได้ ฿5 (ครึ่งหนึ่ง) / u04 ลดได้ ฿0', async () => [sq[0] === 5 && sq[1] === 0, sq.join(' / ')]);
  let lp = await ctx.newPage(); await lp.goto(URL); await W(lp, 500);
  await T('SEED-03', 'ตั้งค่าทดสอบ', 'หน้าเข้าสู่ระบบบอก Point ของบัญชีทดลอง', 'เปิดหน้าเข้าสู่ระบบ', 'u01 20 Point … u04 0 Point', async () => { const t = await txt(lp, '#demo'); return [/u01 20 Point.*u04 0 Point/.test(t), t.slice(0, 90)]; });
  await lp.close();
  await E(() => { H.S.update('Users', 'U01', { bonus_points: '' }); }); // ชุดทดสอบเดิมเริ่ม u01 ที่ 0 Point

  // ===== บัญชี =====
  await T('ACC-01', 'บัญชี', 'ไม่มีบัญชีคนส่งแล้ว', 'ดูบัญชีทดลอง', 'มีแค่ผู้ใช้และแอดมิน',
    async () => { const r = await E(() => H.L.handle(null, 'demo', {}).accounts.map(a => a.role)); return [!r.includes('courier') && r.includes('admin') && r.includes('user'), [...new Set(r)].join(',')]; });
  await T('ACC-02', 'บัญชี', 'บัญชี c01 เดิมเข้าสู่ระบบไม่ได้', 'ล็อกอิน c01', 'ปฏิเสธ', async () => { const e = await E(() => H.err(() => H.tok('c01'))); return [e !== 'OK', e]; });

  // ===== หน้าร้าน =====
  let u = await login('u01');
  await T('HOME-01', 'หน้าแรก', 'หน้าแรกแบบหน้าร้านมีบริการ 4 แบบพร้อมราคาเริ่มต้น', 'ผู้ใช้เข้าสู่ระบบ', 'บริการ 4 การ์ด: ปกติ ฿10 / ด่วน ฿20 / เอกสาร ฿10 / อาหาร ฿15',
    async () => { const t = await u.locator('.svc').allInnerTexts(); const s = t.map(x => x.replace(/\s+/g, ' ')).join(' | '); return [t.length === 4 && /฿10.*฿20.*฿10.*฿15/.test(s), s.slice(0, 160)]; });
  await T('HOME-02', 'หน้าแรก', 'เมนูล่างของผู้ใช้', 'ดูเมนูล่าง', 'หน้าแรก / คำสั่งของฉัน / ของที่จะได้รับ / ฉัน',
    async () => { const t = (await u.locator('.tabbar button').allInnerTexts()).join('/'); return [t === 'หน้าแรก/คำสั่งของฉัน/ของที่จะได้รับ/ฉัน', t]; });
  await u.click('[data-svc=food]'); await W(u);
  await T('NEW-01', 'สั่งบริการ', 'กดการ์ดบริการแล้วเลือกแบบการส่งและประเภทของให้', 'กด "ส่งอาหาร / เครื่องดื่ม"', 'หัวข้อชื่อบริการ แบบปกติ ประเภทอาหาร ราคา ฿15',
    async () => { const h = await txt(u, '.crumb'); const it = await u.inputValue('[name=item_type]'); const tot = await txt(u, '#quote .tot'); return [h.includes('ส่งอาหาร') && it === 'อาหาร / เครื่องดื่ม' && tot.includes('฿15'), h + ' / ' + it + ' / ' + tot]; });
  await u.selectOption('[name=dropoff_zone]', 'อาคาร 5 (บัณฑิตวิทยาลัย)'); await u.click('label:has([name=mode][value=urgent])'); await W(u, 200);
  await T('NEW-02', 'สั่งบริการ', 'ราคาเปลี่ยนตามแบบการส่ง ระยะ และประเภทของ', 'เลือกด่วน + อาคาร 5 (ไกล) + อาหาร', 'ด่วน 20 + ไกล 5 + อาหาร 5 = ฿30 ปุ่มบอกยอด',
    async () => { const t = await txt(u, '#quote'); const btn = await txt(u, '#submit'); return [/฿20.*ระยะไกล.*฿5.*฿5.*฿30/.test(t) && btn.includes('฿30'), t.slice(0, 120) + ' / ' + btn]; });
  await T('NEW-03', 'สั่งบริการ', 'ยังไม่มี Point ใช้ส่วนลดไม่ได้', 'ดูสวิตช์ใช้ Point', 'สวิตช์ปิดใช้งาน',
    async () => [await u.locator('#usepts').isDisabled(), 'disabled=' + await u.locator('#usepts').isDisabled()]);
  await u.fill('[name=item_detail]', 'ข้าวกล่อง 1 กล่อง'); await u.setInputFiles('#photoin', require('path').resolve(__dirname, 'fixtures/p.jpg')); await W(u, 500);
  await u.fill('[name=recipient_name]', 'User U02'); await u.fill('[name=recipient_phone]', '0800000002'); await u.check('[name=recipient_consent]', { force: true }); await u.click('#submit'); await W(u, 800);
  const firstId = await E(() => H.S.list('Jobs')[0].id);
  await T('NEW-04', 'สั่งบริการ', 'ยืนยันคำสั่งแล้วได้เลขคำสั่งและสถานะรอยืนยัน', 'กรอกครบแล้วกดยืนยัน', 'เปิดหน้าคำสั่ง TMddmm-01 สถานะ "รอยืนยัน" ยอด ฿30',
    async () => { const j = await E(id => H.job(id), firstId); const b2 = await txt(u, '.badge'); return [/^TM\d{4}-01$/.test(j.id) && j.status === 'pending' && j.total === '30' && b2 === 'รอยืนยัน', j.id + ' / ' + j.status + ' / ฿' + j.total]; });
  await T('NEW-05', 'สั่งบริการ', 'ระบบไม่รับคำสั่งถ้ายอดที่หน้าเว็บแสดงไม่ตรง', 'ส่ง expect_total ผิด', 'ปฏิเสธ "ยอดชำระเปลี่ยนแล้ว"',
    async () => { const e = await E(() => H.err(() => H.mk({ f: { expect_total: 99 } }))); return [e.includes('ยอดชำระเปลี่ยนแล้ว'), e]; });
  await T('NEW-06', 'สั่งบริการ', 'แอดมินสั่งบริการไม่ได้', 'แอดมินเรียก create', 'ปฏิเสธ', async () => { const e = await E(() => H.err(() => H.mk({ sender: 'admin' }))); return [e.includes('เฉพาะผู้ใช้'), e]; });

  // ===== คำสั่งของฉัน =====
  await u.click('.tabbar [data-go=u-orders]'); await W(u);
  await T('ORD-01', 'คำสั่งของฉัน', 'แท็บสถานะ 6 แท็บ และนับคำสั่งรอยืนยัน', 'เปิด "คำสั่งของฉัน"', 'ทั้งหมด / รอยืนยัน 1 / รอรับของ / กำลังส่ง / สำเร็จ / ยกเลิก',
    async () => { const t = (await u.locator('.otabs button').allInnerTexts()).join('/'); return [t.replace(/\s+/g, '') === 'ทั้งหมด/รอยืนยัน1/รอรับของ/กำลังส่ง/สำเร็จ/ยกเลิก', t]; });
  await u.click('.otabs [data-t=delivered]'); await W(u);
  await T('ORD-02', 'คำสั่งของฉัน', 'กรองตามแท็บ', 'กดแท็บ "สำเร็จ"', 'ไม่มีคำสั่ง', async () => { const n = await u.locator('a.card.icard').count(); return [n === 0, n + ' รายการ']; });
  const c1 = await E(() => { const j = H.mk(); return [H.err(() => H.L.handle(H.tok('u01'), 'act', { id: j.id, action: 'cancel' })), H.job(j.id).status]; });
  await T('ORD-03', 'คำสั่งของฉัน', 'ผู้สั่งยกเลิกเองได้ก่อนไรเดอร์รับของ', 'ยกเลิกคำสั่งที่รอยืนยัน', 'สถานะยกเลิก', async () => [c1[0] === 'OK' && c1[1] === 'cancelled', c1.join(' / ')]);
  const c2 = await E(() => { const j = H.mk(); H.to(j.id, 'picked'); return H.err(() => H.L.handle(H.tok('u01'), 'act', { id: j.id, action: 'cancel' })); });
  await T('ORD-04', 'คำสั่งของฉัน', 'ไรเดอร์รับของแล้วผู้สั่งยกเลิกเองไม่ได้', 'ยกเลิกคำสั่งที่ร้านรับของแล้ว', 'ปฏิเสธ ให้แชทกับร้าน', async () => [c2.includes('แชทกับแอดมิน'), c2]);
  const c3 = await E(id => [H.err(() => H.L.handle(H.tok('u01'), 'act', { id, action: 'confirm' })), H.err(() => H.L.handle(H.tok('u03'), 'job', { id }))], firstId);
  await T('ORD-05', 'สิทธิ์', 'ผู้ใช้ทำขั้นตอนของแอดมินไม่ได้ และคนนอกดูคำสั่งไม่ได้', 'u01 กดยืนยันเอง / u03 เปิดคำสั่งของคนอื่น', 'ปฏิเสธทั้งสอง', async () => [c3[0].includes('เฉพาะแอดมิน') && c3[1].includes('ไม่มีสิทธิ์'), c3.join(' / ')]);
  const c4 = await E(() => { const id = H.mk({}).id; H.to(id, 'delivering'); const s = H.L.handle(H.tok('u01'), 'job', { id }).job, r = H.L.handle(H.tok('u02'), 'job', { id }).job, a = H.L.handle(H.tok('admin'), 'job', { id }).job;
    H.S.update('Jobs', id, { status: 'cancelled', cancelled_at: new Date().toISOString(), cancel_reason: 'admin' }); const after = H.L.handle(H.tok('u01'), 'job', { id }).job; return [!!s.code, !!r.code, !!a.code, !!after.code]; });
  await T('ORD-06', 'สิทธิ์', 'รหัสรับของ: ผู้สั่งเห็นเพื่อส่งต่อ ผู้รับที่มีบัญชีเห็น แอดมินไม่เห็น', 'เปิดคำสั่งที่กำลังนำส่งด้วย 3 บัญชี แล้วเปิดอีกครั้งหลังคำสั่งจบ', 'ผู้สั่งเห็น · ผู้รับเห็น · แอดมินไม่เห็น · คำสั่งจบแล้วไม่มีใครเห็น',
    async () => [c4[0] && c4[1] && !c4[2] && !c4[3], 'ผู้สั่ง=' + c4[0] + ' / ผู้รับ=' + c4[1] + ' / แอดมิน=' + c4[2] + ' / หลังจบ=' + c4[3]]);

  // ===== หลังร้าน =====
  let a = await login('admin');
  await T('ADM-01', 'หลังร้าน', 'แอดมินเข้าหน้าคำสั่งทั้งหมด', 'แอดมินเข้าสู่ระบบ', 'สรุป 4 ช่อง + แท็บสถานะ + เมนู คำสั่ง/แชท/ภาพรวม/ฉัน',
    async () => { const k = await u.locator('.kpis div').count(); const k2 = await a.locator('.kpis div').count(); const nav = (await a.locator('.tabbar button > span').allInnerTexts()).join('/'); return [k2 === 4 && nav === 'คำสั่ง/แชท/ภาพรวม/ฉัน', k2 + ' / ' + nav]; });
  await T('ADM-02', 'หลังร้าน', 'แท็บรอยืนยันมีปุ่มยืนยัน/ปฏิเสธ', 'ดูแท็บรอยืนยัน', 'การ์ดคำสั่งมีปุ่ม ยืนยันคำสั่ง',
    async () => { const n = await a.locator('[data-qact=confirm]').count(); return [n >= 1, n + ' ปุ่ม']; });
  await a.locator('.aord', { hasText: firstId }).locator('[data-qact=confirm]').click(); await W(a, 600);
  await T('ADM-03', 'หลังร้าน', 'กดยืนยันจากรายการได้เลย', 'กด "ยืนยันคำสั่ง"', 'สถานะ "รอรับของ"', async () => { const j = await E(id => H.job(id), firstId); return [j.status === 'confirmed' && !!j.confirmed_at, j.status]; });
  const r1 = await E(() => { const j = H.mk(); return [H.err(() => H.act(j.id, 'reject', { note: '' })), H.err(() => H.act(j.id, 'reject', { note: 'ของใหญ่เกิน' })), H.job(j.id).status, H.job(j.id).cancel_reason]; });
  await T('ADM-04', 'หลังร้าน', 'ปฏิเสธคำสั่งต้องระบุเหตุผล', 'ปฏิเสธโดยไม่ใส่/ใส่เหตุผล', 'ไม่ใส่ = ปฏิเสธ / ใส่ = ยกเลิก (rejected)', async () => [r1[0].includes('เหตุผล') && r1[1] === 'OK' && r1[3] === 'rejected', r1.join(' / ')]);
  await a.click('.otabs [data-t=confirmed]'); await W(a); await a.locator('.aord', { hasText: firstId }).locator('[data-job]').first().click(); await W(a, 700);
  await a.click('#pickupf .btn'); await W(a, 300);
  await T('ADM-05', 'หลังร้าน', 'รับของต้องถ่ายรูป', 'กดรับของโดยไม่แนบรูป', 'ไม่เปลี่ยนสถานะ', async () => { const j = await E(id => H.job(id), firstId); return [j.status === 'confirmed', j.status]; });
  await a.setInputFiles('#pkin', require('path').resolve(__dirname, 'fixtures/p.jpg')); await W(a, 500); await a.click('#pickupf .btn'); await W(a, 700);
  await T('ADM-06', 'หลังร้าน', 'รับของและเก็บเงินสด', 'แนบรูปแล้วกด "รับของและเก็บเงิน ฿30 แล้ว"', 'สถานะรับของแล้ว บันทึกเวลาชำระ', async () => { const j = await E(id => H.job(id), firstId); return [j.status === 'picked' && !!j.paid_at, j.status + ' / paid=' + !!j.paid_at]; });
  await a.click('[data-do=start]'); await W(a, 700);
  await T('ADM-07', 'หลังร้าน', 'เริ่มนำส่ง', 'กด "เริ่มนำส่ง"', 'สถานะกำลังนำส่ง', async () => { const j = await E(id => H.job(id), firstId); return [j.status === 'delivering', j.status]; });
  await a.setInputFiles('#dvin', require('path').resolve(__dirname, 'fixtures/p.jpg')); await W(a, 500);
  await a.fill('#code', '0000' === (await E(id => H.job(id).code, firstId)) ? '1111' : '0000'); await a.click('#deliver .btn'); await W(a, 700);
  await T('ADM-08', 'หลังร้าน', 'รหัสผิดบอกจำนวนครั้งที่เหลือ', 'ใส่รหัสผิด 1 ครั้ง', '"เหลืออีก 4 ครั้ง"', async () => { const t = await txt(a, '#err'); return [t.includes('เหลืออีก 4 ครั้ง'), t]; });
  await a.fill('#code', await E(id => H.job(id).code, firstId)); await a.click('#deliver .btn'); await W(a, 700);
  await T('ADM-09', 'หลังร้าน', 'ส่งถึงมือผู้รับแล้วผู้สั่งได้ Point อัตโนมัติ', 'ใส่รหัสถูก', 'สถานะสำเร็จ ได้ Point = ปกติ 2 + ไกล 2 → ด่วน 3 + ไกล 2 = 5', async () => { const j = await E(id => H.job(id), firstId); return [j.status === 'delivered' && j.points_earned === '5', j.status + ' / Point ' + j.points_earned]; });

  // ===== Point =====
  let up = await login('u01', true);
  await T('PT-01', 'Point', 'Popup แจ้ง Point เมื่อคำสั่งสำเร็จ', 'ผู้สั่งเปิดเว็บ', 'Popup "+5 Point"', async () => { await W(up, 1200); const t = await txt(up, '.rwpop'); return [t.includes('+5') && t.includes('Point'), t.slice(0, 60)]; });
  await up.click('.rwpop [data-rw=ok]'); await W(up, 400);
  const q = await E(() => H.L.handle(H.tok('u01'), 'quote', { mode: 'normal', dropoff_zone: 'อาคาร 3', item_type: 'เอกสาร / ชีท' }));
  await T('PT-02', 'Point', 'คำนวณส่วนลดสูงสุดจาก Point', 'มี 5 Point สั่งงานปกติ ฿10', 'ลดได้ ฿2 (ใช้ 4 Point) ไม่เกินครึ่ง', async () => [q.balance === 5 && q.max_discount === 2 && q.points_for_max === 4, 'คงเหลือ ' + q.balance + ' / ลด ฿' + q.max_discount + ' / ใช้ ' + q.points_for_max]);
  const p3 = await E(() => { const j = H.mk({ f: { use_points: 1, expect_total: 8 } }); const b1 = H.L.handle(H.tok('u01'), 'points', {}).balance;
    H.L.handle(H.tok('u01'), 'act', { id: j.id, action: 'cancel' }); const b2 = H.L.handle(H.tok('u01'), 'points', {}).balance; return [j.discount, j.total, j.points_used, b1, b2]; });
  await T('PT-03', 'Point', 'ใช้ Point ลดราคา และยกเลิกแล้วคืน Point', 'สั่งโดยเปิดใช้ Point แล้วยกเลิก', 'ลด ฿2 ยอด ฿8 ใช้ 4 Point → คงเหลือ 1 → ยกเลิกแล้วกลับเป็น 5', async () => [p3[0] === '2' && p3[1] === '8' && p3[3] === 1 && p3[4] === 5, p3.join(' / ')]);
  await up.click('.tabbar [data-go=u-home]'); await W(up); await up.click('[data-svc=normal]'); await W(up, 600);
  await up.selectOption('[name=dropoff_zone]', 'อาคาร 3'); await W(up, 200); await up.check('#usepts', { force: true }); await W(up, 300);
  await T('PT-04', 'Point', 'สวิตช์ใช้ Point ในหน้าสั่ง', 'เปิดสวิตช์ใช้ Point', 'แสดงส่วนลด −฿2 ยอด ฿8', async () => { const t = await txt(up, '#quote'); return [t.includes('−฿2') && /ยอดชำระ ฿8/.test(t), t.slice(0, 150)]; });
  await up.click('.tabbar [data-go=profile]'); await W(up); await up.click('[data-page=points]'); await W(up, 600);
  await T('PT-05', 'Point', 'หน้า Point ของฉันแสดงยอดและประวัติได้/ใช้/คืน', 'โปรไฟล์ → Point', 'คงเหลือ 5 ประวัติ 3 รายการ (+5, −4, +4)', async () => { const s = await txt(up, '.stat b'); const n = await up.locator('.crlist .lr').count(); return [s === '5' && n === 3, 'ยอด ' + s + ' / ' + n + ' รายการ']; });

  // ===== แชท =====
  const ch = await E(() => { const j = H.mk(); H.L.handle(H.tok('u01'), 'send', { id: j.id, text: 'ของถึงหรือยัง' }); const inbox = H.L.handle(H.tok('admin'), 'chat_inbox', {});
    H.L.handle(H.tok('admin'), 'send', { id: j.id, text: 'กำลังไปรับค่ะ', channel: 'sender' }); const m = H.L.handle(H.tok('u01'), 'messages', { id: j.id }).messages;
    const other = H.err(() => H.L.handle(H.tok('u03'), 'send', { id: j.id, text: 'x' })); return [inbox.rooms.length, inbox.unread, m.map(x => x.sender_name).join(','), other]; });
  await T('CHAT-01', 'แชท', 'ผู้ใช้แชทกับแอดมิน แอดมินเห็นในกล่องแชท', 'ผู้สั่งส่งข้อความ แอดมินตอบ', 'แอดมินเห็น 1 ห้อง ยังไม่อ่าน 1 · ข้อความตอบชื่อ "ร้าน TheungMue"', async () => [ch[0] === 1 && ch[1] === 1 && ch[2] === 'User U01,แอดมิน TheungMue', ch.slice(0, 3).join(' / ')]);
  await T('CHAT-02', 'แชท', 'คนนอกคำสั่งแชทไม่ได้', 'u03 ส่งข้อความ', 'ปฏิเสธ', async () => [ch[3].includes('ไม่มีสิทธิ์'), ch[3]]);
  await a.click('.tabbar [data-go=chats]'); await W(a, 700); await a.click('[data-tab=order]'); await W(a, 700);
  await T('CHAT-03', 'แชท', 'แท็บแชทของแอดมิน', 'แอดมินกดเมนู "แชท" แล้วเลือกแท็บ "ในคำสั่ง"', 'รายการห้องแชทของลูกค้า', async () => { const n = await a.locator('.conv').count(); return [n >= 1, n + ' ห้อง']; });

  // ===== ภาพรวม =====
  await a.click('.tabbar [data-go=a-home]'); await W(a, 700);
  const ov = await E(() => H.L.handle(H.tok('admin'), 'admin_overview', {}));
  await T('OV-01', 'ภาพรวม', 'ภาพรวมร้านสรุปรายรับและ Point', 'แอดมินเปิด "ภาพรวม"', 'รายรับ ฿30 (สำเร็จ 1) · Point ให้ลูกค้า 5', async () => { const t = await txt(a, '#app'); return [ov.revenue_all === 30 && ov.points_issued === 5 && t.includes('รายรับทั้งหมด'), 'รายรับ ' + ov.revenue_all + ' / Point ' + ov.points_issued]; });
  // ===== ค้นหาและซ่อนในคำสั่งของฉัน =====
  let us = await login('u01'); await us.click('.tabbar [data-go=u-orders]'); await W(us, 600);
  await T('SRCH-01', 'คำสั่งของฉัน', 'ช่องค้นหาอยู่บนสุด เหนือแท็บ และไม่มีปุ่มค้นหาด้านล่าง', 'เปิด "คำสั่งของฉัน"', 'ช่องค้นหาอยู่ก่อนแท็บ ไม่มีปุ่ม "ค้นหาและจัดการประวัติคำสั่ง"',
    async () => { const order = await us.evaluate(() => { const a = document.querySelector('#oq'), b = document.querySelector('.otabs'); return !!(a && b && (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)); }); const old = await us.locator('[data-hist=sent]:not(.h2link)').count(); return [order && old === 0, 'ค้นหาอยู่ก่อนแท็บ=' + order + ' / ปุ่มเดิม=' + old]; });
  const allN = await us.locator('a.card.icard').count(); await us.fill('#oq', 'อาคาร 3'); await W(us, 300);
  await T('SRCH-02', 'คำสั่งของฉัน', 'พิมพ์แล้วกรองรายการทันที', 'พิมพ์ "อาคาร 3"', 'เหลือเฉพาะคำสั่งที่ส่งถึงอาคาร 3 / พิมพ์คำที่ไม่มี ขึ้น "ไม่พบคำสั่ง"',
    async () => { const t = await us.locator('a.card.icard').allInnerTexts(); await us.fill('#oq', 'zzzz'); await W(us, 300); const e = await txt(us, '.empty'); await us.fill('#oq', ''); await W(us, 300);
      const want = await E(() => H.S.list('Jobs').filter(j => String(j.sender_id).toLowerCase() === 'u01' && j.dropoff_zone === 'อาคาร 3' && !j.hidden_by_sender).length);
      return [t.length === want && want >= 1 && t.every(x => x.includes('อาคาร 3')) && e.includes('ไม่พบคำสั่ง'), allN + ' (หน้าทั้งหมด) → ' + t.length + '/' + want + ' / ' + e]; });
  await us.click('.otabs [data-t=cancelled]'); await W(us, 400);
  const nC = await us.locator('a.card.icard').count(); await us.locator('[data-act=ohide]').first().click(); await W(us, 500);
  await T('SRCH-03', 'คำสั่งของฉัน', 'ซ่อนรายการได้ในแท็บยกเลิก และกดแสดงกลับได้', 'แท็บยกเลิก → "ซ่อนรายการ" → "แสดงรายการที่ซ่อนไว้"', 'รายการลดลง 1 / มีลิงก์แสดงที่ซ่อน / กดแล้วกลับมา',
    async () => { const n1 = await us.locator('a.card.icard').count(); await us.click('[data-act=ohid]'); await W(us, 300); const n2 = await us.locator('a.card.icard').count(); return [n1 === nC - 1 && n2 === nC, nC + ' → ' + n1 + ' → ' + n2]; });
  // ===== โปรไฟล์แอดมิน =====
  let ap = await login('admin'); await ap.click('.tabbar [data-go=profile]'); await W(ap, 600);
  await ap.screenshot({ path: require('path').resolve(__dirname, 'shots/a-profile.png'), fullPage: true });
  await T('APROF-01', 'โปรไฟล์แอดมิน', 'แอดมินไม่มีเมนู "ติดต่อแอดมิน" และ "ลบบัญชี"', 'แอดมินเปิดหน้าโปรไฟล์', 'ไม่มีทั้งสองเมนู', async () => { const t = await txt(ap, '#app'); return [!t.includes('ติดต่อแอดมิน') && !t.includes('ลบบัญชี'), 'ติดต่อแอดมิน=' + t.includes('ติดต่อแอดมิน') + ' / ลบบัญชี=' + t.includes('ลบบัญชี')]; });
  await T('APROF-02', 'โปรไฟล์แอดมิน', 'ผู้ใช้ยังมีเมนู "ติดต่อแอดมิน"', 'ผู้ใช้เปิดหน้าโปรไฟล์', 'มีเมนูติดต่อแอดมิน', async () => { const pu = await login('u03'); await pu.click('.tabbar [data-go=profile]'); await W(pu, 600); const t = await txt(pu, '#app'); await pu.close(); return [t.includes('ติดต่อแอดมิน'), t.includes('ติดต่อแอดมิน')]; });
  await ap.click('[data-page=resetpw]'); await W(ap, 500);
  await ap.fill('#rf [name=username]', 'u03'); await ap.click('#rf .btn'); await W(ap, 500);
  await ap.click('#doreset'); await W(ap, 200); await ap.click('#doreset'); await W(ap, 600);
  await ap.screenshot({ path: require('path').resolve(__dirname, 'shots/a-reset.png'), fullPage: true });
  const temp = (await txt(ap, '.codecard .code')).replace(/\s/g, '');
  await T('APROF-03', 'โปรไฟล์แอดมิน', 'รีเซ็ตรหัสผ่านให้ผู้ใช้จากหน้าโปรไฟล์', 'โปรไฟล์ → รีเซ็ตรหัสผ่านให้ผู้ใช้ → ค้นหา u03 → กดรีเซ็ต 2 ครั้ง', 'ได้รหัสชั่วคราว u03 เข้าด้วยรหัสนี้แล้วถูกบังคับตั้งรหัสใหม่',
    async () => { const r = await E(p => { const x = H.L.handle(null, 'login', { username: 'u03', password: p }); return x.me.must_change; }, temp); return [temp.length >= 6 && r === true, 'รหัสชั่วคราว ' + temp.length + ' ตัว / ต้องตั้งใหม่=' + r]; });
  await ap.click('.tabbar [data-go=a-home]'); await W(ap, 600);
  await T('APROF-04', 'โปรไฟล์แอดมิน', 'ย้ายรีเซ็ตรหัสผ่านออกจากหน้าภาพรวม', 'เปิดภาพรวม', 'ไม่มีส่วนรีเซ็ตรหัสผ่าน', async () => { const t = await txt(ap, '#app'); return [!t.includes('รีเซ็ตรหัสผ่าน'), t.includes('รีเซ็ตรหัสผ่าน')]; });
  await T('ERR-00', 'ทั่วไป', 'ไม่มีข้อผิดพลาด JavaScript', 'ตลอดการทดสอบ', 'ไม่มี', async () => [errs.length === 0, errs.join(' | ') || 'ไม่มี']);
  fs.writeFileSync(require('path').resolve(__dirname, 'shots/results.json'), JSON.stringify(R, null, 1));
  await b.close();
})();
