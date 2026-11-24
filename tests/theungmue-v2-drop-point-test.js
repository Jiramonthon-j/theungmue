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
(async () => {
  b = await chromium.launch(); ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Bangkok' });
  seed = await ctx.newPage(); seed.on('pageerror', e => errs.push('seed: ' + e.message)); await seed.goto(URL); await seed.evaluate(HELP); await E(() => H.reset());
  const NEW = [13.7790615, 100.5612098], PLACE = 'หน้าคณะวิศวกรรมศาสตร์ (ใกล้ป้อมยาม)';
  const J = await E(() => { const o = {}; o.conf = H.mk({ f: { dropoff_zone: 'อาคาร 5 (บัณฑิตวิทยาลัย)' } }); H.to(o.conf, 'confirmed'); o.eng = H.mk({ f: { dropoff_zone: 'คณะวิศวกรรมศาสตร์' } }); H.to(o.eng, 'picked'); H.seen(); return o; });
  const cfg = await E(() => ({ ll: CONFIG.DROP_POINT_LL, place: CONFIG.DROP_POINT_PLACE, m: Object.fromEntries(Object.entries(CONFIG.PLACES).map(([k, v]) => [k, v.m])) }));
  const q = await E(() => ['คณะวิศวกรรมศาสตร์', 'อาคาร 3', 'อาคาร 22', 'อาคาร 5 (บัณฑิตวิทยาลัย)'].map(z => { const r = H.L.handle(H.tok('u03'), 'quote', { mode: 'normal', dropoff_zone: z, item_type: 'เอกสาร / ชีท' }); return z + ':' + r.m + 'm/' + r.tier + '/฿' + r.subtotal; }));
  await T('DP-01', 'จุดรับฝาก', 'พิกัดและชื่อจุดรับฝากใหม่', 'อ่านค่าตั้งต้น', 'พิกัดคณะวิศวกรรมศาสตร์ · "หน้าคณะวิศวกรรมศาสตร์ (ใกล้ป้อมยาม)"', async () => [cfg.ll.join() === NEW.join() && cfg.place === PLACE, cfg.ll.join() + ' · ' + cfg.place]);
  await T('DP-02', 'ระยะ', 'ระยะ ระดับ และราคาคิดจากจุดใหม่', 'ขอราคาไป 4 จุด', 'วิศวะ 30 ม. ใกล้ ฿10 · อาคาร 3 100 ม. ใกล้ ฿10 · อาคาร 22 130 ม. กลาง ฿13 · อาคาร 5 270 ม. ไกล ฿15',
    async () => [q.join('|') === 'คณะวิศวกรรมศาสตร์:30m/ระยะใกล้/฿10|อาคาร 3:100m/ระยะใกล้/฿10|อาคาร 22:130m/ระยะกลาง/฿13|อาคาร 5 (บัณฑิตวิทยาลัย):270m/ระยะไกล/฿15', q.join(' | ')]);
  let u = await login('u01'); await W(u, 500);
  const hero = await txt(u, '.hero');
  await u.locator('[data-svc]').first().click(); await W(u, 700); const form = await txt(u, '.infobox');
  await u.selectOption('select[name=dropoff_zone]', 'อาคาร 5 (บัณฑิตวิทยาลัย)'); await W(u, 600); const dist = (await u.locator('.distrow').first().innerText()).replace(/\s+/g, ' ');
  await T('DP-03', 'หน้าผู้ใช้', 'หน้าแรกและฟอร์มสั่งใช้จุดใหม่', 'เปิดหน้าแรก → ฟอร์มส่งปกติ → เลือกอาคาร 5', 'หน้าแรก "หน้าคณะวิศวกรรมศาสตร์" · ฟอร์ม "จุดรับฝาก... หน้าคณะวิศวกรรมศาสตร์ (ใกล้ป้อมยาม)" · ระยะ 270 ม. เดิน 4 นาที ระยะไกล',
    async () => [hero.includes('หน้าคณะวิศวกรรมศาสตร์') && form.includes(PLACE) && dist.includes('270 ม.') && dist.includes('เดิน 4 นาที') && dist.includes('ระยะไกล'), hero.slice(0, 60) + ' / ' + form.slice(0, 60) + ' / ' + dist.replace(/\s+/g, ' ')]);
  await openJob(u, J.conf); const job = await txt(u, 'main'); const gm = await u.locator('.dropcard a[href*="maps"]').getAttribute('href');
  await T('DP-04', 'หน้าคำสั่ง', 'จุดรับในหน้าคำสั่งและปุ่มดูเส้นทางไปจุดใหม่', 'ผู้สั่งเปิดคำสั่งรอรับของ', '"จุดรับ ... หน้าคณะวิศวกรรมศาสตร์ (ใกล้ป้อมยาม)" · กล่องนำของมาฝากบอกจุดใหม่ · ลิงก์แผนที่ใช้พิกัดใหม่',
    async () => [job.includes(PLACE) && gm.includes(NEW.join(',')), gm]);
  const bot = await E(() => { const t = H.tok('u01'); H.L.handle(t, 'bot_send', { text: 'จุดรับฝากอยู่ไหน' }); return JSON.stringify(H.L.handle(t, 'bot_thread', {})); });
  await T('DP-05', 'น้องถึง', 'น้องถึงตอบจุดรับฝากใหม่', 'ถาม "จุดรับฝากอยู่ไหน"', 'คำตอบมี "หน้าคณะวิศวกรรมศาสตร์ (ใกล้ป้อมยาม)"', async () => [bot.includes(PLACE), (bot.match(/จุดรับฝากอยู่ที่[^"]{0,60}/) || [''])[0]]);
  let a = await login('admin'); await openJob(a, J.eng); await W(a, 1500);
  const same = await a.locator('.mlab').allInnerTexts().catch(() => []); const center = await a.evaluate(() => CONFIG.DROP_POINT_LL.join());
  await T('DP-06', 'แผนที่', 'แผนที่แอดมินเริ่มจากจุดใหม่ · ปลายทางวิศวะ = อาคารเดียวกัน', 'แอดมินเปิดคำสั่งส่งถึงคณะวิศวะ (รับของแล้ว แผนที่กาง)', 'ป้าย "จุดรับฝาก · ปลายทางอยู่ในอาคารเดียวกัน" (ถ้าโหลดแผนที่ได้) · พิกัดตั้งต้นเป็นจุดใหม่',
    async () => [center === NEW.join() && (same.length === 0 || same.join().includes('อาคารเดียวกัน')), center + ' · ' + (same.join() || 'แผนที่ออฟไลน์ในเครื่องทดสอบ')]);
  const pages = [];
  for (const p of [u, a]) pages.push(await p.evaluate(() => document.body.innerText));
  const html = fs.readFileSync(URL.replace('file://', ''), 'utf8');
  await T('DP-07', 'ทั้งเว็บ', 'ไม่มีจุดรับฝากเก่าหลงเหลือ', 'ค้นทั้งไฟล์เว็บและหน้าที่เปิด', 'ไม่มี "ตึกเรือใบ" / "หน้าอาคาร 24" (ยกเว้นคอมเมนต์ที่บอกค่าเดิม) · อาคาร 24 ยังเป็นจุดส่งได้',
    async () => { const hits = html.split('\n').filter(l => /ตึกเรือใบ|หน้าอาคาร 24/.test(l) && !/เดิม: หน้าอาคาร 24 ตึกเรือใบ/.test(l)); return [hits.length === 0 && pages.every(t => !/ตึกเรือใบ|หน้าอาคาร 24/.test(t)) && 'อาคาร 24 (อาคารสัญลักษณ์)' in cfg.m, hits.length + ' จุด']; });
  console.log('page errors:', errs.length ? errs : 'none');
  console.log('ผ่าน ' + R.filter(x => x.status === 'ผ่าน').length + '/' + R.length);
  await b.close();
})();
