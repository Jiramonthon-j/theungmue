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
    mk(o) { o = o || {}; return this.L.handle(this.tok(o.sender || 'u01'), 'create', Object.assign({ item_type: 'เอกสาร / ชีท', item_detail: 'เอกสารทดสอบ', dropoff_zone: 'อาคาร 3', recipient_id: 'U02', mode: 'normal', photos: this.ph }, o.f || {})).job.id; },
    job(id) { return this.S.list('Jobs').find(x => x.id === id); },
    act(id, action, extra) { return this.L.handle(this.tok('admin'), 'act', Object.assign({ id, action, photos: this.ph }, extra || {})).job; },
    cod(f) { return this.mk({ f: Object.assign({ pay_method: 'cod', cod_agreed: 1 }, f || {}) }); },
    racc(id, u, pts) { return this.L.handle(this.tok(u || 'u02'), 'act', { id, action: 'cod_points', note: pts === false ? '' : 'use_points' }).job; },
    to(id, stage) { const seq = ['confirm', 'pickup', 'start', 'deliver']; const n = { confirmed: 1, picked: 2, delivering: 3, delivered: 4 }[stage];
      for (let i = 0; i < n; i++) this.act(id, seq[i], seq[i] === 'deliver' ? { code: this.job(id).code, note: 'cod_collected' } : {}); return id; },
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


