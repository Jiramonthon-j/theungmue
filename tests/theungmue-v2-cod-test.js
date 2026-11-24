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
  b = await chromium.launch(); ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Bangkok' });
  seed = await ctx.newPage(); seed.on('pageerror', e => errs.push('seed: ' + e.message)); await seed.goto(URL); await seed.evaluate(HELP); await E(() => H.reset());
  const bal = u => E(u => H.L.handle(H.tok(u), 'points', {}).balance, u);
  // ===== เก็บเงินปลายทาง: สั่ง =====
  let u = await login('u01'); await u.click('[data-svc=normal]'); await W(u);
  await u.selectOption('[name=item_type]', 'เอกสาร / ชีท'); await u.fill('[name=item_detail]', 'รายงานกลุ่ม'); await u.setInputFiles('#photoin', require('path').resolve(__dirname, 'fixtures/p.jpg')); await W(u);
  await u.selectOption('[name=dropoff_zone]', 'อาคาร 22'); await u.selectOption('[name=recipient_id]', 'U02');
  await T('COD-01', 'เก็บเงินปลายทาง', 'หน้าสั่งมีวิธีชำระ 2 แบบ', 'เปิดหน้าสั่งบริการ', 'จ่ายตอนฝากของ (เลือกไว้) / เก็บเงินปลายทาง',
    async () => { const t = (await u.locator('#paypick label').allInnerTexts()).map(x => x.split('\n')[0]); const v = await u.inputValue('[name=pay_method]:checked'); return [t.length === 2 && t[0].includes('จ่ายตอนฝากของ') && t[1].includes('เก็บเงินปลายทาง') && v === 'sender', t.join(' / ')]; });
  await u.click('#paypick label:nth-child(2)'); await W(u, 300); await u.screenshot({ path: SH + 'cod-1-form.png', fullPage: true });
  await T('COD-02', 'เก็บเงินปลายทาง', 'เลือกเก็บเงินปลายทาง ผู้สั่งใช้ Point ไม่ได้', 'คลิก "เก็บเงินปลายทาง"', 'ไม่มีสวิตช์ Point ขึ้น "Point ใช้ได้เฉพาะคนที่จ่าย" ยอด ฿13 ปุ่ม "ยืนยันคำสั่ง · เก็บเงินปลายทาง"',
    async () => { const t = await txt(u, '#quote'); const n = await u.locator('#usepts').count(); const btn = await txt(u, '#submit'); return [n === 0 && t.includes('ใช้ได้เฉพาะคนที่จ่าย') && t.includes('฿13') && btn.includes('เก็บเงินปลายทาง'), t.slice(0, 80) + ' / ' + btn]; });
  await u.click('#submit'); await W(u, 900); const cid = await E(() => H.S.list('Jobs')[0].id);
  await u.screenshot({ path: SH + 'cod-2-sender-wait.png', fullPage: true });
  await T('COD-03', 'เก็บเงินปลายทาง', 'ผู้สั่งเห็นสถานะรอผู้รับยอมรับ และ Point ไม่ถูกใช้', 'กดยืนยันคำสั่ง', 'แถบ "รอ User U02 ยอมรับชำระ" ยอดผู้รับชำระ ฿13 Point ผู้สั่งยังเป็น 20',
    async () => { const t = await txt(u, '#main'); const pb = await bal('u01'); return [t.includes('รอ User U02 ยอมรับชำระ') && t.includes('ผู้รับชำระ (เงินสด) ฿13') && pb === 20, 'Point ผู้สั่ง ' + pb]; });
  let a = await login('admin');
  await T('COD-04', 'เก็บเงินปลายทาง', 'ร้านยืนยันไม่ได้จนกว่าผู้รับยอมรับ', 'แอดมินดูแท็บรอยืนยัน + เรียก confirm', 'ปุ่มยืนยันกดไม่ได้ มีป้าย "รอผู้รับยอมรับชำระ" / ระบบปฏิเสธ',
    async () => { const dis = await a.locator('.aord', { hasText: cid }).locator('[data-qact=confirm]').isDisabled(); const t = await txt(a, '.aord'); const e = await E(id => H.err(() => H.act(id, 'confirm')), cid); return [dis && t.includes('รอผู้รับยอมรับชำระ') && e.includes('ต้องรอผู้รับ'), 'disabled=' + dis + ' / ' + e]; });
  let r = await login('u02');
  await T('COD-05', 'เก็บเงินปลายทาง', 'ผู้รับเห็นการ์ดเตือนที่หน้าแรก', 'ผู้รับเข้าสู่ระบบ', '"มีคำสั่งรอคุณยอมรับชำระ 1 รายการ"', async () => { const t = await txt(r, '.remind'); return [t.includes('รอคุณยอมรับชำระ 1'), t.slice(0, 60)]; });
  await r.click('.remind'); await W(r, 1000); await r.screenshot({ path: SH + 'cod-3-recipient.png', fullPage: true });
  await T('COD-06', 'เก็บเงินปลายทาง', 'ผู้รับเลือกใช้ Point ของตัวเองได้', 'เปิดคำสั่ง', 'การ์ดยอด ฿7 (ใช้ 12 Point ลด ฿6) ปุ่ม "ยอมรับชำระ ฿7"', async () => { const t = await txt(r, '#codcard'); return [t.includes('฿7') && t.includes('ใช้ 12 Point') && (await txt(r, '#codok')) === 'ยอมรับชำระ ฿7', t.slice(0, 120)]; });
  await r.$eval('#codpts', e => e.click()); await W(r, 300);
  const off = await txt(r, '#codok'); await r.$eval('#codpts', e => e.click()); await W(r, 300);
  await T('COD-07', 'เก็บเงินปลายทาง', 'ปิดสวิตช์ Point แล้วยอดกลับเป็นราคาเต็ม', 'ปิด/เปิดสวิตช์', 'ปิด = ฿13 / เปิด = ฿7', async () => [off === 'ยอมรับชำระ ฿13' && (await txt(r, '#codok')) === 'ยอมรับชำระ ฿7', off]);
  await r.click('#codok'); await W(r, 900);
  await T('COD-08', 'เก็บเงินปลายทาง', 'ยอมรับแล้ว ราคาล็อก Point ผู้รับถูกใช้', 'กด "ยอมรับชำระ ฿7"', 'ยอด ฿7 ผู้จ่าย = U02 Point U02 เหลือ 8 · มี "ถอนการยอมรับ"',
    async () => { const j = await E(id => H.job(id), cid); const pb = await bal('u02'); const t = await txt(r, '.payline'); return [j.total === '7' && j.payer_id === 'U02' && pb === 8 && t.includes('ถอนการยอมรับ'), j.total + ' / ' + j.payer_id + ' / ' + pb]; });
  await a.reload(); await W(a, 800); await a.locator('.aord', { hasText: cid }).locator('[data-qact=confirm]').click(); await W(a, 700);
  await a.click('.otabs [data-t=confirmed]'); await W(a); await a.locator('.aord', { hasText: cid }).locator('[data-job]').first().click(); await W(a, 800);
  await T('COD-09', 'เก็บเงินปลายทาง', 'รับของไม่ต้องเก็บเงินผู้สั่ง', 'แอดมินเปิดขั้นรับของ', 'ปุ่ม "รับของแล้ว (เก็บเงินปลายทาง ฿7)"', async () => { const t = await txt(a, '#pickupf .btn'); return [t === 'รับของแล้ว (เก็บเงินปลายทาง ฿7)', t]; });
  await a.setInputFiles('#pkin', require('path').resolve(__dirname, 'fixtures/p.jpg')); await W(a); await a.click('#pickupf .btn'); await W(a, 700); await a.click('[data-do=start]'); await W(a, 700);
  await a.setInputFiles('#dvin', require('path').resolve(__dirname, 'fixtures/p.jpg')); await W(a); await a.fill('#code', await E(id => H.job(id).code, cid));
  await a.screenshot({ path: SH + 'cod-4-admin-deliver.png', fullPage: true });
  await a.click('#deliver .btn'); await W(a, 700);
  await T('COD-10', 'เก็บเงินปลายทาง', 'ต้องติ๊กเก็บเงินก่อนปิดงาน', 'กดยืนยันโดยไม่ติ๊ก', 'ขึ้น "ติ๊ก เก็บเงินสดจากผู้รับแล้ว ก่อนยืนยัน"', async () => { const t = await txt(a, '#err'); return [t.includes('ติ๊ก'), t]; });
  await a.setInputFiles('#dvin', require('path').resolve(__dirname, 'fixtures/p.jpg')).catch(() => {}); await W(a); await a.fill('#code', await E(id => H.job(id).code, cid)); await a.click('.codchk'); await a.click('#deliver .btn'); await W(a, 800);
  await T('COD-11', 'เก็บเงินปลายทาง', 'ส่งสำเร็จ Point เข้าบัญชีผู้รับ (คนจ่าย)', 'ติ๊กแล้วยืนยัน', 'สำเร็จ บันทึกเวลาชำระ ผู้รับ 8 → 11 ผู้สั่งยังเป็น 20',
    async () => { const j = await E(id => H.job(id), cid); const p2 = await bal('u02'), p1 = await bal('u01'); return [j.status === 'delivered' && !!j.paid_at && p2 === 11 && p1 === 20, j.status + ' / u02 ' + p2 + ' / u01 ' + p1]; });
  const d1 = await E(() => { const j = H.cod(); H.L.handle(H.tok('u02'), 'act', { id: j, action: 'cod_decline' }); return [H.job(j).status, H.job(j).cancel_reason]; });
  await T('COD-12', 'เก็บเงินปลายทาง', 'ผู้รับปฏิเสธก่อนร้านยืนยัน ไม่มีบทลงโทษ', 'ผู้รับกด "ปฏิเสธ ไม่ชำระ"', 'ยกเลิก (cod_declined) ไม่หัก Point', async () => [d1[0] === 'cancelled' && d1[1] === 'cod_declined', d1.join(' / ')]);
  const d2 = await E(() => { const b0 = H.L.handle(H.tok('u02'), 'points', {}).balance; const j = H.cod(); H.racc(j); const b1 = H.L.handle(H.tok('u02'), 'points', {}).balance; H.act(j, 'confirm'); H.L.handle(H.tok('u02'), 'act', { id: j, action: 'cod_withdraw' }); return [b0, b1, H.L.handle(H.tok('u02'), 'points', {}).balance, H.job(j).cancel_reason]; });
  await T('COD-13', 'เก็บเงินปลายทาง', 'ผู้รับถอนการยอมรับก่อนร้านรับของ ได้ Point คืน', 'ยอมรับ (ใช้ Point) → ร้านยืนยัน → ถอน', 'Point ลดตอนยอมรับ แล้วกลับเท่าเดิมหลังถอน · ยกเลิก (cod_withdrawn)', async () => [d2[1] < d2[0] && d2[2] === d2[0] && d2[3] === 'cod_withdrawn', d2.join(' / ')]);
  // ===== ไม่รับของระหว่างทาง + โต้แย้ง =====
  const fid = await E(() => { const j = H.cod(); H.racc(j); H.to(j, 'delivering'); H.seen(); return j; });
  await r.close(); r = await login('u02', true); await W(r, 600); while (await r.locator('.rwpop').count()) { await r.click('.rwpop [data-rw=ok]'); await W(r, 400); }
  await r.click('.tabbar [data-go=u-incoming]'); await W(r); await r.click('[data-job="' + fid + '"]'); await W(r, 900);
  await r.click('details.refuse > summary'); await W(r, 300); await r.screenshot({ path: SH + 'ref-1-recipient.png', fullPage: true });
  await T('REF-01', 'ไม่รับของ', 'ผู้รับไม่รับของระหว่างทาง เห็นผลของแต่ละเหตุผลก่อนกด', 'กำลังนำส่ง → "ไม่รับของ"', 'เปลี่ยนใจ / ไม่สะดวกจ่าย = หัก 5 Point · ส่งผิดคน = ไม่หัก · มีปุ่มขอเลื่อนเวลา',
    async () => { const t = (await r.locator('#refusef .rsn').allInnerTexts()).join(' | ').replace(/\s+/g, ' '); const post = await r.locator('[data-room=recipient]', { hasText: 'ขอเลื่อนเวลา' }).count(); return [/เปลี่ยนใจ.*หัก 5 Point/.test(t) && /ส่งผิดคน.*ไม่หัก/.test(t) && post === 1, t]; });
  await r.click('#refusef .rsn:has([value=changed_mind])'); await r.click('#refusef .btn'); await W(r, 200); await r.click('#refusef .btn'); await W(r, 1500);
  await r.screenshot({ path: SH + 'ref-2-popup.png', fullPage: true });
  await T('REF-02', 'ไม่รับของ', 'ยืนยันแล้ว หัก Point และขึ้นแจ้งเตือน', 'เลือก "เปลี่ยนใจ" กดยืนยัน 2 ครั้ง', 'ยกเลิก ความผิดผู้รับ หัก 5 · Popup "ปฏิเสธครั้งที่ 1 จาก 2"',
    async () => { const j = await E(id => H.job(id), fid); const t = await txt(r, '.rwpop'); return [j.status === 'cancelled' && j.fail_fault === 'recipient' && j.penalty_points === '5' && t.includes('ครั้งที่ 1 จาก 2'), j.penalty_points + ' / ' + t.slice(0, 80)]; });
  const before = await bal('u02');
  await r.click('.rwpop [data-rw=job]'); await W(r, 900); await r.fill('#appealf textarea', 'ของที่มาไม่ตรงกับที่ตกลง'); await r.click('#appealf .btn'); await W(r, 800);
  await T('REF-03', 'ไม่รับของ', 'ยื่นโต้แย้งจาก Popup ได้', 'กด "แจ้งว่าไม่ถูกต้อง" → เขียนเหตุผล → ยื่น', 'สถานะ "ยื่นโต้แย้งแล้ว รอแอดมินตรวจ"', async () => { const t = await txt(r, '#main'); return [t.includes('ยื่นโต้แย้งแล้ว รอแอดมินตรวจ'), t.includes('ยื่นโต้แย้งแล้ว')]; });
  await a.click('.tabbar [data-go=a-orders]'); await W(a, 800); await a.click('.otabs [data-t=cancelled]'); await W(a, 800);
  await T('REF-04', 'ไม่รับของ', 'แอดมินเห็นคำโต้แย้งในแท็บยกเลิก', 'เปิดคำสั่ง แท็บยกเลิก', 'การ์ด ' + fid + ' มีป้าย "รอตรวจโต้แย้ง"', async () => { const t = await txt(a, '.icard[data-job="' + fid + '"]'); return [t.includes('รอตรวจโต้แย้ง'), t.slice(0, 80)]; });
  await a.click('.icard[data-job="' + fid + '"]'); await W(a, 900); await a.screenshot({ path: SH + 'ref-3-admin-appeal.png', fullPage: true });
  await a.click('[data-do=appeal_revoked]'); await W(a, 200); await a.click('[data-do=appeal_revoked]'); await W(a, 800);
  await T('REF-05', 'ไม่รับของ', 'แอดมินยกเลิกบทลงโทษ คืน Point และไม่นับครั้งนี้', 'กด "ยกเลิกบทลงโทษ" 2 ครั้ง', 'Point ผู้รับ +5 · นับการปฏิเสธ 0',
    async () => { const pb = await bal('u02'); const rf = await E(() => H.L.handle(H.tok('u02'), 'points', {}).refusals.recent); return [pb === before + 5 && rf === 0, before + ' → ' + pb + ' / ปฏิเสธ ' + rf]; });
  // ไม่พบผู้รับ
  const nf = await E(() => { const j = H.cod({ recipient_id: 'U03' }); H.racc(j, 'u03'); H.to(j, 'delivering'); return j; });
  await a.click('.tabbar [data-go=a-orders]'); await W(a); await a.click('.otabs [data-t=active]'); await W(a); await a.locator('.aord', { hasText: nf }).locator('[data-job]').first().click(); await W(a, 800);
  await a.click('[data-do=arrive]'); await W(a, 700); await a.click('[data-do=contact_call]'); await W(a, 600); await a.click('[data-do=contact_chat]'); await W(a, 600);
  await a.click('.failbox > summary'); await W(a, 300); await a.click('#failf .rsn:has([value=not_found])'); await a.setInputFiles('#flin', require('path').resolve(__dirname, 'fixtures/p.jpg')); await W(a, 500); await a.click('#failf .btn'); await W(a, 700);
  await a.screenshot({ path: SH + 'ref-4-notfound.png', fullPage: true });
  await T('REF-06', 'ไม่รับของ', 'ไม่พบผู้รับ: ต้องติดต่อและรอครบก่อน', 'ถึงจุดส่ง → โทร 1 ครั้ง → แชท → บันทึกไม่พบผู้รับทันที', 'ปฏิเสธ "ยังทำขั้นตอนไม่ครบ: โทร 1/2 · แชท 1/1 · รอ 0/10 นาที"', async () => { const t = await txt(a, '#err'); return [/โทร 1\/2.*แชท 1\/1.*รอ 0\/10/.test(t), t]; });
  const nf2 = await E(id => { const ago = m => new Date(Date.now() - m * 60000).toISOString(); H.S.update('Jobs', id, { arrived_at: ago(12), contact_log: JSON.stringify([{ k: 'call', t: ago(11) }, { k: 'chat', t: ago(11) }, { k: 'call', t: ago(5) }]) });
    H.L.handle(H.tok('admin'), 'act', { id, action: 'fail', code: 'not_found', photos: { list: H.ph } }); return H.job(id); }, nf);
  await T('REF-07', 'ไม่รับของ', 'ครบขั้นตอนแล้วบันทึกไม่พบผู้รับได้', 'ถึง 12 นาที โทร 2 ครั้งห่าง 6 นาที แชท 1', 'ยกเลิก ความผิดผู้รับ หัก Point', async () => [nf2.status === 'cancelled' && nf2.fail_fault === 'recipient' && Number(nf2.penalty_points) > 0, nf2.fail_reason + ' / ' + nf2.penalty_points]);
  const dm = await E(() => { const j = H.cod({ recipient_id: 'U03' }); H.racc(j, 'u03'); H.to(j, 'delivering'); const e1 = H.err(() => H.L.handle(H.tok('admin'), 'act', { id: j, action: 'fail', code: 'item_damaged', note: 'กล่องบุบ', photos: { list: H.ph } }));
    H.L.handle(H.tok('admin'), 'act', { id: j, action: 'fail', code: 'item_damaged', note: 'กล่องบุบ ทำตกระหว่างทาง', photos: { list: H.ph, verdict: 'shop' } }); return [e1, H.job(j).fail_fault, H.job(j).penalty_user || '-']; });
  await T('REF-08', 'ไม่รับของ', 'ของเสียหาย: ต้องเลือกคนผิดจากรูป 3 ช่วง', 'บันทึกโดยไม่เลือกคนผิด / เลือก "ร้าน"', 'ไม่เลือก = ปฏิเสธ · ร้านผิด = ไม่หักใคร', async () => [dm[0].includes('ความผิดของใคร') && dm[1] === 'shop' && dm[2] === '-', dm.join(' / ')]);
  // แบน
  const bn = await E(() => { for (let i = 0; i < 2; i++) { const j = H.cod({ recipient_id: 'U04' }); H.racc(j, 'u04'); H.to(j, 'delivering'); H.L.handle(H.tok('u04'), 'act', { id: j, action: 'refuse', code: 'cannot_pay' }); }
    return [H.L.handle(H.tok('u04'), 'points', {}).refusals, H.err(() => H.cod({ recipient_id: 'U04' })), H.err(() => H.mk({ f: { recipient_id: 'U04' } }))]; });
  await T('REF-09', 'ไม่รับของ', 'ปฏิเสธครบ 2 ครั้ง ระงับการรับปลายทาง 30 วัน', 'u04 ปฏิเสธ 2 ครั้ง แล้วสั่งปลายทางถึง u04', 'สั่งปลายทางไม่ได้ / สั่งแบบจ่ายตอนฝากได้ · u04 มี 0 Point จึงไม่ติดลบ',
    async () => [bn[0].recent === 2 && !!bn[0].ban_until && bn[1].includes('ไม่ได้ชั่วคราว') && bn[2] === 'OK' && (await bal('u04')) === 0, 'ปฏิเสธ ' + bn[0].recent + ' / ' + bn[1].slice(0, 40) + ' / ' + bn[2]]);
  await u.goto(URL); await W(u, 800); await u.click('[data-svc=normal]'); await W(u); await u.selectOption('[name=recipient_id]', 'U04'); await u.click('#paypick label:nth-child(2)'); await W(u, 300);
  const rcp = await E(() => JSON.stringify(H.L.handle(H.tok('u01'), 'recipients', {}).users));
  await T('REF-10', 'ไม่รับของ', 'ไม่เปิดเผยว่าใครถูกระงับรับปลายทาง (แจ้งตอนกดสั่งแทน)', 'เลือกผู้รับ u04 ที่ถูกระงับ + เก็บเงินปลายทาง', 'หน้าสั่งไม่บอกล่วงหน้า · รายชื่อผู้รับไม่มีข้อมูลการถูกระงับ · ระบบปฏิเสธตอนสร้างคำสั่ง (REF-09)',
    async () => { const t = await u.locator('#payerr').innerText(); return [t === '' && !rcp.includes('cod_ban'), 'payerr="' + t + '" · ' + rcp.slice(0, 80)]; });
  // ===== ส่งช้า =====
  const lt = await E(() => { const j = H.mk({ sender: 'u03', f: { recipient_id: 'U01' } }); H.to(j, 'delivering'); const b0 = H.L.handle(H.tok('u03'), 'points', {}).balance;
    H.S.update('Jobs', j, { due_at: new Date(Date.now() - 15 * 60000).toISOString() }); H.act(j, 'deliver', { code: H.job(j).code }); return [H.job(j).late_min, H.job(j).comp_points, H.L.handle(H.tok('u03'), 'points', {}).balance - b0]; });
  await T('LATE-01', 'ส่งช้า', 'ช้าเกิน 10 นาที ชดเชย +2 ให้คนที่จ่าย', 'ส่งหลังกำหนด 15 นาที (ผู้สั่งจ่าย)', 'late 15 · comp 2 · ผู้สั่งได้ +2+2 (สำเร็จ + ชดเชย)', async () => [lt[0] === '15' && lt[1] === '2' && lt[2] === 4, lt.join(' / ')]);
  const ex = await E(() => { const j = H.mk({ f: { recipient_id: 'U03' } }); H.to(j, 'delivering'); H.act(j, 'arrive'); const due = new Date(Date.now() - 20 * 60000).toISOString(); H.S.update('Jobs', j, { arrived_at: new Date(Date.now() - 25 * 60000).toISOString(), due_at: due });
    H.act(j, 'deliver', { code: H.job(j).code }); return [H.job(j).late_excused, H.job(j).comp_points || '0']; });
  await T('LATE-02', 'ส่งช้า', 'ถึงก่อนกำหนดแต่ผู้รับไม่อยู่ ไม่นับว่าส่งช้า', 'ถึงจุดส่งก่อนกำหนด ส่งได้หลังกำหนด 20 นาที', 'excused · ไม่ชดเชย', async () => [ex[0] === '1' && ex[1] === '0', ex.join(' / ')]);
  const fr = await E(() => { const j = H.cod({ recipient_id: 'U03' }); H.racc(j, 'u03', false); H.to(j, 'delivering'); const e1 = H.err(() => H.L.handle(H.tok('u03'), 'act', { id: j, action: 'refuse', code: 'late' }));
    H.S.update('Jobs', j, { due_at: new Date(Date.now() - 35 * 60000).toISOString() }); H.L.handle(H.tok('u03'), 'act', { id: j, action: 'refuse', code: 'late' }); return [e1, H.job(j).fail_fault, H.job(j).penalty_user || '-']; });
  await T('LATE-03', 'ส่งช้า', 'ปลายทาง: เลยกำหนดเกิน 30 นาที ผู้รับปฏิเสธได้โดยไม่ถูกหัก', 'เลือก "ร้านส่งช้า" ก่อน/หลังเลย 30 นาที', 'ก่อน = ปฏิเสธ · หลัง = ร้านผิด ไม่หัก', async () => [fr[0].includes('30 นาที') && fr[1] === 'shop' && fr[2] === '-', fr.join(' / ')]);
  const ov = await E(() => H.L.handle(H.tok('admin'), 'admin_overview', {}));
  await a.click('.tabbar [data-go=a-home]'); await W(a, 800); await a.screenshot({ path: SH + 'ov.png', fullPage: true });
  await T('LATE-04', 'ส่งช้า', 'ภาพรวมแสดงอัตราส่งทันกำหนดและสาเหตุส่งไม่สำเร็จ', 'แอดมินเปิดภาพรวม', 'มี "ส่งทันกำหนด" % และ "สาเหตุ ผู้รับ / ผู้สั่ง / TheungMue"',
    async () => { const t = await txt(a, '#app'); return [t.includes('ส่งทันกำหนด') && t.includes('สาเหตุ ผู้รับ / ผู้สั่ง / TheungMue') && ov.ontime_pct !== null, 'ทันกำหนด ' + ov.ontime_pct + '% / ช้า ' + ov.late_count + ' / ไม่สำเร็จ ' + JSON.stringify(ov.fail_by)]; });
  const sl = await E(() => { const j = H.mk({ f: { mode: 'urgent', deadline: new Date(Date.now() + 60 * 60000).toISOString() } }); H.S.update('Jobs', j, { created_at: new Date(Date.now() - 12 * 60000).toISOString(), due_at: new Date(Date.now() + 10 * 60000).toISOString() }); return j; });
  await a.click('.tabbar [data-go=a-orders]'); await W(a); await a.click('.otabs [data-t=pending]'); await W(a);
  await T('LATE-05', 'ส่งช้า', 'แอดมินเห็นงานด่วนที่รอยืนยันนานและใกล้กำหนด', 'งานด่วนรอ 12 นาที เหลือ 10 นาที', 'การ์ดขึ้นบนสุด ขอบแดง "รอยืนยันมา 12 นาที" + ป้าย "ใกล้กำหนด"',
    async () => { const first = await a.locator('.aord').first().innerText(); return [first.includes(sl) && first.includes('รอยืนยันมา 12 นาที') && first.includes('ใกล้กำหนด'), first.replace(/\s+/g, ' ').slice(0, 120)]; });
  await T('ERR-00', 'ทั่วไป', 'ไม่มีข้อผิดพลาด JavaScript', 'ตลอดการทดสอบ', 'ไม่มี', async () => [errs.length === 0, errs.join(' | ') || 'ไม่มี']);
  fs.writeFileSync(require('path').resolve(__dirname, 'shots/cod-results.json'), JSON.stringify(R, null, 1));
  await b.close();
})();
