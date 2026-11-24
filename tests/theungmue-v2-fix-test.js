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
const botMsgs = (p) => p.locator('#bchat .bmsg').allInnerTexts();
const lastBot = async (p) => { const t = await p.locator('#bchat .brow.bot .bmsg').allInnerTexts(); return (t[t.length - 1] || '').replace(/\s+/g, ' '); };
async function ask(p, q) { await p.fill('#bmsg', q); await p.click('#bsend button'); await W(p, 600); return lastBot(p); }
const ago = (d, h) => new Date(Date.now() - d * 864e5 - (h || 0) * 36e5).toISOString();
const HOURS = (pg, o, c) => pg.evaluate(([o, c]) => { const hm = m => new Date(Date.now() + m * 60000).toLocaleTimeString('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' }); BOT.SHOP_HOURS.open = hm(o); BOT.SHOP_HOURS.close = hm(c); return BOT.SHOP_HOURS; }, [o, c]);
(async () => {
  b = await chromium.launch(); ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Bangkok' });
  seed = await ctx.newPage(); seed.on('pageerror', e => errs.push('seed: ' + e.message)); await seed.goto(URL); await seed.evaluate(HELP); await E(() => H.reset());
  const ovOff = () => E(() => H.S.update('Settings', 'service_override', { value: '' }));
  const ovOn = () => E(() => H.S.update('Settings', 'service_override', { value: 'on' }));
  // 1 นอกเวลา
  await ovOff(); await HOURS(seed, 60, 120);
  const r1 = await E(() => [H.err(() => H.mk({})), H.err(() => H.mk({ f: { mode: 'urgent' } }))]);
  await T('FIX-01', 'เวลาให้บริการ', 'นอกเวลาสั่งไม่ได้ทั้งปกติและด่วน', 'ตั้งเวลาเปิดเป็นอีก 1 ชม. ข้างหน้า แล้วสั่ง', 'ปฏิเสธ "ตอนนี้นอกเวลาให้บริการ ... สั่งได้อีกครั้งตอน ..."',
    async () => [r1[0].startsWith('ตอนนี้นอกเวลาให้บริการ') && r1[1].startsWith('ตอนนี้นอกเวลาให้บริการ'), r1[0]]);
  let u = await login('u01'); await HOURS(u, 60, 120); await u.evaluate(() => localStorage.setItem('tm-fab-tip', '1')); await u.click('.tabbar [data-go=u-orders]'); await W(u, 300); await u.click('.tabbar [data-go=u-home]'); await W(u, 600);
  await T('FIX-02', 'เวลาให้บริการ', 'หน้าแรกแจ้งนอกเวลา และกดบริการไม่ได้', 'เปิดหน้าแรกนอกเวลา', 'แถบ "นอกเวลาให้บริการ" · ปุ่มบริการทั้ง 4 กดไม่ได้',
    async () => { const t = await txt(u, '.svcban'); const dis = await u.locator('.svc[disabled]').count(); return [t.includes('นอกเวลาให้บริการ') && dis === 4, t + ' · ปิด ' + dis + ' ปุ่ม']; });
  await u.screenshot({ path: SH + 'fix-1-closed.png' });
  // 2 ใกล้ปิด: งานด่วนปิดรับ งานปกติได้
  await HOURS(seed, -120, 20);
  const r2 = await E(() => [H.err(() => H.mk({ f: { mode: 'urgent' } })), H.err(() => H.mk({}))]);
  await T('FIX-03', 'เวลาให้บริการ', 'เหลือไม่ถึง 30 นาทีก่อนปิด งานด่วนปิดรับ งานปกติยังสั่งได้', 'ตั้งเวลาปิดเป็นอีก 20 นาที แล้วสั่งด่วน/ปกติ', 'ด่วน: "งานด่วนสั่งได้ถึง ..." · ปกติ: สำเร็จ',
    async () => [r2[0].startsWith('งานด่วนสั่งได้ถึง') && r2[1].startsWith('OK'), r2.join(' / ').slice(0, 120)]);
  await HOURS(u, -120, 20); await u.click('.tabbar [data-go=u-orders]'); await W(u, 300); await u.click('.tabbar [data-go=u-home]'); await W(u, 600); await u.click('[data-svc=normal]'); await W(u, 800);
  await T('FIX-04', 'เวลาให้บริการ', 'หน้าสั่ง: ตัวเลือกงานด่วนกดไม่ได้เมื่อใกล้ปิด', 'เปิดหน้าสั่งตอนเหลือ 20 นาทีก่อนปิด', 'ตัวเลือก "ด่วน" กดไม่ได้ บอก "ปิดรับแล้ววันนี้" · มีแถบแจ้ง',
    async () => { const dis = await u.locator('#modes input[value=urgent]').isDisabled(); const t = await txt(u, '#modes'); const b2 = await txt(u, '.svcban'); return [dis && t.includes('ปิดรับแล้ววันนี้') && b2.includes('งานด่วนปิดรับแล้ววันนี้'), t.slice(0, 80)]; });
  await u.screenshot({ path: SH + 'fix-2-urgent-closed.png', fullPage: true });
  // 3 กำหนดส่งงานด่วนไม่เกินเวลาปิด
  await HOURS(seed, -120, 60);
  const r3 = await E(() => { const id = H.mk({ f: { mode: 'urgent' } }); const j = H.job(id); return [Math.round((new Date(j.due_at) - new Date(j.created_at)) / 60000), H.err(() => H.mk({ f: { mode: 'urgent', deadline: new Date(Date.now() + 90 * 60000).toISOString() } })), H.err(() => H.mk({ f: { mode: 'urgent', deadline: new Date(Date.now() - 60 * 60000).toISOString() } })), H.err(() => H.mk({ f: { mode: 'urgent', deadline: new Date(Date.now() + 10 * 60000).toISOString() } }))]; });
  await T('FIX-05', 'เวลาให้บริการ', 'งานด่วนต้องถึงก่อนปิด และเวลาต้องห่างอย่างน้อย 30 นาที', 'ปิดอีก 60 นาที: สั่งด่วนไม่เลือกเวลา / เลือก 90 นาที / ย้อนหลัง 1 ชม. / อีก 10 นาที', 'ไม่เลือก = กำหนดถึงตอนปิด (60 นาที) · 90 นาที ปฏิเสธ · ย้อนหลังและ 10 นาที ปฏิเสธ (ต้องห่างอย่างน้อย 30 นาที)',
    async () => [Math.abs(r3[0] - 60) <= 1 && r3[1].includes('ต้องถึงก่อนปิด') && r3[2].includes('อย่างน้อย 30 นาที') && r3[3].includes('อย่างน้อย 30 นาที'), r3.join(' / ').slice(0, 200)]);
  // 4 โหมดทดสอบ
  await HOURS(seed, 60, 120);
  let a = await login('admin'); await HOURS(a, 60, 120); await a.click('.tabbar [data-go=profile]'); await W(a, 700);
  const before4 = await a.locator('#svcov').isChecked();
  await a.click('.svcov'); await W(a, 500);
  const r4 = await E(() => [H.S.list('Settings').find(x => x.id === 'service_override').value, H.err(() => H.mk({}))]);
  await T('FIX-06', 'เวลาให้บริการ', 'แอดมินเปิด "รับคำสั่งนอกเวลา (โหมดทดสอบ)" ได้', 'แอดมินเปิดสวิตช์ในโปรไฟล์ แล้วผู้ใช้สั่งนอกเวลา', 'สวิตช์เปิด · สั่งได้',
    async () => [!before4 && r4[0] === 'on' && r4[1].startsWith('OK'), r4.join(' / ').slice(0, 80)]);
  await a.screenshot({ path: SH + 'fix-3-admin-toggle.png', fullPage: true });
  await HOURS(u, 60, 120); await u.click('.tabbar [data-go=u-orders]'); await W(u, 300); await u.click('.tabbar [data-go=u-home]'); await W(u, 600);
  await T('FIX-07', 'เวลาให้บริการ', 'ผู้ใช้เห็นว่าเปิดโหมดทดสอบอยู่', 'เปิดหน้าแรกตอนโหมดทดสอบเปิด', 'แถบ "เปิดรับคำสั่งนอกเวลา (โหมดทดสอบ)" · ปุ่มบริการกดได้',
    async () => { const t = await txt(u, '.svcban'); return [t.includes('โหมดทดสอบ') && (await u.locator('.svc[disabled]').count()) === 0, t]; });
  // 5 ระบบใหม่: ไม่มีการรอผู้รับยอมรับ จึงไม่มียกเลิกอัตโนมัติ 24 ชม. · ส่งไม่สำเร็จแจ้งผู้สั่ง
  const r5 = await E(([a25]) => { const j1 = H.cod(); H.S.update('Jobs', j1, { created_at: a25 }); H.seen();
    H.L.handle(H.tok('u03'), 'session', {}); const x1 = H.job(j1); const rw = H.S.list('Rewards').filter(r => r.kind === 'expire');
    const j2 = H.cod(); H.nf(j2);
    return [x1.status, x1.cod_status, rw.length, j2, H.job(j2).sender_owed]; }, [ago(0, 25)]);
  await T('FIX-08', 'ปลายทาง', 'ปลายทางไม่ต้องรอผู้รับยอมรับ จึงไม่ถูกยกเลิกอัตโนมัติ', 'คำสั่งปลายทางอายุ 25 ชม. แล้วมีผู้ใช้ใช้งานระบบ', 'ยังรอยืนยัน · cod_status=accepted · ไม่มีแจ้งยกเลิกอัตโนมัติ',
    async () => [r5[0] === 'pending' && r5[1] === 'accepted' && r5[2] === 0, r5.slice(0, 3).join(' / ')]);
  let u1 = await login('u01', true); await W(u1, 800);
  await T('FIX-09', 'ส่งไม่สำเร็จ', 'ผู้สั่งเห็น Popup แจ้งส่งไม่สำเร็จ', 'ผู้รับไม่มารับ แอดมินบันทึกส่งไม่สำเร็จ แล้วผู้สั่งเข้าสู่ระบบ', 'Popup "ส่งไม่สำเร็จ <เลขคำสั่ง>" บอกวันเก็บของ ส่งใหม่ราคาเดิม และค่าส่งที่ค้าง',
    async () => { const t = await txt(u1, '.rwpop'); return [t.includes('ส่งไม่สำเร็จ ' + r5[3]) && t.includes('จุดรับฝาก') && t.includes('ส่งใหม่') && t.includes('฿' + r5[4]), t.slice(0, 160)]; });
  await u1.screenshot({ path: SH + 'fix-4-fail.png' });
  await u1.click('.rwpop [data-rw=job]'); await W(u1, 900);
  await T('FIX-10', 'ส่งไม่สำเร็จ', 'กดดูคำสั่งแล้วเห็นทางเลือกส่งใหม่', 'กด "ดูคำสั่ง"', 'หน้าคำสั่งมีฟอร์ม "ส่งใหม่ ราคาเดิม ฿10" และแจ้งค้างชำระ',
    async () => { const t = await txt(u1, '#main'); return [t.includes('ส่งใหม่ ราคาเดิม ฿10') && t.includes('ค้างชำระค่าส่ง ฿10'), t.slice(0, 100)]; });
  // 6 ไรเดอร์โทรผู้รับครบแล้วโทรผู้สั่ง: แจ้งผู้สั่งครั้งเดียว
  const r6 = await E(() => { const id = H.mk({}); H.to(id, 'delivering'); H.act(id, 'arrive');
    const e0 = H.err(() => H.act(id, 'contact', { code: 'sender' }));
    H.act(id, 'contact', { code: 'call' }); const e1 = H.err(() => H.act(id, 'contact', { code: 'call' }));
    const cl = JSON.parse(H.job(id).contact_log); cl[0].t = new Date(Date.now() - 6 * 60000).toISOString(); H.S.update('Jobs', id, { contact_log: JSON.stringify(cl) });
    H.act(id, 'contact', { code: 'call' }); H.act(id, 'contact', { code: 'sender' }); H.act(id, 'contact', { code: 'sender' });
    const e2 = H.err(() => H.act(id, 'fail', { code: 'not_found', photos: { list: H.ph } }));
    return [e0, e1, e2, H.S.list('Rewards').filter(r => r.kind === 'notice' && r.job_id === id).map(r => r.detail)]; });
  await T('FIX-11', 'แจ้งเตือน', 'ไรเดอร์ทำตามขั้นตอนติดต่อ และแจ้งผู้สั่งเมื่อโทรหาผู้สั่ง', 'โทรผู้สั่งก่อนครบ → โทรผู้รับติดกัน → โทรผู้รับครบ 2 → โทรผู้สั่ง 2 ครั้ง → บันทึกติดต่อไม่ได้ทันที', 'ปฏิเสธ 3 ขั้นที่ผิดลำดับ · ผู้สั่งได้แจ้งเตือน "ไรเดอร์ติดต่อผู้รับ" 1 ครั้ง',
    async () => [/ครบ 2 ครั้งก่อน/.test(r6[0]) && /หลังครั้งก่อน 5 นาที/.test(r6[1]) && /รอ 0\/10 นาที/.test(r6[2]) && r6[3].length === 1 && r6[3][0].startsWith('ไรเดอร์ติดต่อผู้รับ'), r6.slice(0, 3).join(' | ') + ' | แจ้ง ' + r6[3].length]);
  // 7 ลบบัญชีลบแชทน้องถึงด้วย
  const r7 = await E(() => { const t = H.tok('u04'); H.L.handle(t, 'bot_send', { text: 'ร้านเปิดกี่โมง' }); H.L.handle(t, 'bot_rate', { stars: 4, comment: 'ดีมาก' });
    const b0 = [H.S.list('BotMessages').filter(m => m.user_id === 'U04').length, H.S.list('BotRatings').filter(m => m.user_id === 'U04').length];
    H.L.handle(t, 'delete_account', { confirm: 'ลบบัญชี', password: 'demo1234' });
    return b0.concat([H.S.list('BotMessages').filter(m => m.user_id === 'U04').length, H.S.list('BotRatings').filter(m => m.user_id === 'U04').length, H.S.list('BotThreads').filter(m => m.user_id === 'U04').length]); });
  await T('FIX-12', 'ลบบัญชี', 'ลบบัญชีแล้วแชทน้องถึงและขนนกถูกลบด้วย', 'u04 คุยกับน้องถึงและให้ขนนก แล้วลบบัญชี', 'ก่อนลบมีข้อมูล · หลังลบไม่เหลือข้อความ คะแนน และห้องแชทของ u04',
    async () => [r7[0] > 0 && r7[1] === 1 && r7[2] === 0 && r7[3] === 0 && r7[4] === 0, 'ก่อน ' + r7[0] + ' ข้อความ/' + r7[1] + ' คะแนน → หลัง ' + r7.slice(2).join('/')]);
  console.log('page errors:', errs.length ? errs : 'none');
  console.log('ผ่าน ' + R.filter(x => x.status === 'ผ่าน').length + '/' + R.length);
  await b.close();
})();
