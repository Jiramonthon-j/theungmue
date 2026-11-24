// TheungMue v2 — ชุดทดสอบ: เข้าสู่ระบบได้ทีละเครื่อง (ยกเว้นแอดมิน)
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
const nav = async (p, go) => { await p.click('.tabbar [data-go=' + go + ']'); await W(p, 800); };
const state = async p => (await p.locator('#loginf').count()) ? 'login:' + ((await p.locator('.notice, .authnote, .info.bad, .flash').first().innerText().catch(() => '')) || (await p.locator('.auth').innerText()).slice(0, 0)) : 'in:' + (await p.locator('.rolechip').innerText().catch(() => '?'));
const authText = async p => (await p.locator('.auth').innerText().catch(() => '')).replace(/\s+/g, ' ');
(async () => {
  b = await chromium.launch(); ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Bangkok' });
  seed = await ctx.newPage(); seed.on('pageerror', e => errs.push('seed: ' + e.message)); await seed.goto(URL); await seed.evaluate(HELP); await E(() => H.reset());
  const A = await login('u01');
  await T('SS-01', 'เข้าสู่ระบบทีละเครื่อง', 'เครื่องแรกเข้าได้', 'u01 เข้าสู่ระบบที่เครื่อง A', 'เข้าได้', async () => { const s = await state(A); return [s.startsWith('in:'), s]; });
  const B = await login('u01');
  await T('SS-02', 'เข้าสู่ระบบทีละเครื่อง', 'เครื่องใหม่เข้าได้', 'u01 เข้าสู่ระบบที่เครื่อง B ขณะ A ยังเปิดอยู่', 'B เข้าได้', async () => { const s = await state(B); return [s.startsWith('in:'), s]; });
  await nav(A, 'u-orders');
  await T('SS-03', 'เข้าสู่ระบบทีละเครื่อง', 'เครื่องเก่าหลุดพร้อมเหตุผล', 'เครื่อง A กดไปหน้าคำสั่งของฉัน', 'กลับหน้าเข้าสู่ระบบ บอกว่าเข้าจากอุปกรณ์อื่น', async () => { const t = await authText(A); return [(await A.locator('#loginf').count()) === 1 && t.includes('อุปกรณ์อื่น'), t.slice(0, 120)]; });
  await nav(B, 'u-orders');
  await T('SS-04', 'เข้าสู่ระบบทีละเครื่อง', 'เครื่องใหม่ยังใช้ได้', 'เครื่อง B กดไปหน้าคำสั่งของฉัน', 'ยังอยู่ในระบบ', async () => { const s = await state(B); return [s.startsWith('in:'), s]; });
  // ใส่รหัสผิดที่เครื่องใหม่ ไม่ทำให้เครื่องเดิมหลุด
  const C = await ctx.newPage(); await C.goto(URL); await C.fill('#loginf [name=username]', 'u01'); await C.fill('#loginf [name=password]', 'wrongpass'); await C.click('#loginf #submit'); await W(C, 700);
  await nav(B, 'u-home');
  await T('SS-05', 'เข้าสู่ระบบทีละเครื่อง', 'รหัสผิดไม่เตะเครื่องเดิม', 'เครื่อง C ใส่รหัส u01 ผิด แล้ว B ใช้งานต่อ', 'B ยังอยู่ในระบบ', async () => { const s = await state(B); return [s.startsWith('in:'), s]; });
  await A.fill('#loginf [name=username]', 'u01'); await A.fill('#loginf [name=password]', 'demo1234'); await A.click('#loginf #submit'); await W(A, 800);
  await nav(B, 'u-orders');
  await T('SS-06', 'เข้าสู่ระบบทีละเครื่อง', 'กลับมาเข้าเครื่องเดิมได้ เครื่องอื่นหลุดแทน', 'A เข้าสู่ระบบใหม่ แล้ว B กดเปลี่ยนหน้า', 'A เข้าได้ · B หลุด', async () => { const a = await state(A), t = await authText(B); return [a.startsWith('in:') && t.includes('อุปกรณ์อื่น'), a + ' / ' + t.slice(0, 60)]; });
  const X = await login('admin'), Y = await login('admin');
  await nav(X, 'a-home'); await nav(Y, 'a-home');
  await T('SS-07', 'เข้าสู่ระบบทีละเครื่อง', 'แอดมินเข้าได้หลายเครื่อง', 'admin เข้า 2 เครื่อง แล้วทั้งสองกดเปลี่ยนหน้า', 'ทั้งสองเครื่องยังอยู่ในระบบ', async () => { const x = await state(X), y = await state(Y); return [x.startsWith('in:') && y.startsWith('in:'), x + ' / ' + y]; });
  // บัญชีอื่นไม่โดนผลกระทบ
  const P = await login('u02'); await login('u03'); await nav(P, 'u-orders');
  await T('SS-08', 'เข้าสู่ระบบทีละเครื่อง', 'ไม่กระทบบัญชีอื่น', 'u02 เข้าอยู่ แล้ว u03 เข้าเครื่องอื่น', 'u02 ยังอยู่ในระบบ', async () => { const s = await state(P); return [s.startsWith('in:'), s]; });
  await A.screenshot({ path: SH + 'ss-kicked.png' });
  console.log('page errors:', errs.length ? errs.join(' | ') : 'none');
  await b.close();
})();
