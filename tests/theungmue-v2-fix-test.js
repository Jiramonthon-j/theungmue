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
  // 5 ปลายทางหมดเวลา 24 ชม.
  const r5 = await E(([a25, a23]) => { const j1 = H.cod(), j2 = H.cod(); H.S.update('Jobs', j1, { created_at: a25 }); H.S.update('Jobs', j2, { created_at: a23 }); H.seen();
    H.L.handle(H.tok('u03'), 'session', {}); const x1 = H.job(j1), x2 = H.job(j2); const rw = H.S.list('Rewards').filter(r => r.kind === 'expire');
    return [x1.status, x1.cancel_reason, x2.status, rw.length, rw[0] && rw[0].user_id, j1]; }, [ago(0, 25), ago(0, 23)]);
  await T('FIX-08', 'ปลายทางหมดเวลา', 'ผู้รับไม่ตอบรับภายใน 24 ชม. ยกเลิกอัตโนมัติ', 'คำสั่งปลายทางอายุ 25 ชม. และ 23 ชม. แล้วมีผู้ใช้ใช้งานระบบ', '25 ชม.: ยกเลิก (cod_expired) แจ้งผู้สั่ง · 23 ชม.: ยังรออยู่',
    async () => [r5[0] === 'cancelled' && r5[1] === 'cod_expired' && r5[2] === 'pending' && r5[3] === 1 && r5[4] === 'U01', r5.slice(0, 5).join(' / ')]);
  let u1 = await login('u01', true); await W(u1, 800);
  await T('FIX-09', 'ปลายทางหมดเวลา', 'ผู้สั่งเห็น Popup แจ้งยกเลิกอัตโนมัติ', 'ผู้สั่งเข้าสู่ระบบ', 'Popup "คำสั่ง ... ถูกยกเลิกอัตโนมัติ" บอกเหตุผลและให้สั่งใหม่แบบจ่ายตอนฝากของ',
    async () => { const t = await txt(u1, '.rwpop'); return [t.includes('ถูกยกเลิกอัตโนมัติ') && t.includes('24 ชม.') && t.includes(r5[5]), t.slice(0, 120)]; });
  await u1.screenshot({ path: SH + 'fix-4-expire.png' });
  await u1.click('.rwpop [data-rw=job]'); await W(u1, 700);
  await T('FIX-10', 'ปลายทางหมดเวลา', 'หน้าคำสั่งบอกเหตุผลที่ยกเลิก', 'กด "ดูคำสั่ง"', 'เหตุผล "ผู้รับไม่ตอบรับเก็บเงินปลายทางภายใน 24 ชม."',
    async () => { const t = await txt(u1, '#main'); return [t.includes('ผู้รับไม่ตอบรับเก็บเงินปลายทางภายใน 24 ชม.'), t.slice(0, 100)]; });
  // 6 ผลโต้แย้งแบบคงโทษแจ้งเตือนได้ (บั๊กเดิม: แจ้งเตือนที่ไม่มี Point ไม่ถูกบันทึก)
  const r6 = await E(() => { const id = H.cod({ recipient_id: 'U02' }); H.racc(id, 'u02', false); H.to(id, 'delivering');
    H.L.handle(H.tok('u02'), 'act', { id, action: 'refuse', code: 'changed_mind' }); H.L.handle(H.tok('u02'), 'act', { id, action: 'appeal', note: 'ไม่ได้เปลี่ยนใจ' });
    H.act(id, 'appeal_decide', { code: 'kept' }); return H.S.list('Rewards').filter(r => r.kind === 'notice' && r.job_id === id).map(r => r.detail); });
  await T('FIX-11', 'แจ้งเตือน', 'แอดมินคงโทษหลังโต้แย้ง ผู้รับได้รับแจ้ง', 'ผู้รับปฏิเสธ → ยื่นโต้แย้ง → แอดมินคงโทษ', 'มีแจ้งเตือน "แอดมินตรวจคำโต้แย้งแล้ว คงบทลงโทษเดิม"',
    async () => [r6.length === 1 && r6[0].includes('คงบทลงโทษเดิม'), r6.join()]);
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
