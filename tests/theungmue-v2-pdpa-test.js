// TheungMue v2.30 — ชุดทดสอบ: ประกาศความเป็นส่วนตัว (PDPA) ตอนสมัครและผู้ใช้เดิม
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
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push('reg: ' + e.message)); await p.goto(URL); await W(p, 500);
  await p.click('[data-auth=register]'); await W(p, 500);
  const d0 = await p.locator('#submit').isDisabled(), c0 = await p.locator('#pdpaok').count();
  await p.click('.pdcheck span', { position: { x: 5, y: 8 } }); await W(p, 200); const d1 = await p.locator('#submit').isDisabled();
  await p.click('.pdcheck span', { position: { x: 5, y: 8 } }); await W(p, 200); const d2 = await p.locator('#submit').isDisabled();
  await T('PD-01', 'หน้าสมัคร', 'ต้องติ๊กยอมรับประกาศก่อนสมัคร', 'เปิดหน้าสมัคร ติ๊ก แล้วเอาติ๊กออก', 'มีช่องติ๊ก · ปุ่มสมัครกดไม่ได้ → ติ๊กแล้วกดได้ → เอาออกกดไม่ได้',
    async () => [c0 === 1 && d0 && !d1 && d2, 'ช่อง=' + c0 + ' ' + d0 + '→' + d1 + '→' + d2]);
  await p.click('#pdpalink'); await W(p, 500);
  const sh = await txt(p, '.pdpasheet'); await p.screenshot({ path: SH + 'pdpa-sheet.png' });
  await p.click('.pdfoot .btn'); await W(p, 300);
  const ck = await p.locator('#pdpaok').isChecked(), gone = await p.locator('.pdpasheet').count();
  await T('PD-02', 'ประกาศ', 'กดลิงก์เปิดประกาศเต็ม และกด "อ่านแล้ว ยอมรับ" แล้วติ๊กให้', 'กดลิงก์ "ประกาศความเป็นส่วนตัว" → อ่าน → กดยอมรับ', 'มีหัวข้อครบ (ใครเก็บ เก็บอะไร ใช้ทำอะไร ใครเห็น เก็บนานเท่าไร ลบบัญชี เบอร์ผู้รับ สิทธิ์) ตัวเลข 30/7/90 วัน · ปิดแล้วติ๊กให้',
    async () => [['ใครเก็บข้อมูล', 'เก็บอะไร', 'ใช้ทำอะไร', 'ใครเห็น', 'เก็บนานเท่าไร', 'เมื่อลบบัญชี', 'เบอร์ของผู้รับ', 'สิทธิ์ของคุณ', 'BV401', '30 วัน', '7 วันหลังจบงาน', '90 วัน', 'nice1162', 'ฉบับวันที่ 24 พ.ย. 2569'].every(x => sh.includes(x)) && ck && gone === 0, sh.slice(0, 80) + ' · ติ๊ก=' + ck]);
  await p.fill('#regf [name=username]', 'pdpa01'); await p.fill('#regf [name=name]', 'ทดสอบ พีดีพีเอ'); await p.fill('#regf [name=phone]', '0861112222');
  await p.fill('#regf [name=password]', 'abcd1234'); await p.fill('#regf [name=password2]', 'abcd1234'); await W(p, 700); await p.click('#submit'); await W(p, 900);
  const r3 = await E(() => { const u = H.S.list('Users').find(x => x.username === 'pdpa01'); return [u && u.pdpa_ver, u && !!u.pdpa_at, H.err(() => H.L.handle(null, 'register', { username: 'pdpa02', name: 'ไม่ยอมรับ', phone: '0861113333', password: 'abcd1234' }))]; });
  await T('PD-03', 'หน้าสมัคร', 'สมัครแล้วบันทึกเวลาและฉบับที่ยอมรับ · เซิร์ฟเวอร์ไม่รับถ้าไม่ยอมรับ', 'สมัครผ่านหน้าเว็บ / เรียกสมัครโดยไม่ส่งการยอมรับ', 'pdpa_ver = 2569-11-24 · มีเวลา · เรียกตรงถูกปฏิเสธ',
    async () => [r3[0] === '2569-11-24' && r3[1] && /ยอมรับประกาศความเป็นส่วนตัว/.test(r3[2]), r3.join(' / ')]);
  // ผู้ใช้เดิมที่ยังไม่ยอมรับ: ถามครั้งเดียว
  await E(() => { const u = H.S.list('Users').find(x => x.username === 'u03'); H.S.update('Users', u.id, { pdpa_ver: '', pdpa_at: '' }); });
  const blk = await E(() => H.err(() => H.L.handle(H.tok('u03'), 'jobs', {})));
  const v = await login('u03'); await W(v, 600);
  const fv = await txt(v, '#app'), tb = await v.locator('.tabbar').count(), fab = await v.locator('#botfab:visible').count();
  await v.screenshot({ path: SH + 'pdpa-force.png', fullPage: true });
  await T('PD-04', 'ผู้ใช้เดิม', 'บัญชีที่สมัครก่อนมีประกาศ ต้องกดยอมรับก่อนใช้งาน', 'ล้างการยอมรับของ u03 แล้วเข้าสู่ระบบ', 'ขึ้นหน้า "ประกาศความเป็นส่วนตัว" · ไม่มีเมนูล่างและปุ่มนก · เรียกข้อมูลอื่นถูกปฏิเสธ',
    async () => [fv.includes('กรุณาอ่านและกดยอมรับครั้งเดียว') && fv.includes('เก็บนานเท่าไร') && tb === 0 && fab === 0 && /ยอมรับประกาศความเป็นส่วนตัวก่อนใช้งาน/.test(blk), 'เมนู=' + tb + ' นก=' + fab + ' / ' + blk]);
  await v.click('#pdok'); await W(v, 900);
  const r5 = await E(() => { const u = H.S.list('Users').find(x => x.username === 'u03'); return [u.pdpa_ver, H.S.list('Logs').some(l => l.action === 'pdpa_accept' && l.user_id === u.id)]; });
  const home = await v.locator('.tabbar [data-go=u-home].on').count();
  await v.click('.tabbar [data-go=profile]'); await W(v, 500); await v.click('[data-act=logout]'); await W(v, 700);
  await v.fill('#loginf [name=username]', 'u03'); await v.fill('#loginf [name=password]', 'demo1234'); await v.click('#loginf #submit'); await W(v, 900);
  const again = await v.locator('#pdok').count(), home2 = await v.locator('.tabbar [data-go=u-home].on').count();
  await T('PD-05', 'ผู้ใช้เดิม', 'กดยอมรับครั้งเดียว เข้าสู่ระบบครั้งต่อไปไม่ถามอีก', 'กด "อ่านแล้ว ยอมรับ" → ออกจากระบบ → เข้าสู่ระบบใหม่', 'บันทึกฉบับ + ประวัติการใช้งาน · ไปหน้าแรก · เข้าสู่ระบบใหม่ไม่ถามซ้ำ ตรงหน้าแรกเลย',
    async () => [r5[0] === '2569-11-24' && r5[1] && home === 1 && again === 0 && home2 === 1, r5.join(' / ') + ' หน้าแรก=' + home + ' ถามซ้ำ=' + again + ' หน้าแรกรอบ 2=' + home2]);
  await v.click('.tabbar [data-go=profile]'); await W(v, 700); await v.click('[data-act=privacy]'); await W(v, 500);
  const pv = await txt(v, '.pdpasheet'), pb = await txt(v, '.pdfoot .btn'); await v.click('.pdfoot .btn'); await W(v, 300);
  await T('PD-06', 'โปรไฟล์', 'อ่านประกาศย้อนหลังได้จากโปรไฟล์', 'โปรไฟล์ → "ประกาศความเป็นส่วนตัว"', 'เปิดประกาศ ปุ่มเป็น "ปิด" กดแล้วปิด',
    async () => [pv.includes('ใครเก็บข้อมูล') && pb === 'ปิด' && (await v.locator('.pdpasheet').count()) === 0, pb]);
  await E(() => { const u = H.S.list('Users').find(x => x.username === 'admin'); H.S.update('Users', u.id, { pdpa_ver: '' }); });
  const a = await login('admin'); await W(a, 600); const at = await a.locator('#pdok').count(), an = await a.locator('.tabbar').count();
  await T('PD-07', 'แอดมิน', 'แอดมินไม่ต้องกดยอมรับ', 'แอดมินเข้าสู่ระบบ', 'เข้าหน้าคำสั่งตามปกติ', async () => [at === 0 && an === 1, 'ถาม=' + at + ' เมนู=' + an]);
  await T('ERR-00', 'ทั่วไป', 'ไม่มีข้อผิดพลาด JavaScript', 'ตลอดการทดสอบ', 'ไม่มี', async () => [errs.length === 0, errs.join(' | ') || 'ไม่มี']);
  console.log('ผ่าน ' + R.filter(x => x.status === 'ผ่าน').length + '/' + R.length);
  await b.close();
})();
