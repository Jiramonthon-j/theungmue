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
(async () => {
  b = await chromium.launch(); ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Bangkok' });
  seed = await ctx.newPage(); seed.on('pageerror', e => errs.push('seed: ' + e.message)); await seed.goto(URL); await seed.evaluate(HELP); await E(() => H.reset());
  const j1 = await E(() => H.mk({ f: { dropoff_zone: 'อาคาร 22' } }));
  await E(id => H.to(id, 'delivering'), j1);
  const jOther = await E(() => H.mk({ sender: 'u03', f: { recipient_id: 'U04' } }));
  let u = await login('u01');
  await T('AI-01', 'ปุ่มมาสคอต', 'ผู้ใช้เห็นปุ่มนกลอยบนหน้าแรก', 'เข้าสู่ระบบ u01', 'มีปุ่ม #botfab ที่ขอบขวา มีรูปนก',
    async () => { const v = await u.locator('#botfab').isVisible(); const bb = await u.locator('#botfab').boundingBox(); const bird = await u.locator('#botfab .bird').count(); return [v && bird === 1 && bb.x > 300, 'x=' + Math.round(bb.x) + ' y=' + Math.round(bb.y)]; });
  await T('AI-02', 'ปุ่มมาสคอต', 'ครั้งแรกมีคำแนะนำวิธีใช้', 'เข้าใช้ครั้งแรก', 'ขึ้นกล่อง "แตะเพื่อถามคำถาม · กดค้างแล้วลากเพื่อย้ายได้"',
    async () => { const t = await txt(u, '.fabtip'); return [t.includes('แตะเพื่อถามคำถาม') && t.includes('ลาก'), t]; });
  await u.screenshot({ path: SH + 'ai-1-fab.png' });
  // ลากไปซ้าย
  let bb = await u.locator('#botfab').boundingBox();
  await u.mouse.move(bb.x + 29, bb.y + 29); await u.mouse.down(); await u.mouse.move(150, 300, { steps: 8 }); await u.mouse.move(80, 260, { steps: 8 }); await u.mouse.up(); await W(u, 500);
  await T('AI-03', 'ปุ่มมาสคอต', 'ลากแล้วปล่อย ชิดขอบที่ใกล้กว่า และจำตำแหน่ง', 'ลากปุ่มไปฝั่งซ้ายแล้วปล่อย จากนั้นเปลี่ยนหน้า', 'ปุ่มชิดซ้าย (x=8) ไม่เปิดหน้าผู้ช่วย · เปลี่ยนหน้าแล้วยังอยู่ซ้าย',
    async () => { const b1 = await u.locator('#botfab').boundingBox(); const tip = await u.locator('.fabtip').count(); await u.click('.tabbar [data-go=u-orders]'); await W(u, 500); const b2 = await u.locator('#botfab').boundingBox(); const view = await u.locator('#bchat').count();
      return [Math.round(b1.x) === 8 && Math.round(b2.x) === 8 && view === 0 && tip === 0, 'x=' + Math.round(b1.x) + ' หลังเปลี่ยนหน้า x=' + Math.round(b2.x) + ' y=' + Math.round(b2.y)]; });
  await W(u, 3300);
  await T('AI-04', 'ปุ่มมาสคอต', 'ไม่ได้แตะ 3 วินาทีปุ่มจางลง', 'รอ 3 วินาที', 'ปุ่มมีสถานะ idle (ความทึบ 55%)',
    async () => { const op = await u.locator('#botfab').evaluate(e => getComputedStyle(e).opacity); return [Number(op) < 0.7, 'opacity ' + op]; });
  await u.click('[name=q], .hsearch input'); await W(u, 200);
  await T('AI-05', 'ปุ่มมาสคอต', 'กำลังพิมพ์ ปุ่มซ่อนไม่บังแป้นพิมพ์', 'คลิกช่องค้นหา', 'ปุ่มถูกซ่อน',
    async () => { const v = await u.locator('#botfab').isVisible(); return [!v, 'visible=' + v]; });
  await u.locator('.hsearch input').blur(); await W(u, 200);
  await u.click('#botfab'); await W(u, 700);
  await T('AI-06', 'ห้องผู้ช่วย', 'แตะปุ่มเปิดห้องผู้ช่วย', 'แตะปุ่มนก', 'หน้า "น้องถึง · ผู้ช่วย" ป้าย "ตอบอัตโนมัติ" มีคำทักทาย ปุ่มคำถามด่วน และ "ติดต่อแอดมิน" · ปุ่มนกซ่อน',
    async () => { const t = await txt(u, '.botscreen'); const fv = await u.locator('#botfab').isVisible(); return [t.includes('น้องถึง') && t.includes('ตอบอัตโนมัติ') && t.includes('สวัสดีครับ') && t.includes('ติดต่อแอดมิน') && (await u.locator('[data-bq]').count()) === 4 && !fv, t.slice(0, 90)]; });
  await u.click('[data-bq="ของฉันถึงไหนแล้ว"]'); await W(u, 700);
  await T('AI-07', 'ห้องผู้ช่วย', 'ถามสถานะ ตอบจากข้อมูลจริงพร้อมการ์ดคำสั่ง', 'กดคำถามด่วน "ของฉันถึงไหนแล้ว" (มีคำสั่งกำลังนำส่ง 1 รายการ)', 'ตอบเลขคำสั่ง + "กำลังนำส่ง" + การ์ดมีปุ่ม "เปิดคำสั่งนี้" · ผู้ใช้ไม่เห็น % ความมั่นใจ',
    async () => { const t = await lastBot(u); const card = await u.locator('.bcard').count(); const meta = await u.locator('.bmeta').count(); return [t.includes(j1) && t.includes('กำลังนำส่ง') && card === 1 && meta === 0 && !t.includes('มั่นใจ'), t.slice(0, 120)]; });
  await u.screenshot({ path: SH + 'ai-2-status.png', fullPage: true });
  let t8 = await ask(u, 'ต้องจ่ายเท่าไร');
  const tot = await E(id => H.job(id).total, j1);
  await T('AI-08', 'ห้องผู้ช่วย', 'ถามต่อโดยไม่ต้องพิมพ์เลขคำสั่งซ้ำ', 'พิมพ์ "ต้องจ่ายเท่าไร"', 'ตอบยอดของคำสั่งเดิม ฿' + tot + ' ว่าชำระแล้ว',
    async () => [t8.includes(j1) && t8.includes('฿' + tot) && t8.includes('ชำระแล้ว'), t8]);
  let t9 = await ask(u, jOther + ' ถึงไหนแล้ว');
  await T('AI-09', 'ความปลอดภัย', 'ถามคำสั่งของคนอื่น ไม่แสดงข้อมูล', 'พิมพ์เลขคำสั่งของ u03', 'ตอบว่าไม่ใช่คำสั่งของคุณ แสดงข้อมูลไม่ได้',
    async () => [t9.includes('ไม่ใช่คำสั่งที่คุณเป็นผู้สั่งหรือผู้รับ') && !t9.includes('User U03'), t9]);
  let t10 = await ask(u, 'ขอรหัสรับของหน่อย');
  const code = await E(id => H.job(id).code, j1);
  await T('AI-10', 'ความปลอดภัย', 'ไม่บอกรหัสรับของในแชท', 'พิมพ์ "ขอรหัสรับของหน่อย"', 'อธิบายว่าดูรหัสได้ในหน้าคำสั่ง ไม่มีรหัส 4 หลักจริงในคำตอบ',
    async () => [t10.includes('ไม่แสดงรหัส') && !t10.includes(code), t10.slice(0, 90)]);
  let t11 = await ask(u, 'ฝากไว้ที่ป้อมยามแทนได้มั้ย');
  await T('AI-11', 'ไม่แน่ใจ', 'มั่นใจต่ำกว่า 60% ถามกลับพร้อมตัวเลือก', 'พิมพ์คำถามที่ไม่ได้สอนไว้', 'ถาม "หมายถึงข้อใด" มี 3 ตัวเลือก (2 ประเภท + ไม่ใช่ ติดต่อแอดมิน)',
    async () => { const n = await u.locator('#bchat .bopts').last().locator('button').allInnerTexts(); return [t11.includes('ยังไม่แน่ใจ') && n.length === 3 && n[2].includes('ติดต่อแอดมิน'), n.join(' / ')]; });
  await u.screenshot({ path: SH + 'ai-3-clarify.png', fullPage: true });
  await u.locator('#bchat .bopts').last().locator('button').nth(1).click(); await W(u, 700);
  await T('AI-12', 'ไม่แน่ใจ', 'เลือกตัวเลือกแล้วผู้ช่วยตอบเรื่องนั้น', 'กดตัวเลือก "วิธีจ่าย / ปลายทาง"', 'ข้อความผู้ใช้เป็นชื่อตัวเลือก ผู้ช่วยตอบวิธีจ่าย ตัวเลือกเดิมกดซ้ำไม่ได้',
    async () => { const all = await botMsgs(u); const dis = await u.locator('#bchat .bopts').last().locator('button').first().isDisabled(); return [dis && all.slice(-1)[0].includes('จ่ายได้ 2 แบบ'), all.slice(-2).join(' | ').replace(/\s+/g, ' ').slice(0, 140)]; });
  // หลายคำสั่ง: ถามว่าคำสั่งไหน
  const j2 = await E(() => H.mk({ f: { dropoff_zone: 'คณะบัญชี' } }));
  let t13 = await ask(u, 'ส่งหรือยัง');
  await T('AI-13', 'ห้องผู้ช่วย', 'มีหลายคำสั่ง ถามกลับว่าคำสั่งไหน', 'มีคำสั่งดำเนินการ 2 รายการ พิมพ์ "ส่งหรือยัง" (ถามคำสั่งเดิมไปแล้ว จึงต้องล้างคำสั่งที่ค้างก่อน)', 'ตอบคำสั่งที่คุยค้างอยู่ หรือถามว่าหมายถึงคำสั่งไหน',
    async () => [t13.includes(j1) || t13.includes('หมายถึงคำสั่งไหน'), t13.slice(0, 100)]);
  // ส่งต่อแอดมินอัตโนมัติ
  let t14 = await ask(u, 'กล่องที่ได้เมื่อวานบุบ ขอคืนเงินได้ไหม');
  await T('AI-14', 'ส่งต่อแอดมิน', 'เรื่องของเสียหายส่งต่อแอดมินทันที', 'พิมพ์ "กล่องที่ได้เมื่อวานบุบ ขอคืนเงินได้ไหม"', 'ตอบว่าต้องให้แอดมินดูแล + แถบ "ส่งต่อแอดมินแล้ว · คิวที่ 1" ป้ายหัวเป็น "แอดมินดูแลอยู่" ปุ่มติดต่อแอดมินหายไป',
    async () => { const sys = await txt(u, '.bsys'); const tag = await txt(u, '.btag'); const btn = await u.locator('.toadmin').count(); return [/ของเสียหาย|คืนเงิน/.test(t14) && sys.includes('ส่งต่อแอดมินแล้ว · คิวที่ 1') && tag === 'แอดมินดูแลอยู่' && btn === 0, t14 + ' / ' + sys + ' / ' + tag]; });
  await u.screenshot({ path: SH + 'ai-4-handoff.png', fullPage: true });
  const nBefore = (await botMsgs(u)).length; await u.fill('#bmsg', 'รบกวนด้วยครับ'); await u.click('#bsend button'); await W(u, 700);
  await T('AI-15', 'ส่งต่อแอดมิน', 'หลังส่งต่อ ผู้ช่วยหยุดตอบ', 'พิมพ์ข้อความเพิ่ม', 'มีเฉพาะข้อความของผู้ใช้เพิ่ม 1 ข้อความ ผู้ช่วยไม่ตอบ',
    async () => { const n = (await botMsgs(u)).length; return [n === nBefore + 1, 'ข้อความ ' + nBefore + ' → ' + n]; });
  // แอดมิน
  let a = await login('admin');
  await T('AI-16', 'แอดมิน', 'แอดมินไม่มีปุ่มนก · เมนูแชทมีตัวเลขเรื่องที่รอ', 'เข้าสู่ระบบแอดมิน', 'ไม่มีปุ่มนก · ป้าย 1 บนเมนู "แชท"',
    async () => { await W(a, 600); const f = await a.locator('#botfab').isVisible().catch(() => false); const nb = await a.locator('.tabbar [data-go=chats] .navbadge').innerText().catch(() => ''); return [!f && nb.trim() === '1', 'fab=' + f + ' badge=' + nb]; });
  await a.click('.tabbar [data-go=chats]'); await W(a, 800);
  await T('AI-17', 'แอดมิน', 'แท็บ "รอแอดมิน" มีสรุปเรื่องจากผู้ช่วย', 'แอดมินกดเมนู "แชท"', 'การ์ด User U01 ป้ายเหตุผล "ของเสียหาย" สรุปมีข้อความลูกค้าและเลขคำสั่ง ปุ่ม "เปิดแชท"',
    async () => { const t = await txt(a, '.bq'); return [t.includes('User U01') && t.includes('ของเสียหาย') && t.includes('สรุปจากผู้ช่วย') && t.includes('บุบ') && t.includes(j1) && t.includes('เปิดแชท'), t.slice(0, 160)]; });
  await a.screenshot({ path: SH + 'ai-5-queue.png', fullPage: true });
  await a.click('.bq [data-bthread]'); await W(a, 800);
  await T('AI-18', 'แอดมิน', 'แอดมินเห็นว่า AI เข้าใจคำถามว่าอะไร มั่นใจกี่ %', 'เปิดแชท', 'ใต้ข้อความผู้ใช้มี "เข้าใจว่า: ... · มั่นใจ ...%" และข้อความที่ต่ำกว่าเกณฑ์เป็นสีแดง',
    async () => { const m = await a.locator('.bmeta').allInnerTexts(); const low = await a.locator('.bmeta.low').count(); return [m.length >= 4 && m.some(x => /เข้าใจว่า: ถามสถานะ · มั่นใจ \d+%/.test(x)) && low >= 1, m.slice(0, 4).join(' | ')]; });
  await a.screenshot({ path: SH + 'ai-6-admin-thread.png', fullPage: true });
  await a.fill('#amsg', 'รับเรื่องแล้วครับ ขอรูปกล่อง 1-2 รูป'); await a.click('#asend button'); await W(a, 700);
  await u.click('[data-act=nav-back]'); await W(u, 400); await u.evaluate(() => {}); await W(u, 8500);
  await T('AI-19', 'แอดมิน', 'แอดมินตอบแล้ว ปุ่มนกของผู้ใช้ขึ้นจุดแดง', 'แอดมินพิมพ์ตอบ ผู้ใช้อยู่หน้าอื่น', 'จุดแดงบนปุ่มนก · เปิดห้องแล้วเห็นข้อความ "แอดมิน" และจุดแดงหาย',
    async () => { const d1 = await u.locator('#botfab .fabdot').isVisible(); await u.click('#botfab'); await W(u, 700); const t = await txt(u, '.brow.admin'); await u.click('[data-act=nav-back]'); await W(u, 500); const d2 = await u.locator('#botfab .fabdot').isVisible(); return [d1 && !d2 && t.includes('แอดมิน') && t.includes('ขอรูปกล่อง'), 'ก่อน=' + d1 + ' หลัง=' + d2 + ' / ' + t]; });
  await a.click('[data-act=bot-close]'); await W(a, 200); await a.click('[data-act=bot-close]'); await W(a, 800);
  await u.click('#botfab'); await W(u, 700);
  let t20 = await ask(u, 'ร้านเปิดกี่โมง');
  await T('AI-20', 'ส่งต่อแอดมิน', 'แอดมินปิดเรื่อง ผู้ช่วยกลับมาตอบ', 'แอดมินกด "ปิดเรื่อง" (กด 2 ครั้งยืนยัน) ผู้ใช้ถามต่อ', 'ข้อความระบบ "แอดมินปิดเรื่องแล้ว" ป้าย "ตอบอัตโนมัติ" ผู้ช่วยตอบเวลาเปิดร้าน',
    async () => { const sys = (await u.locator('.bsys').allInnerTexts()).join(' / '); const tag = await txt(u, '.btag'); return [sys.includes('แอดมินปิดเรื่องแล้ว') && tag === 'ตอบอัตโนมัติ' && t20.includes('08:00–18:00'), tag + ' / ' + t20]; });
  await u.click('.toadmin'); await W(u, 700);
  await T('AI-21', 'ส่งต่อแอดมิน', 'ผู้ใช้กด "ติดต่อแอดมิน" เอง', 'กดปุ่ม "ติดต่อแอดมิน"', 'ส่งต่อแอดมิน เหตุผล "กดติดต่อแอดมิน"',
    async () => { const q = await E(() => H.L.handle(H.tok('admin'), 'bot_queue', {}).waiting); return [q.length === 1 && q[0].reason_label === 'กดติดต่อแอดมิน', q.map(x => x.reason_label).join()]; });
  // ภาพรวม + สอนเพิ่ม
  await a.click('[data-act=nav-back]'); await W(a, 500); await a.click('.tabbar [data-go=a-home]'); await W(a, 900); await a.click('[data-htab=bot]'); await W(a, 900);
  await T('AI-22', 'ภาพรวม', 'ภาพรวมมีผลงานผู้ช่วย AI', 'แอดมินเปิด "ภาพรวม"', 'มีจำนวนคำถาม % ตอบจบเอง ส่งต่อแอดมิน ประเภทคำถาม และคำถามที่ไม่เข้าใจ',
    async () => { const t = await txt(a, '#botstats'); return [t.includes('คำถามถึงผู้ช่วย') && t.includes('ผู้ช่วยตอบจบเอง') && t.includes('ส่งต่อแอดมิน') && t.includes('ประเภทคำถาม') && t.includes('ป้อมยาม'), t.slice(0, 160)]; });
  await T('AI-23', 'ภาพรวม', 'ผลชุดทดสอบความแม่นยำ', 'ดูกล่องชุดทดสอบ', 'ชุดทดสอบ 62 ประโยค จำแนกถูก 62 (100%) ตอบได้ทันทีมากกว่า 80%',
    async () => { const s = await E(() => H.L.handle(H.tok('admin'), 'bot_stats', {}).accuracy); const t = await txt(a, '.bacc'); return [s.total === 62 && s.correct === 62 && s.direct / s.total > 0.8 && t.includes('จำแนกถูก 62'), 'ถูก ' + s.correct + '/' + s.total + ' ตอบได้ทันที ' + s.direct + ' / ' + t.slice(0, 80)]; });
  await a.locator('#botstats').scrollIntoViewIfNeeded(); await a.screenshot({ path: SH + 'ai-7-stats.png', fullPage: true });
  const tq = a.locator('.tq', { hasText: 'ป้อมยาม' }); await tq.locator('select').selectOption('change_dest'); await tq.locator('[data-teach]').click(); await W(a, 700);
  const after = await E(() => { H.L.handle(H.tok('admin'), 'bot_close', { user_id: 'U01' }); return H.L.handle(H.tok('u01'), 'bot_send', { text: 'ฝากไว้ที่ป้อมยามแทนได้มั้ย' }); });
  await T('AI-24', 'ภาพรวม', 'แอดมินสอนเพิ่ม แล้วผู้ช่วยเข้าใจคำถามเดิม', 'เลือก "เปลี่ยนจุดส่ง" กด "เพิ่มเป็นตัวอย่าง" แล้วถามประโยคเดิมอีกครั้ง', 'คำถามหายจากรายการ · ครั้งใหม่มั่นใจ ≥ 60% ไม่ต้องถามกลับ',
    async () => { const left = await a.locator('.tq', { hasText: 'ป้อมยาม' }).count(); const n = await E(() => H.S.list('BotExamples').length); return [left === 0 && n === 1 && after.conf >= 0.6 && !after.low, 'ตัวอย่างเพิ่ม ' + n + ' · มั่นใจ ' + after.conf + ' ' + after.intent]; });
  const perm = await E(() => [H.err(() => H.L.handle(H.tok('u02'), 'bot_queue', {})), H.err(() => H.L.handle(H.tok('u02'), 'bot_admin_thread', { user_id: 'U01' })), H.err(() => H.L.handle(H.tok('admin'), 'bot_send', { text: 'x' }))]);
  await T('AI-25', 'ความปลอดภัย', 'สิทธิ์การใช้งาน', 'u02 เรียกคิวแอดมิน/อ่านแชทคนอื่น · แอดมินส่งในห้องผู้ช่วย', 'ปฏิเสธทั้งหมด',
    async () => [perm[0] === 'เฉพาะแอดมิน' && perm[1] === 'เฉพาะแอดมิน' && perm[2] === 'ใช้ได้เฉพาะผู้ใช้', perm.join(' / ')]);
  console.log('page errors:', errs.length ? errs : 'none');
  fs.writeFileSync(require('path').resolve(__dirname, 'shots/bot-results.json'), JSON.stringify(R, null, 1));
  console.log('ผ่าน ' + R.filter(x => x.status === 'ผ่าน').length + '/' + R.length);
  await b.close();
})();