const SH = require('path').resolve(__dirname, 'shots') + '/'; fs.mkdirSync(SH, { recursive: true });
async function openJob(p, id) { await p.evaluate(id => { const a = document.createElement('a'); a.setAttribute('data-job', id); document.getElementById('app').appendChild(a); a.click(); a.remove(); }, id); await W(p, 900); }
async function goNav(p, go) { if (!(await p.locator('.tabbar').isVisible().catch(() => false))) { await p.reload(); await W(p, 1200); } await p.click('.tabbar [data-go=' + go + ']'); await W(p, 800); }
(async () => {
  b = await chromium.launch(); ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Bangkok', acceptDownloads: true });
  seed = await ctx.newPage(); seed.on('pageerror', e => errs.push('seed: ' + e.message)); await seed.goto(URL); await seed.evaluate(HELP); await E(() => H.reset());
  const J = await E(() => {
    const o = {}, L = H.L, A = H.tok('admin'), ago = m => new Date(Date.now() - m * 60000).toISOString();
    o.pend = H.mk({}); o.pend2 = H.mk({ sender: 'u03', f: { recipient_id: 'U04' } });
    o.done = H.mk({}); H.to(o.done, 'delivered');
    o.pick = H.mk({}); H.to(o.pick, 'picked');
    o.deli = H.mk({}); H.to(o.deli, 'delivering');
    o.codDone = H.cod({ recipient_id: 'U03' }); H.racc(o.codDone, 'u03', false); H.to(o.codDone, 'delivered');
    o.ap = H.cod({}); H.nf(o.ap); // ผู้รับไม่มารับ → ผู้สั่งค้างค่าส่ง
    o.shop = H.mk({}); H.to(o.shop, 'delivering'); H.act(o.shop, 'arrive'); L.handle(A, 'act', { id: o.shop, action: 'fail', code: 'item_damaged', note: 'บุบ', photos: { list: H.ph, verdict: 'shop' } });
    o.old = H.mk({}); H.to(o.old, 'picked'); L.handle(A, 'act', { id: o.old, action: 'cancel', note: 'ทดสอบเก่า' }); H.S.update('Jobs', o.old, { cancelled_at: ago(4 * 1440) });
    o.rej = H.mk({}); L.handle(A, 'act', { id: o.rej, action: 'reject', note: 'ของผิดประเภท' });
    L.handle(H.tok('u01'), 'send', { id: o.pend, text: 'ขอเปลี่ยนเวลาได้ไหม' }); L.handle(H.tok('u01'), 'send', { id: o.deli, text: 'ถึงไหนแล้ว' });
    L.handle(H.tok('u02'), 'bot_send', { text: 'ของเสียหาย อยากได้เงินคืน' });
    H.seen(); return o;
  });
  let a = await login('admin', true); await W(a, 1500);
  const badge = async go => (await a.locator('.tabbar [data-go=' + go + '] .navbadge').count()) ? (await txt(a, '.tabbar [data-go=' + go + '] .navbadge')) : '0';
  await T('AD-01', 'เมนูล่าง', 'ตัวเลขแชทรวมข้อความในคำสั่ง · คำสั่งมีตัวเลขรอยืนยัน', 'แอดมินเข้าสู่ระบบ (รอแอดมิน 1 · ข้อความในคำสั่ง 2 · รอยืนยัน 2)', 'แชท 3 · คำสั่ง 2', async () => { const c = await badge('chats'), o = await badge('a-orders'); return [c === '3' && o === '2', 'แชท ' + c + ' · คำสั่ง ' + o]; });
  await a.waitForTimeout(8500);
  await T('AD-02', 'เมนูล่าง', 'ตัวเลขไม่หายตอนหน้ารีเฟรชเอง', 'รอหน้าคำสั่งรีเฟรชรอบถัดไป', 'ยังเป็น 3 / 2', async () => { const c = await badge('chats'), o = await badge('a-orders'); return [c === '3' && o === '2', c + ' / ' + o]; });
  await goNav(a, 'chats'); await a.click('[data-tab=order]'); await W(a, 700);
  await T('AD-03', 'แชท', 'แท็บ "ในคำสั่ง" มีตัวเลข', 'เปิดแชท', 'ในคำสั่ง 2', async () => { const t = await txt(a, '[data-tab=order]'); return [/ในคำสั่ง\s*2/.test(t), t]; });
  await a.screenshot({ path: SH + 'ad-chat.png' });
  await goNav(a, 'a-orders'); await a.click('.otabs [data-t=cancelled]'); await W(a, 800);
  await T('AD-04', 'แท็บยกเลิก', 'เหตุผลแทนราคา · ป้ายงานค้าง · งานค้างขึ้นก่อน · ตัวเลขแท็บ = งานค้าง', 'เปิดแท็บยกเลิก', 'ไม่มีราคา · ป้าย ต้องคืนเงิน / ผู้สั่งค้างชำระ / เกินกำหนดรับของคืน · การ์ดที่ไม่มีงานค้างอยู่ท้าย · แท็บ 3',
    async () => { const cards = await a.locator('#app .icard').allInnerTexts(); const t = cards.map(x => x.replace(/\s+/g, ' ')); const tab = await txt(a, '.otabs [data-t=cancelled]');
      return [t.every(x => !/฿\d+$/.test(x.split('ยกเลิกเมื่อ')[0].trim())) && t.join().includes('ต้องคืนเงิน ฿10') && t.join().includes('ผู้สั่งค้างชำระ ฿10') && t.join().includes('เกินกำหนดรับของคืนแล้ว') && t[t.length - 1].includes(J.rej) && /3/.test(tab), tab + ' · ' + t.length + ' ใบ']; });
  await a.screenshot({ path: SH + 'ad-cancelled.png', fullPage: true });
  await openJob(a, J.pend);
  const mapPend = await a.locator('.routebox.open').count();
  await openJob(a, J.deli); const mapDeli = await a.locator('.routebox.open').count();
  await T('AD-05', 'หน้าคำสั่ง', 'แผนที่พับก่อนรับของ กางตอนนำส่ง', 'เปิดคำสั่งรอยืนยัน และกำลังนำส่ง', 'รอยืนยัน: พับ · กำลังนำส่ง: กาง', async () => [mapPend === 0 && mapDeli === 1, 'รอยืนยัน ' + mapPend + ' · นำส่ง ' + mapDeli]);
  await openJob(a, J.pick); await a.click('.acancel > summary'); await W(a, 300);
  const warn = await txt(a, '#acf'); await a.fill('#acf [name=note]', 'ไรเดอร์ทำของหาย ขอโทษลูกค้า'); await a.click('#acf .btn'); await W(a, 900);
  const pk = await E(id => [H.job(id).refund_amount, H.S.list('Rewards').filter(r => r.job_id === id && r.kind === 'cancel').length], J.pick);
  await T('AD-06', 'ยกเลิก', 'ยกเลิกหลังรับของ: บอกก่อน แล้วคืนเงินอัตโนมัติ + แจ้งผู้สั่ง', 'เปิดคำสั่งที่รับของแล้ว → ยกเลิกคำสั่งนี้', 'เตือน "คืนเงิน ฿10 ให้ผู้สั่ง..." ปุ่ม "ยืนยันยกเลิกและคืนเงิน" · refund_amount=10 · ผู้สั่งได้แจ้งเตือน',
    async () => [warn.includes('คืนเงิน ฿10 ให้ผู้สั่งตอนมารับของคืน') && warn.includes('ยืนยันยกเลิกและคืนเงิน') && pk[0] === '10' && pk[1] === 1, pk.join(' / ')]);
  await a.click('[data-do=returned]'); await W(a, 900);
  const ret2 = await E(id => H.err(() => H.L.handle(H.tok('admin'), 'act', { id, action: 'returned' })), J.pick);
  await T('AD-07', 'รับของคืน', 'กดได้ครั้งเดียว', 'กด "คืนของและเงินให้ผู้สั่งแล้ว" แล้วส่งซ้ำ', 'ครั้งแรกบันทึก · ปุ่มหาย · ครั้งที่ 2 ปฏิเสธ', async () => [(await a.locator('[data-do=returned]').count()) === 0 && /ไปแล้ว/.test(ret2), ret2]);
  await goNav(a, 'a-home');
  const cash = await E(() => H.L.handle(H.tok('admin'), 'admin_overview', {}).cash);
  await T('AD-08', 'ภาพรวม', 'เงินสดวันนี้ · ไม่มีกล่องต้องจัดการ (ดูที่แท็บยกเลิก)', 'เปิดภาพรวม', 'ไม่มีกล่องต้องจัดการ · เงินสด: เก็บแล้ว = ฝาก + ปลายทาง · คืนแล้ว ฿10 · ในมือ = เก็บ − คืน',
    async () => { const nb = await a.locator('.todobox').count(); const g = await txt(a, '.cashgrid'); return [nb === 0 && cash.refunded === 10 && cash.collected === cash.deposit + cash.cod && cash.cod === 10 && cash.in_hand === cash.collected - 10 && g.includes(baht(cash.in_hand)),
      JSON.stringify(cash)]; });
  await a.screenshot({ path: SH + 'ad-overview.png', fullPage: true });
  const mixExp = await E(() => { const t = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }); const js = H.S.list('Jobs').filter(j => new Date(j.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }) === t);
    return { done: js.filter(j => j.status === 'delivered').length, active: js.filter(j => ['pending', 'confirmed', 'picked', 'delivering'].includes(j.status)).length, failed: js.filter(j => j.cancel_reason === 'failed').length, cancelled: js.filter(j => j.status === 'cancelled' && j.cancel_reason !== 'failed').length, all: js.length }; });
  const mlg = (await a.locator('.mixlg button').allInnerTexts()).map(x => x.replace(/\s+/g, ' '));
  await a.locator('.mixlg [data-mix=active]').click(); await W(a, 300); const md = await txt(a, '#mixd'); const center = (await a.locator('.mixn').textContent()).trim();
  await a.screenshot({ path: SH + 'ad-mix.png' });
  await T('AD-14', 'ภาพรวม', 'แผนภูมิวงกลมคำสั่งวันนี้ 4 ส่วน ตัวเลขตรงข้อมูล · แตะแล้วเห็นรายละเอียด', 'เปิดภาพรวม แตะ "กำลังดำเนินการ"', 'ตรงกลาง = จำนวนคำสั่งวันนี้ · สำเร็จ/กำลังดำเนินการ/ส่งไม่สำเร็จ/ยกเลิก ตรงกับข้อมูล · รายละเอียดแยก รอยืนยัน/รอรับของ/กำลังส่ง',
    async () => [center === String(mixExp.all) && mlg[0].includes('สำเร็จ ' + mixExp.done) && mlg[1].includes('กำลังดำเนินการ ' + mixExp.active) && mlg[2].includes('ส่งไม่สำเร็จ ' + mixExp.failed) && mlg[3].includes('ยกเลิก ' + mixExp.cancelled) && md.includes('รอยืนยัน') && md.includes('กำลังส่ง'), center + ' · ' + mlg.join(' | ') + ' · ' + md.slice(0, 50)]);
  const [d1] = await Promise.all([a.waitForEvent('download'), a.click('#csvjobs')]); const f1 = fs.readFileSync(await d1.path(), 'utf8');
  const [d2] = await Promise.all([a.waitForEvent('download'), a.click('#csvdays')]); const f2 = fs.readFileSync(await d2.path(), 'utf8');
  const nJobs = await E(() => H.S.list('Jobs').length);
  await T('AD-09', 'รายงาน', 'ดาวน์โหลด CSV คำสั่งทั้งหมดและสรุปรายวัน', 'กดคำสั่งทั้งหมด / สรุปรายวัน', 'ไฟล์ UTF-8 (BOM) · แถวคำสั่ง = จำนวนคำสั่ง · สรุปรายวันมีแถววันนี้',
    async () => { const l1 = f1.trim().split(/\r\n/), l2 = f2.trim().split(/\r\n/); return [f1.charCodeAt(0) === 0xfeff && l1[0].includes('เลขคำสั่ง') && l1.length - 1 === nJobs && d1.suggestedFilename().endsWith('.csv') && l2[0].includes('วันที่') && l2.length === 2,
      d1.suggestedFilename() + ' ' + (l1.length - 1) + ' แถว · ' + d2.suggestedFilename() + ' ' + (l2.length - 1) + ' แถว']; });
  await openJob(a, J.old);
  await a.click('[data-do=remind_return]'); await W(a, 800); await a.click('[data-do=extend_keep]'); await W(a, 800);
  const ex = await E(id => [H.S.list('Rewards').filter(r => r.job_id === id && r.kind === 'return').length, new Date(H.job(id).keep_until).getTime() > Date.now()], J.old);
  await a.click('.dispose > summary'); await W(a, 300); await a.fill('#dispf [name=note]', 'ส่งคืนสำนักงานคณะ'); await a.click('#dispf .btn'); await W(a, 900);
  const dp = await E(id => [H.job(id).disposed_at ? 1 : 0, H.err(() => H.L.handle(H.tok('admin'), 'act', { id, action: 'returned' }))], J.old);
  await T('AD-10', 'ของเกินกำหนด', 'แจ้งผู้สั่งอีกครั้ง · ขยาย 3 วัน · บันทึกว่าจัดการแล้ว', 'เปิดคำสั่งที่เกิน 3 วัน กดทั้ง 3 ปุ่ม', 'ผู้สั่งได้แจ้งเตือน · กำหนดใหม่เลยวันนี้ · บันทึกจัดการแล้ว และกดรับคืนไม่ได้อีก',
    async () => [ex[0] === 1 && ex[1] && dp[0] === 1 && /จัดการไปแล้ว/.test(dp[1]) && (await txt(a, '.returncard')).includes('แอดมินจัดการของแล้ว'), ex.join() + ' / ' + dp.join()]);
  // จัดการผู้ใช้
  await goNav(a, 'profile'); await a.click('[data-page=resetpw]'); await W(a, 600); await a.fill('#rf [name=username]', '0800000002'); await a.click('#rf .btn'); await W(a, 800);
  const card = await txt(a, '#rres');
  await a.click('.acancel > summary'); await W(a, 300); await a.fill('#disf [name=note]', 'ทดสอบระงับ'); await a.click('#disf .btn'); await W(a, 900);
  const st = await txt(a, '#rres'); const lg = await E(() => H.err(() => H.L.handle(null, 'login', { username: 'u02', password: 'demo1234' })));
  await a.screenshot({ path: SH + 'ad-user.png', fullPage: true });
  await a.click('#doenable'); await W(a, 900); const lg2 = await E(() => H.err(() => H.L.handle(null, 'login', { username: 'u02', password: 'demo1234' })));
  await T('AD-11', 'จัดการผู้ใช้', 'ค้นหาด้วยเบอร์ · ระงับ (ใส่เหตุผล) · ยกเลิกระงับ', 'ค้นหา 0800000002 → ระงับบัญชี → ยกเลิกการระงับ', 'เจอ User U02 พร้อมสถิติ · ระงับแล้วเข้าสู่ระบบไม่ได้ · ยกเลิกแล้วเข้าได้',
    async () => [card.includes('User U02') && card.includes('ค้างชำระ') && !card.includes('ปฏิเสธรับของ') && st.includes('ถูกระงับ') && /ถูกระงับ/.test(lg) && lg2 === 'OK', st.slice(0, 60) + ' / ' + lg.slice(0, 30) + ' / ' + lg2]);
  // ราคา
  await goNav(a, 'profile'); await a.click('[data-page=pricing]'); await W(a, 700);
  await a.fill('#prf [name=urgent]', '5'); await a.click('#prf .btn'); await W(a, 600); const perr = await txt(a, '#err');
  await a.fill('#prf [name=urgent]', '20'); await a.fill('#prf [name=normal]', '12'); await a.click('#prf .btn'); await W(a, 800);
  await a.screenshot({ path: SH + 'ad-pricing.png', fullPage: true });
  const q = await E(() => H.L.handle(H.tok('u03'), 'quote', { mode: 'normal', dropoff_zone: 'อาคาร 3', item_type: 'เอกสาร / ชีท' }).subtotal);
  let u = await login('u03', true); for (let i = 0; i < 4 && await u.locator('.rwpop').count(); i++) { await u.locator('.rwpop [data-rw=ok]').click(); await W(u, 400); }
  const home = await txt(u, '.svcgrid');
  await T('AD-12', 'ราคาและ Point', 'แอดมินแก้ราคาได้ · ตรวจค่าผิด · มีผลกับหน้าผู้ใช้', 'ตั้งด่วน 5 (ต่ำกว่าปกติ) → ตั้งปกติ 12 ด่วน 20', 'ปฏิเสธ "ค่าส่งด่วนต้องไม่น้อยกว่าค่าส่งปกติ" · ราคาใหม่ 12 · หน้าแรกผู้ใช้ "เริ่ม ฿12"',
    async () => [/ไม่น้อยกว่า/.test(perr) && q === 12 && home.includes('เริ่ม ฿12'), perr.slice(0, 40) + ' / quote ' + q + ' / ' + home.slice(0, 40)]);
  let s1 = await login('u01', true); await W(s1, 900); const pops = [];
  for (let i = 0; i < 6 && await s1.locator('.rwpop').count(); i++) { pops.push((await txt(s1, '.rwpop')).slice(0, 50)); await s1.locator('.rwpop [data-rw=ok]').click(); await W(s1, 500); }
  await T('AD-13', 'แจ้งผู้สั่ง', 'ผู้สั่งได้ popup เมื่อแอดมินยกเลิก / แจ้งให้มารับของคืน', 'u01 เข้าสู่ระบบ', 'มี "แอดมินยกเลิกคำสั่ง" และ "มารับของคืน"', async () => [pops.some(x => x.includes('แอดมินยกเลิกคำสั่ง')) && pops.some(x => x.includes('มารับของคืน')), pops.join(' | ').slice(0, 200)]);
  // ===== รอบ 2 =====
  const r2 = await E(() => { const L = H.L, A = H.tok('admin');
    const sj = H.mk({}); H.to(sj, 'delivering'); H.act(sj, 'arrive'); L.handle(A, 'act', { id: sj, action: 'fail', code: 'item_damaged', note: 'x', photos: { list: H.ph, verdict: 'shop' } });
    L.handle(A, 'act', { id: sj, action: 'dispose', note: 'ส่งคืนคณะ' });
    const c = H.mk({ sender: 'u03', f: { recipient_id: 'U04' } }); L.handle(H.tok('u03'), 'send', { id: c, text: 'ของถึงแล้ว ขอบคุณครับ' }); H.to(c, 'delivered');
    L.handle(null, 'register', { username: 'evil9', name: '=HYPERLINK("x","y")', phone: '0897777777', password: 'abcd1234', pdpa_ok: 1 });
    const tk = L.handle(null, 'login', { username: 'evil9', password: 'abcd1234', pdpa_ok: 1 }).token; L.handle(tk, 'create', { item_type: 'เอกสาร / ชีท', item_detail: 'x', dropoff_zone: 'อาคาร 3', recipient_id: 'U04', mode: 'normal', photos: H.ph });
    return { sj, noForce: H.err(() => L.handle(A, 'admin_set_user_status', { username: 'u02', status: 'disabled', note: 'x' })), adminMsg: H.err(() => L.handle(A, 'admin_set_user_status', { username: 'admin', status: 'disabled', note: 'x' })) }; });
  await openJob(a, r2.sj); const before = await a.locator('[data-do=refunded]').count();
  await a.click('[data-do=refunded]'); await W(a, 300); await a.click('[data-do=refunded]'); await W(a, 900);
  const rf = await E(id => [H.job(id).refunded_at ? 1 : 0, H.err(() => H.L.handle(H.tok('admin'), 'act', { id, action: 'refunded' }))], r2.sj);
  await T('AD-15', 'คืนเงิน', 'คืนเงินได้แม้บันทึกจัดการของไปแล้ว', 'คำสั่ง TheungMue ผิด → บันทึกจัดการของ → กด "คืนเงินแล้ว" 2 ครั้ง (ยืนยัน)', 'ปุ่มคืนเงินยังอยู่หลังจัดการของ · บันทึกคืนเงินได้ · ซ้ำไม่ได้ · ป้ายต้องคืนหาย',
    async () => [before === 1 && rf[0] === 1 && /ไปแล้ว/.test(rf[1]) && (await a.locator('[data-do=refunded]').count()) === 0 && /คืนเงินค่าส่ง ฿\d+ แล้ว/.test(await txt(a, '.returncard')) && (await txt(a, '.returncard')).includes('แอดมินจัดการของแล้ว') && !(await txt(a, '.returncard')).includes('รอผู้สั่งมารับคืน'), before + ' / ' + rf.join(' / ') + ' / ' + (await txt(a, '.returncard')).slice(0, 140)]);
  await goNav(a, 'profile'); await a.click('[data-page=resetpw]'); await W(a, 600); await a.fill('#rf [name=username]', 'u02'); await a.click('#rf .btn'); await W(a, 800);
  await a.click('.acancel > summary'); await W(a, 300); const wb = await txt(a, '#disf'); await a.screenshot({ path: SH + 'ad-suspend-warn.png', fullPage: true });
  await T('AD-16', 'ระงับบัญชี', 'มีคำสั่งค้าง: เตือนรายคำสั่ง + ต้องยืนยัน', 'เปิดระงับบัญชี u02 ที่มีของกำลังส่งถึง', 'กล่องเตือน "มีคำสั่งที่ยังไม่จบ" บอกผลทีละคำสั่ง · ปุ่ม "ระงับทั้งที่มีคำสั่งค้าง" · เรียกตรงโดยไม่ยืนยัน = ปฏิเสธ',
    async () => [wb.includes('มีคำสั่งที่ยังไม่จบ') && wb.includes('ดูรหัสรับของไม่ได้') && wb.includes('ระงับทั้งที่มีคำสั่งค้าง') && /กรุณายืนยัน/.test(r2.noForce), wb.slice(0, 70) + ' / ' + r2.noForce.slice(0, 40)]);
  await T('AD-17', 'ระงับบัญชี', 'ข้อความเมื่อพยายามระงับแอดมิน', 'ส่งคำขอระงับ admin', '"ระงับบัญชีแอดมินไม่ได้"', async () => [r2.adminMsg === 'ระงับบัญชีแอดมินไม่ได้', r2.adminMsg]);
  await goNav(a, 'a-home'); const [d3] = await Promise.all([a.waitForEvent('download'), a.click('#csvjobs')]); const f3 = fs.readFileSync(await d3.path(), 'utf8');
  await T('AD-18', 'รายงาน', 'กัน CSV injection', 'ผู้ใช้ชื่อ =HYPERLINK(...) สั่งของ แล้วดาวน์โหลด CSV', 'ช่องชื่อขึ้นต้นด้วย \' ไม่ใช่ =', async () => { const line = f3.split(/\r\n/).find(l => l.includes('HYPERLINK')) || ''; return [/,"'=HYPERLINK/.test(line) && !/,"=HYPERLINK/.test(line) && !/,=HYPERLINK/.test(line), line.slice(0, 90)]; });
  await goNav(a, 'chats'); await a.click('[data-tab=closed]'); await W(a, 700);
  await T('AD-19', 'แชท', 'แท็บปิดแล้วมีตัวเลขข้อความที่ยังไม่อ่าน', 'ผู้สั่งทักในคำสั่งที่สำเร็จแล้ว', 'ปิดแล้ว 1', async () => { const t = await txt(a, '[data-tab=closed]'); return [/ปิดแล้ว\s*1/.test(t), t]; });
  await goNav(a, 'profile'); await a.click('[data-page=activity]'); await W(a, 800); const act = await txt(a, '#app');
  await T('AD-20', 'ประวัติ', 'รายการใหม่เป็นภาษาไทย', 'เปิดการใช้งานทั้งหมดของแอดมิน', 'ไม่มีรหัสอังกฤษ · มี "จัดการของที่ไม่มีคนรับคืน" "คืนเงินผู้สั่ง" "แก้ไขราคาและ Point"',
    async () => [!/return_|admin_disable|admin_enable|pricing_update|refund_paid/.test(act) && act.includes('จัดการของที่ไม่มีคนรับคืน') && act.includes('คืนเงินผู้สั่ง') && act.includes('แก้ไขราคาและ Point'), (act.match(/[a-z]+_[a-z_]+/g) || []).slice(0, 4).join() || 'ไม่มีรหัสอังกฤษ']);
  const dz = await E(() => { const L = H.L, A = H.tok('admin'); L.handle(null, 'register', { username: 'own1', name: 'Own One', phone: '0866666666', password: 'demo1234', pdpa_ok: 1 }); const d = H.mk({ sender: 'own1', f: { recipient_id: 'U04' } }); H.to(d, 'picked'); L.handle(A, 'act', { id: d, action: 'cancel', note: 'ไรเดอร์ทำของหาย' });
    const del = H.err(() => L.handle(L.handle(null, 'login', { username: 'own1', password: 'demo1234' }).token, 'delete_account', { password: 'demo1234', confirm: 'ลบบัญชี' })); L.handle(A, 'act', { id: d, action: 'dispose', note: 'ส่งคืนคณะ' }); return { d, del }; });
  let u3 = await ctx.newPage(); await u3.goto(URL); await u3.fill('#loginf [name=username]', 'own1'); await u3.fill('#loginf [name=password]', 'demo1234'); await u3.click('#loginf #submit'); await W(u3, 900); for (let i = 0; i < 6 && await u3.locator('.rwpop').count(); i++) { await u3.locator('.rwpop [data-rw=ok]').click(); await W(u3, 400); }
  await openJob(u3, dz.d); const rt3 = await txt(u3, '.returncard');
  await u3.click('.tabbar [data-go=profile]'); await W(u3, 500); await u3.click('[data-page=deleteacc]'); await W(u3, 800); const dl3 = await txt(u3, '#main'); const dis3 = await u3.locator('#delf .btn.danger').isDisabled();
  await T('AD-21', 'คืนเงิน', 'ข้อความคืนเงินตรงเหตุผล · จัดการของแล้วบอกให้ติดต่อแอดมิน · ยังค้างคืนเงินลบบัญชีไม่ได้', 'แอดมินยกเลิกหลังรับของ แล้วบันทึกจัดการของ → ผู้สั่งเปิดคำสั่งและหน้าลบบัญชี', '"แอดมินยกเลิกหลังรับของและเก็บเงินแล้ว" · "ติดต่อแอดมินเพื่อรับเงินคืน" · ไม่มี "ส่งไม่สำเร็จเพราะ" · ลบบัญชีถูกปฏิเสธและปุ่มกดไม่ได้',
    async () => [rt3.includes('แอดมินยกเลิกหลังรับของและเก็บเงินแล้ว') && rt3.includes('ติดต่อแอดมินเพื่อรับเงินคืน') && !rt3.includes('ส่งไม่สำเร็จเพราะ') && !rt3.includes('ตอนมารับของคืน') && /เงินคืน/.test(dz.del) && dl3.includes('ยังมีของหรือเงินคืน') && dis3, rt3.slice(0, 400) + ' / ' + dz.del.slice(0, 40) + ' / ' + dis3 + ' / ' + dl3.includes('ยังมีของหรือเงินคืน')]);
  await E(() => H.L.handle(H.tok('admin'), 'set_pricing', { normal: 10, urgent: 20, dist: [0, 3, 5], extra: 5, pt_normal: 2, pt_urgent: 3, per_baht: 2, comp: 2, penalty: 5 }));
  console.log('page errors:', errs.length ? errs : 'none');
  console.log('ผ่าน ' + R.filter(x => x.status === 'ผ่าน').length + '/' + R.length);
  await b.close();
})();
function baht(n) { return '฿' + Number(n || 0).toLocaleString('th-TH'); }
