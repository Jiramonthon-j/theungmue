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
  const j1 = await E(() => H.mk({ sender: 'u03', f: { recipient_id: 'U02' } }));
  let u = await login('u03');
  await u.evaluate(() => localStorage.setItem('tm-fab-tip', '1'));
  await u.click('#botfab'); await W(u, 600);
  await ask(u, 'สวัสดีครับ');
  await ask(u, 'ของฉันถึงไหนแล้ว');
  await T('RT-01', 'ตอบตรงไหม', 'ใต้คำตอบมีปุ่ม "ตอบตรงไหม" (ไม่มีใต้คำทักทาย)', 'ถามทักทาย แล้วถามสถานะ', 'มีแถว "ตอบตรงไหม · ตรงใจ · ยังไม่ตรง" 1 แถว ใต้คำตอบสถานะ',
    async () => { const n = await u.locator('.bfb').count(); const t = await txt(u, '.bfb'); return [n === 1 && t.includes('ตอบตรงไหม') && t.includes('ตรงใจ') && t.includes('ยังไม่ตรง'), n + ' แถว · ' + t]; });
  await u.click('.bfb [data-v=up]'); await W(u, 500);
  await T('RT-02', 'ตอบตรงไหม', 'กด "ตรงใจ" แล้วขึ้นขอบคุณ บันทึกผล', 'กดปุ่ม "ตรงใจ"', 'ปุ่มเป็นสีทึบ ขึ้น "ขอบคุณครับ น้องถึงจำไว้แล้ว" · ข้อมูลบันทึก fb=up',
    async () => { const on = await u.locator('.bfb [data-v=up].on').count(); const t = await txt(u, '.bthx'); const fb = await E(() => H.S.list('BotMessages').filter(m => m.fb).map(m => m.fb).join()); return [on === 1 && t.includes('จำไว้แล้ว') && fb === 'up', t + ' / ' + fb]; });
  await u.click('.bfb [data-v=up]'); await W(u, 500);
  await T('RT-03', 'ตอบตรงไหม', 'กดซ้ำเพื่อยกเลิกได้', 'กด "ตรงใจ" อีกครั้ง', 'ปุ่มกลับเป็นปกติ ข้อมูล fb ว่าง',
    async () => { const on = await u.locator('.bfb .on').count(); const fb = await E(() => H.S.list('BotMessages').filter(m => m.fb).length); return [on === 0 && fb === 0, 'on=' + on + ' fb=' + fb]; });
  await ask(u, 'ส่งด่วนราคาเท่าไหร่');
  await u.locator('.bfb').last().locator('[data-v=down]').click(); await W(u, 500);
  await T('RT-04', 'ตอบตรงไหม', 'กด "ยังไม่ตรง" มีเหตุผลให้เลือก (ไม่บังคับ)', 'กด "ยังไม่ตรง" ใต้คำตอบล่าสุด', 'ขึ้น 4 เหตุผล + ข้อความขอบคุณที่ช่วยสอน',
    async () => { const r = await u.locator('.bwhy button').allInnerTexts(); const t = await txt(u, '.bthx.warn'); return [r.join() === 'ไม่ตรงคำถาม,ข้อมูลไม่ถูก,อ่านแล้วงง,อยากคุยกับแอดมิน' && t.includes('ขอบคุณที่ช่วยสอน'), r.join(' / ')]; });
  await u.click('.bwhy [data-r=wrong]'); await W(u, 500);
  await T('RT-05', 'ตอบตรงไหม', 'เลือกเหตุผลแล้วบันทึก', 'เลือก "ไม่ตรงคำถาม"', 'ปุ่มเหตุผลเป็นสีแดง ข้อมูล fb=down เหตุผล wrong',
    async () => { const on = await u.locator('.bwhy .on').innerText(); const m = await E(() => H.S.list('BotMessages').find(m => m.fb)); return [on === 'ไม่ตรงคำถาม' && m.fb === 'down' && m.fb_reason === 'wrong', on + ' / ' + m.fb + ':' + m.fb_reason]; });
  await u.screenshot({ path: SH + 'rt-1-feedback.png', fullPage: true });
  const noCard = await u.locator('#rcard').count();
  await ask(u, 'ร้านเปิดกี่โมง');
  await T('RT-06', 'ให้ขนนก', 'คุยครบ 3 คำตอบ ขึ้นการ์ดให้ขนนก', 'ก่อนหน้านี้ตอบ 2 คำตอบ แล้วถามเพิ่ม 1', 'ก่อนครบไม่มีการ์ด · ครบแล้วขึ้น "ให้ขนนกน้องถึงหน่อยนะ" ปุ่มส่งยังกดไม่ได้',
    async () => { const t = await txt(u, '#rcard'); const dis = await u.locator('[data-rate=send]').isDisabled(); return [noCard === 0 && t.includes('ให้ขนนกน้องถึงหน่อยนะ') && t.includes('ไม่มีผลกับ Point') && dis, 'ก่อน=' + noCard + ' / ' + t.slice(0, 60)]; });
  await u.click('[data-star="4"]'); await W(u, 300); await u.fill('#rcomment', 'ตอบเร็วดี'); await u.screenshot({ path: SH + 'rt-2-feather.png', fullPage: true });
  await T('RT-07', 'ให้ขนนก', 'แตะขนนกเลือกคะแนน', 'แตะขนนกอันที่ 4', 'ขนนกติด 4 อัน ข้อความ "4 ขนนก · ช่วยได้ดี" ปุ่มส่งกดได้',
    async () => { const on = await u.locator('#rcard .feas .on').count(); const t = await txt(u, '.rlv'); const dis = await u.locator('[data-rate=send]').isDisabled(); return [on === 4 && t === '4 ขนนก · ช่วยได้ดี' && !dis, on + ' / ' + t]; });
  await u.click('[data-rate=send]'); await W(u, 600);
  await T('RT-08', 'ให้ขนนก', 'ส่งขนนกพร้อมข้อความ', 'พิมพ์ "ตอบเร็วดี" กด "ส่งขนนก"', 'การ์ดหาย ขึ้น "ขอบคุณสำหรับ 4 ขนนก" บันทึก 4 ขนนก + ข้อความ',
    async () => { const c = await u.locator('#rcard').count(); const t = await txt(u, '.bthx.rated'); const r = await E(() => H.S.list('BotRatings')); return [c === 0 && t.includes('ขอบคุณสำหรับ 4 ขนนก') && r.length === 1 && r[0].stars === '4' && r[0].comment === 'ตอบเร็วดี', t + ' / ' + JSON.stringify(r.map(x => x.stars + ':' + x.comment))]; });
  const again = await E(() => [H.err(() => H.L.handle(H.tok('u03'), 'bot_rate', { stars: 5 })), H.L.handle(H.tok('u03'), 'bot_thread', {}).rate_prompt]);
  await T('RT-09', 'ให้ขนนก', 'ให้ขนนกได้วันละครั้ง', 'ส่งขนนกซ้ำในวันเดียวกัน', 'ปฏิเสธ "วันนี้ให้ขนนกน้องถึงไปแล้ว" และไม่ขึ้นการ์ดอีก',
    async () => [again[0] === 'วันนี้ให้ขนนกน้องถึงไปแล้ว' && again[1] === false, again.join(' / ')]);
  const later = await E(() => { const t = H.tok('u02'); ['ร้านเปิดกี่โมง', 'มีกี่ point', 'จุดรับฝากอยู่ไหน'].forEach(x => H.L.handle(t, 'bot_send', { text: x })); const a = H.L.handle(t, 'bot_thread', {}).rate_prompt; H.L.handle(t, 'bot_rate_later', {}); return [a, H.L.handle(t, 'bot_thread', {}).rate_prompt, H.S.list('BotRatings').length]; });
  await T('RT-10', 'ให้ขนนก', 'กด "ไว้ทีหลัง" การ์ดไม่ขึ้นอีกในวันนั้น', 'u02 คุยครบ 3 คำตอบ แล้วกด "ไว้ทีหลัง"', 'ก่อนกดขึ้นการ์ด · หลังกดไม่ขึ้น ไม่บันทึกคะแนน',
    async () => [later[0] === true && later[1] === false && later[2] === 1, later.join(' / ')]);
  const ff = await E(() => { const t = H.tok('u02'); const m = H.S.list('BotMessages').filter(x => x.user_id === 'U02' && x.rate).pop();
    return [H.err(() => H.L.handle(H.tok('u03'), 'bot_feedback', { id: m.id, value: 'up' })), H.err(() => H.L.handle(H.tok('admin'), 'bot_feedback', { id: m.id, value: 'up' })),
      (H.L.handle(t, 'bot_feedback', { id: m.id, value: 'down', reason: 'admin' }), H.L.handle(H.tok('admin'), 'bot_queue', {}).waiting.map(w => w.name + ':' + w.reason_label).join())]; });
  await T('RT-11', 'ตอบตรงไหม', 'สิทธิ์ และเหตุผล "อยากคุยกับแอดมิน"', 'u03 ให้คะแนนข้อความของ u02 · แอดมินให้คะแนน · u02 เลือก "อยากคุยกับแอดมิน"', 'ปฏิเสธ 2 กรณีแรก · กรณีสุดท้ายส่งต่อแอดมิน',
    async () => [ff[0] === 'ให้คะแนนข้อความนี้ไม่ได้' && ff[1] === 'ใช้ได้เฉพาะผู้ใช้' && ff[2] === 'User U02:กดติดต่อแอดมิน', ff.join(' / ')]);
  // แอดมิน: สมุดพก
  let a = await login('admin'); await a.click('.tabbar [data-go=a-home]'); await W(a, 900); await a.click('[data-htab=bot]'); await W(a, 900);
  await T('RT-12', 'สมุดพก', 'แอดมินเห็นสมุดพกน้องถึง', 'แอดมินเปิด "ภาพรวม"', 'ขนนกเฉลี่ย 4.0 จาก 1 คน · ตอบตรงใจ % · ตรงใจแยกตามเรื่อง · คำตอบที่ยังไม่ตรง · คำชม "ตอบเร็วดี"',
    async () => { const t = await txt(a, '.report'); return [t.includes('สมุดพกน้องถึง') && t.includes('4.0') && t.includes('จากผู้ใช้ 1 คน') && t.includes('ตอบตรงใจ') && t.includes('ตรงใจแยกตามเรื่อง') && t.includes('ส่งด่วนราคาเท่าไหร่') && t.includes('ไม่ตรงคำถาม') && t.includes('ตอบเร็วดี'), t.slice(0, 200)]; });
  await a.locator('.report').scrollIntoViewIfNeeded(); await a.screenshot({ path: SH + 'rt-3-report.png', fullPage: true });
  const it = a.locator('.report .tq', { hasText: 'ส่งด่วนราคาเท่าไหร่' }); await it.locator('select').selectOption('price'); await it.locator('[data-reteach]').click(); await W(a, 700);
  const re = await E(() => { H.err(() => H.L.handle(H.tok('admin'), 'bot_close', { user_id: 'U03' })); return [H.S.list('BotExamples').map(e => e.intent + ':' + e.text).join(), H.L.handle(H.tok('u03'), 'bot_send', { text: 'ส่งด่วนราคาเท่าไหร่' })]; });
  await T('RT-13', 'สมุดพก', 'สอนใหม่จากคำตอบที่ยังไม่ตรง', 'เลือก "ค่าบริการ" กด "สอนใหม่" แล้วถามประโยคเดิม', 'รายการหายจากสมุดพก · เพิ่มตัวอย่างสอน · ครั้งใหม่ตอบเรื่องค่าบริการ',
    async () => { const left = await a.locator('.report .tq', { hasText: 'ส่งด่วนราคาเท่าไหร่' }).count(); return [left === 0 && re[0].includes('price:ส่งด่วนราคาเท่าไหร่') && re[1].intent === 'price' && re[1].conf >= 0.6, 'เหลือ ' + left + ' · ' + re[0] + ' · ' + re[1].intent + ' ' + re[1].conf]; });
  await a.click('.tabbar [data-go=chats]'); await W(a, 700); await a.click('[data-tab=bot]'); await W(a, 600); await a.click('[data-bthread=U03]'); await W(a, 700);
  await T('RT-14', 'สมุดพก', 'แอดมินเห็นผลตอบตรงไหมในแชท', 'เปิดแชทผู้ช่วยของ User U03', 'ใต้คำตอบมีป้าย "ผู้ใช้: ยังไม่ตรง · ไม่ตรงคำถาม"',
    async () => { const t = await a.locator('.bfbad').allInnerTexts(); return [t.some(x => x.includes('ผู้ใช้: ยังไม่ตรง · ไม่ตรงคำถาม')), t.join(' / ')]; });
  console.log('page errors:', errs.length ? errs : 'none');
  fs.writeFileSync(require('path').resolve(__dirname, 'shots/rate-results.json'), JSON.stringify(R, null, 1));
  console.log('ผ่าน ' + R.filter(x => x.status === 'ผ่าน').length + '/' + R.length);
  await b.close();
})();
