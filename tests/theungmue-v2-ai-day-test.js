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
(async () => {
  b = await chromium.launch(); ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Bangkok' });
  seed = await ctx.newPage(); seed.on('pageerror', e => errs.push('seed: ' + e.message)); await seed.goto(URL); await seed.evaluate(HELP); await E(() => H.reset());
  const ja = await E(() => H.mk({ sender: 'u03', f: { recipient_id: 'U02', dropoff_zone: 'อาคาร 22' } }));
  const jb = await E(() => H.mk({ sender: 'u03', f: { recipient_id: 'U04', dropoff_zone: 'คณะบัญชี' } }));
  // แชทเก่าของ u03: 2 วันก่อน (คุยกับแอดมิน + ให้ 4 ขนนก) และ 10 วันก่อน
  await E(([ago2, ago10, ja]) => {
    const t = H.tok('u03'); H.L.handle(t, 'bot_thread', {});
    const ins = (role, text, at, ex) => H.S.insert('BotMessages', Object.assign({ id: 'BMold' + Math.random().toString(36).slice(2, 8), thread_id: 'BU03', user_id: 'U03', role, text, intent: '', conf: '', card: '', options: '', created_at: at, read_at: at, seq: '1' }, ex || {}));
    ins('user', 'กล่องบุบ ขอคืนเงิน', ago2, { intent: 'damaged', conf: '0.9' }); ins('bot', 'เรื่องของเสียหายต้องให้แอดมินดูแลครับ', ago2, { rate: 'yes', intent: 'damaged' }); ins('admin', 'รับเรื่องแล้วครับ', ago2);
    ins('user', 'ร้านเปิดกี่โมง', ago10, { intent: 'hours', conf: '1' }); ins('bot', 'เปิดให้บริการทุกวัน', ago10, { rate: 'yes', intent: 'hours' });
    H.S.insert('BotRatings', { id: 'BRold1', user_id: 'U03', stars: '4', comment: '', created_at: ago2 });
    H.S.update('BotThreads', 'BU03', { last_order: ja, last_order_at: ago2 });
  }, [ago(2), ago(10), ja]);
  let u = await login('u03');
  await u.evaluate(() => localStorage.setItem('tm-fab-tip', '1'));
  await u.click('#botfab'); await W(u, 700);
  await T('DAY-01', 'วันต่อวัน', 'เปิดห้องเห็นเฉพาะวันนี้', 'u03 มีแชทเก่า 2 วัน แล้วเปิดห้องผู้ช่วย', 'ไม่เห็นข้อความเก่า · มีป้าย "วันนี้ · ..." + คำทักทาย · หัวห้องมีปุ่ม "แชทย้อนหลัง" และ "ให้ขนนก"',
    async () => { const t = await txt(u, '.botscreen'); const day = await txt(u, '.bday'); return [!t.includes('กล่องบุบ') && !t.includes('รับเรื่องแล้วครับ') && day.startsWith('วันนี้ · ') && t.includes('สวัสดีครับ ผมน้องถึง') && t.includes('แชทย้อนหลัง') && t.includes('ให้ขนนก'), day]; });
  await u.screenshot({ path: SH + 'day-1-today.png' });
  const t2 = await ask(u, 'ต้องจ่ายเท่าไร');
  await T('DAY-02', 'วันต่อวัน', 'วันใหม่ไม่จำเลขคำสั่งของวันก่อน', 'เมื่อ 2 วันก่อนคุยเรื่อง ' + ja + ' · วันนี้มี 2 คำสั่ง แล้วถาม "ต้องจ่ายเท่าไร"', 'น้องถึงถามว่าหมายถึงคำสั่งไหน (ไม่ตอบคำสั่งเดิมเอง)',
    async () => [t2.includes('หมายถึงคำสั่งไหน'), t2]);
  const fbOld = await E(() => { const m = H.S.list('BotMessages').find(x => x.id.startsWith('BMold') && x.rate); return H.err(() => H.L.handle(H.tok('u03'), 'bot_feedback', { id: m.id, value: 'up' })); });
  await T('DAY-03', 'วันต่อวัน', 'ให้คะแนนได้เฉพาะคำตอบของวันนี้', 'กด "ตรงใจ" ให้คำตอบของ 2 วันก่อน (ผ่านระบบ)', 'ปฏิเสธ "ให้คะแนนได้เฉพาะคำตอบของวันนี้"',
    async () => [fbOld === 'ให้คะแนนได้เฉพาะคำตอบของวันนี้', fbOld]);
  await u.click('[data-bhist]'); await W(u, 600);
  await T('DAY-04', 'ย้อนหลัง', 'หน้าแชทย้อนหลังแสดงรายการวัน', 'กด "แชทย้อนหลัง"', '3 วัน (วันนี้ / 2 วันก่อน / 10 วันก่อน) ใหม่สุดก่อน · วันที่ 2 วันก่อนมีป้าย "คุยกับแอดมิน" และ "ให้ 4 ขนนก"',
    async () => { const r = await u.locator('.bdl').allInnerTexts(); return [r.length === 3 && r[0].includes('วันนี้') && r[1].includes('กล่องบุบ') && r[1].includes('คุยกับแอดมิน') && r[1].includes('ให้ 4 ขนนก') && r[2].includes('ร้านเปิดกี่โมง'), r.map(x => x.replace(/\s+/g, ' ')).join(' | ')]; });
  await u.screenshot({ path: SH + 'day-2-history.png' });
  await u.locator('.bdl').nth(1).click(); await W(u, 600);
  await T('DAY-05', 'ย้อนหลัง', 'เปิดวันเก่าอ่านได้อย่างเดียว', 'กดวัน 2 วันก่อน', 'เห็นข้อความวันนั้นครบ (รวมแอดมิน) ไม่มีช่องพิมพ์ ไม่มีปุ่ม "ตอบตรงไหม" มีปุ่ม "กลับไปแชทวันนี้"',
    async () => { const t = await txt(u, '.botscreen'); const inp = await u.locator('#bmsg').count(); const fb = await u.locator('.bfb').count(); return [t.includes('กล่องบุบ') && t.includes('รับเรื่องแล้วครับ') && t.includes('ดูย้อนหลังได้อย่างเดียว') && t.includes('ให้ 4 ขนนก') && inp === 0 && fb === 0, 'ช่องพิมพ์=' + inp + ' ตอบตรงไหม=' + fb]; });
  await u.screenshot({ path: SH + 'day-3-old.png' });
  await u.click('[data-today]'); await W(u, 600);
  await T('DAY-06', 'ย้อนหลัง', 'กลับไปแชทวันนี้', 'กด "กลับไปแชทวันนี้"', 'กลับห้องวันนี้ มีช่องพิมพ์',
    async () => [(await u.locator('#bmsg').count()) === 1, 'ok']);
  // ปุ่มให้ขนนกเองก่อนครบ 3 คำตอบ
  const before = await u.locator('#rcard').count();
  await u.click('[data-rate-open]'); await W(u, 400);
  await T('DAY-07', 'ให้ขนนก', 'กดปุ่ม "ให้ขนนก" ได้เองก่อนครบ 3 คำตอบ', 'ยังตอบไม่ครบ 3 คำตอบ กดปุ่ม "ให้ขนนก" ที่หัวห้อง', 'ก่อนกดไม่มีการ์ด · กดแล้วการ์ดขึ้น',
    async () => [before === 0 && (await u.locator('#rcard').count()) === 1, 'ก่อน=' + before]);
  await u.click('[data-star="5"]'); await W(u, 300); await u.click('[data-rate=send]'); await W(u, 700);
  await T('DAY-08', 'ให้ขนนก', 'ให้แล้วปุ่มหัวห้องเปลี่ยนเป็น "ให้แล้ว 5 ขนนก"', 'เลือก 5 ขนนก กดส่ง', 'ปุ่มเป็นสีเทา กดไม่ได้ · บันทึก 5 ขนนกของวันนี้',
    async () => { const t = await txt(u, '.ib.done'); const dis = await u.locator('.ib.done').isDisabled(); const n = await E(() => H.S.list('BotRatings').filter(r => r.user_id === 'U03' && r.stars === '5').length); return [t.includes('ให้แล้ว 5 ขนนก') && dis && n === 1, t]; });
  await u.screenshot({ path: SH + 'day-4-rated.png' });
  // เรื่องค้างข้ามวัน
  await E(([y]) => { const t = H.tok('u02'); H.L.handle(t, 'bot_thread', {});
    H.S.insert('BotMessages', { id: 'BMcar1', thread_id: 'BU02', user_id: 'U02', role: 'user', text: 'ไม่ได้รับของ แต่ระบบขึ้นว่าส่งแล้ว', intent: 'admin', conf: '0.9', created_at: y, seq: '1' });
    H.S.insert('BotMessages', { id: 'BMcar2', thread_id: 'BU02', user_id: 'U02', role: 'system', text: 'ส่งต่อแอดมินแล้ว · คิวที่ 1', created_at: y, seq: '2' });
    H.S.update('BotThreads', 'BU02', { mode: 'handoff', reason: 'admin_button', handoff_at: y, summary: 'กดติดต่อแอดมิน' });
    H.L.handle(H.tok('admin'), 'bot_reply', { user_id: 'U02', text: 'สวัสดีครับ ขอตรวจรูปตอนส่งก่อนนะครับ' }); }, [ago(1, 1)]);
  let u2 = await login('u02'); await u2.evaluate(() => localStorage.setItem('tm-fab-tip', '1')); await u2.click('#botfab'); await W(u2, 700);
  await T('DAY-09', 'เรื่องค้าง', 'เรื่องที่ส่งต่อแอดมินยังไม่ปิด แสดงต่อในวันใหม่', 'เมื่อวานส่งต่อแอดมิน วันนี้แอดมินตอบ แล้วผู้ใช้เปิดห้อง', 'การ์ด "เรื่องที่ยังไม่ปิดจากวันก่อน" + ป้ายวันเมื่อวาน + ข้อความเมื่อวาน + ป้ายวันนี้ + ข้อความแอดมิน',
    async () => { const t = await txt(u2, '.botscreen'); const days = await u2.locator('.bday').allInnerTexts(); return [t.includes('เรื่องที่ยังไม่ปิดจากวันก่อน') && t.includes('ไม่ได้รับของ แต่ระบบขึ้นว่าส่งแล้ว') && t.includes('ขอตรวจรูปตอนส่ง') && days.length === 2 && days[1].startsWith('วันนี้'), days.join(' / ')]; });
  await u2.screenshot({ path: SH + 'day-5-carry.png' });
  // แอดมิน
  let a = await login('admin'); await a.click('.tabbar [data-go=chats]'); await W(a, 700); await a.click('[data-tab=bot]'); await W(a, 600); await a.click('[data-bthread=U03]'); await W(a, 700);
  await T('DAY-10', 'แอดมิน', 'แอดมินเห็นทุกวันพร้อมตัวคั่นวัน', 'เปิดแชทผู้ช่วยของ User U03', 'ตัวคั่น 3 วัน · เห็นข้อความเก่าทั้งหมด',
    async () => { const d = await a.locator('.bday').allInnerTexts(); const t = await txt(a, '.bchat'); return [d.length === 3 && t.includes('กล่องบุบ') && t.includes('ร้านเปิดกี่โมง'), d.join(' / ')]; });
  await a.click('[data-flt="7d"]'); await W(a, 300);
  const d7 = await a.locator('.bday').allInnerTexts(); const t7 = await txt(a, '.bchat');
  await a.click('[data-flt="admin"]'); await W(a, 300);
  const dA = await a.locator('.bday').allInnerTexts();
  await T('DAY-11', 'แอดมิน', 'ตัวกรอง 7 วันล่าสุด / วันที่มีแอดมินคุย', 'กด "7 วันล่าสุด" แล้วกด "วันที่มีแอดมินคุย"', '7 วัน: เหลือ 2 วัน ไม่มีข้อความ 10 วันก่อน · แอดมินคุย: เหลือ 1 วัน',
    async () => [d7.length === 2 && !t7.includes('ร้านเปิดกี่โมง') && dA.length === 1, d7.join(' / ') + ' | ' + dA.join(' / ')]);
  await a.screenshot({ path: SH + 'day-6-admin.png', fullPage: true });
  // ลบแชทเก่า (เปิดใช้ตอนขึ้น Google Sheet)
  const pg = await E(([a100]) => {
    H.S.insert('BotMessages', { id: 'BMpurge', thread_id: 'BU03', user_id: 'U03', role: 'user', text: 'เก่ามาก', created_at: a100, seq: '1' });
    H.L.handle(H.tok('u03'), 'bot_thread', {}); const kept = !!H.S.list('BotMessages').find(m => m.id === 'BMpurge');
    BOT.PURGE = true; H.L.handle(H.tok('u03'), 'bot_thread', {}); BOT.PURGE = false;
    const all = H.S.list('BotMessages'); return [kept, !all.find(m => m.id === 'BMpurge'), all.some(m => m.text === 'ร้านเปิดกี่โมง')];
  }, [ago(100)]);
  await T('DAY-12', 'เก็บข้อมูล', 'ลบแชทเก่ากว่า 90 วันเมื่อเปิดใช้', 'มีข้อความอายุ 100 วัน · เวอร์ชัน HTML (ปิด) แล้วลองเปิด PURGE', 'ตอนปิด: ยังอยู่ · ตอนเปิด: ข้อความ 100 วันถูกลบ ข้อความ 10 วันยังอยู่',
    async () => [pg[0] && pg[1] && pg[2], pg.join(' / ')]);
  console.log('page errors:', errs.length ? errs : 'none');
  console.log('ผ่าน ' + R.filter(x => x.status === 'ผ่าน').length + '/' + R.length);
  await b.close();
})();
