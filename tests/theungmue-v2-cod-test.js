// TheungMue v2.29 — ชุดทดสอบ: ผู้รับไม่ต้องสมัคร · เก็บเงินปลายทาง · ลิงก์ติดตาม · ส่งใหม่ · ส่งช้า
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
  const bal = u => E(u => H.L.handle(H.tok(u), 'points', {}).balance, u);
  // ===== สั่งส่งของถึงคนที่ไม่มีบัญชี =====
  let u = await login('u01'); await u.click('[data-svc=normal]'); await W(u);
  const f1 = await u.locator('[name=recipient_id]').count(), f2 = await u.locator('[name=recipient_name]').count(), f3 = await u.locator('[name=recipient_phone]').count(), f4 = await u.locator('[name=recipient_consent]').count();
  await T('RCP-01', 'ผู้รับไม่ต้องสมัคร', 'หน้าสั่งกรอกชื่อและเบอร์ผู้รับแทนการเลือกสมาชิก', 'ผู้สั่งเปิดหน้าสั่งบริการ', 'ไม่มีช่องเลือกสมาชิก · มีชื่อ เบอร์ และช่องติ๊กผู้รับยินยอม',
    async () => [f1 === 0 && f2 === 1 && f3 === 1 && f4 === 1, 'เลือกสมาชิก=' + f1 + ' ชื่อ=' + f2 + ' เบอร์=' + f3 + ' ยินยอม=' + f4]);
  await u.selectOption('[name=item_type]', 'เอกสาร / ชีท'); await u.fill('[name=item_detail]', 'รายงานกลุ่ม'); await u.setInputFiles('#photoin', require('path').resolve(__dirname, 'fixtures/p.jpg')); await W(u);
  await u.selectOption('[name=dropoff_zone]', 'อาคาร 22'); await u.fill('[name=recipient_name]', 'บีม'); await u.fill('[name=recipient_phone]', '089-123-4567'); await u.check('[name=recipient_consent]', { force: true });
  await u.click('label:has([name=pay_method][value=cod])'); await W(u, 300);
  const cb = await u.locator('#codbox').isVisible();
  await u.click('#submit'); await W(u, 600); const pe = await txt(u, '#payerr'); const n0 = await E(() => H.S.list('Jobs').length);
  await T('COD-01', 'เก็บเงินปลายทาง', 'เลือกปลายทางต้องยืนยันว่าผู้รับตกลงจ่าย', 'เลือกเก็บเงินปลายทาง แล้วกดยืนยันโดยไม่ติ๊ก', 'ขึ้นกล่องยืนยัน · ไม่สร้างคำสั่ง · แจ้ง "ติ๊กยืนยันว่าผู้รับตกลงจ่าย"',
    async () => [cb && n0 === 0 && pe.includes('ผู้รับตกลงจ่าย'), 'กล่อง=' + cb + ' คำสั่ง=' + n0 + ' / ' + pe]);
  await u.check('[name=cod_agreed]', { force: true }); await u.click('#submit'); await W(u, 1000);
  const j1 = await E(() => H.S.list('Jobs')[0]);
  await T('COD-02', 'เก็บเงินปลายทาง', 'ติ๊กแล้วสั่งได้ทันที ไม่ต้องรอผู้รับกดยอมรับ', 'ติ๊กยืนยันแล้วกดสั่ง', 'รอยืนยัน · cod_status=accepted · ผู้รับไม่มีบัญชี (recipient_id ว่าง) · เบอร์ 0891234567',
    async () => [j1.status === 'pending' && j1.cod_status === 'accepted' && j1.cod_agreed === '1' && j1.recipient_id === '' && j1.recipient_phone === '0891234567' && j1.recipient_name === 'บีม', j1.status + ' / ' + j1.cod_status + ' / rid=' + (j1.recipient_id || 'ว่าง') + ' / ' + j1.recipient_phone]);
  const sc = await txt(u, '.sharecard'); const link = await E(() => null); const lineBtn = await u.locator('#shareline').count();
  await T('RCP-02', 'แจ้งผู้รับ', 'ผู้สั่งเห็นรหัสและข้อความพร้อมส่งให้ผู้รับ', 'เปิดหน้าคำสั่งหลังสั่ง', 'การ์ด "แจ้งผู้รับ" มีรหัส 4 หลัก ข้อความมีรหัส ยอดปลายทาง ลิงก์ ?t= · ปุ่มส่งทาง LINE และคัดลอก',
    async () => [sc.includes('แจ้งผู้รับ') && sc.includes(j1.code) && sc.includes('ชำระเงินสดปลายทาง ฿13') && sc.includes('?t=' + j1.track_token) && lineBtn === 1, sc.slice(0, 160)]);
  await u.screenshot({ path: SH + 'rcp-share.png', fullPage: true });
  const v1 = await E(() => [
    H.err(() => H.mk({ f: { recipient_id: '', recipient_name: 'ก', recipient_phone: '12345', recipient_consent: 1 } })),
    H.err(() => H.mk({ f: { recipient_id: '', recipient_name: 'ก', recipient_phone: '0800000001', recipient_consent: 1 } })),
    H.err(() => H.mk({ f: { recipient_id: '', recipient_name: 'ก', recipient_phone: '0899999999' } })),
    H.err(() => H.mk({ f: { recipient_id: '', recipient_name: '', recipient_phone: '0899999999', recipient_consent: 1 } }))]);
  await T('RCP-03', 'ผู้รับไม่ต้องสมัคร', 'ตรวจข้อมูลผู้รับฝั่งเซิร์ฟเวอร์', 'เบอร์ผิดรูปแบบ / เบอร์ตัวเอง / ไม่ติ๊กยินยอม / ไม่มีชื่อ', 'ปฏิเสธทั้ง 4 กรณี',
    async () => [v1.every(x => x !== 'OK'), v1.join(' | ')]);
  const rc = await E(() => H.L.handle(H.tok('u01'), 'recipients', {}).recent);
  await u.click('[data-act=nav-back]'); await W(u, 500); await u.click('[data-svc=normal]'); await W(u, 800);
  await u.click('.rchip'); await W(u, 200); const rn = await u.inputValue('[name=recipient_name]'), rp = await u.inputValue('[name=recipient_phone]');
  await T('RCP-04', 'ผู้รับไม่ต้องสมัคร', 'มีปุ่ม "เคยส่งให้" เติมชื่อและเบอร์ให้', 'เปิดหน้าสั่งอีกครั้ง แล้วกดชื่อ "บีม"', 'ชื่อ บีม · เบอร์ 0891234567',
    async () => [rc.length >= 1 && rn === 'บีม' && rp.replace(/\D/g, '') === '0891234567', rn + ' / ' + rp]);
  // ===== ลิงก์ติดตามสาธารณะ =====
  const tr = await ctx.newPage(); tr.on('pageerror', e => errs.push('track: ' + e.message));
  await tr.goto(URL + '?t=' + j1.track_token); await W(tr, 900);
  const tt = await txt(tr, '#app'); const lf = await tr.locator('#loginf').count();
  await T('TRK-01', 'ลิงก์ติดตาม', 'ผู้รับเปิดลิงก์ได้โดยไม่ต้องเข้าสู่ระบบ', 'เปิดลิงก์ ?t= ในเบราว์เซอร์ที่ไม่ได้ล็อกอิน', 'เห็นสถานะ ชื่อผู้สั่ง จุดส่ง รหัสรับของ และเงินที่ต้องเตรียม · ไม่มีหน้าเข้าสู่ระบบ',
    async () => [lf === 0 && tt.includes('ติดตามพัสดุ') && tt.includes('User U01') && tt.includes('อาคาร 22') && tt.includes(j1.code) && tt.includes('เตรียมเงินสด ฿13'), tt.slice(0, 160)]);
  await tr.screenshot({ path: SH + 'trk-1.png', fullPage: true });
  await tr.goto(URL + '?t=ABCDEFGHIJKLMNOP'); await W(tr, 700); const te = await txt(tr, '#app');
  await T('TRK-02', 'ลิงก์ติดตาม', 'ลิงก์ผิดแจ้งชัดเจน', 'เปิด ?t= ที่ไม่มีในระบบ', '"เปิดลิงก์ติดตามไม่ได้" + เหตุผล + ปุ่มไปหน้าเข้าสู่ระบบ', async () => [te.includes('เปิดลิงก์ติดตามไม่ได้') && te.includes('ไม่พบคำสั่งนี้'), te.slice(0, 100)]);
  // ===== แอดมินยืนยันได้ทันที · รับของ · ส่ง =====
  let a = await login('admin'); await openJob(a, j1.id);
  const cbtn = await a.locator('[data-do=confirm]').isDisabled(); const ab = await txt(a, '#main');
  await a.click('[data-do=confirm]'); await W(a, 800);
  await T('COD-03', 'เก็บเงินปลายทาง', 'แอดมินยืนยันคำสั่งปลายทางได้ทันที', 'แอดมินเปิดคำสั่งปลายทางที่เพิ่งสั่ง', 'ปุ่มยืนยันกดได้ · เห็นว่าผู้สั่งยืนยันผู้รับตกลงจ่ายแล้ว · กดแล้วเป็นรอรับของ',
    async () => { const st = await E(id => H.job(id).status, j1.id); return [!cbtn && ab.includes('ผู้สั่งยืนยันแล้วว่าผู้รับตกลงจ่าย') && st === 'confirmed', 'disabled=' + cbtn + ' → ' + st]; });
  const pk = await txt(a, '#pickupf');
  await T('COD-04', 'เก็บเงินปลายทาง', 'รับของไม่ต้องเก็บเงินผู้สั่ง', 'ดูฟอร์มรับของ', '"ไม่ต้องเก็บเงินผู้สั่ง เก็บเงินปลายทาง ฿13"', async () => [pk.includes('ไม่ต้องเก็บเงินผู้สั่ง') && pk.includes('฿13'), pk.slice(0, 100)]);
  await E(id => { H.act(id, 'pickup'); H.act(id, 'start'); }, j1.id); await openJob(a, j1.id);
  const ph1 = await a.locator('.astep .phone').count();
  await a.click('[data-do=arrive]'); await W(a, 800);
  const sndDis = await a.locator('[data-do=contact_sender]').isDisabled();
  await T('CALL-01', 'ไรเดอร์โทร', 'ถึงจุดส่งแล้วมีปุ่มโทรผู้รับ/ผู้สั่ง ตามลำดับ', 'กด "ถึงจุดส่งแล้ว"', 'มีลิงก์โทรเบอร์ผู้รับ · ปุ่ม "โทรหาผู้สั่งแล้ว" กดไม่ได้จนโทรผู้รับครบ 2 ครั้ง',
    async () => { const t = await txt(a, '#main'); return [ph1 >= 1 && sndDis && t.includes('โทรผู้รับไม่รับสาย (0/2)') && t.includes('โทรจากเบอร์ของคุณเอง'), 'tel=' + ph1 + ' ผู้สั่งปิด=' + sndDis]; });
  await a.click('[data-do=contact_call]'); await W(a, 800);
  const gap = await txt(a, '[data-do=contact_call]');
  await E(id => { const cl = JSON.parse(H.job(id).contact_log); cl[0].t = new Date(Date.now() - 6 * 60000).toISOString(); H.S.update('Jobs', id, { contact_log: JSON.stringify(cl) }); }, j1.id);
  await openJob(a, j1.id); await a.click('[data-do=contact_call]'); await W(a, 800); await a.click('[data-do=contact_sender]'); await W(a, 800);
  const cl1 = await txt(a, '.clog');
  await T('CALL-02', 'ไรเดอร์โทร', 'บันทึกการโทรครบ: ผู้รับ 2 ครั้ง (ห่าง 5 นาที) แล้วผู้สั่ง', 'โทร → ปุ่มรอ 5 นาที → โทรอีกครั้ง → โทรผู้สั่ง', 'ปุ่ม "โทรได้อีกครั้ง hh:mm" · บันทึก 3 รายการ · ขึ้นเวลารอผู้รับ 10 นาที',
    async () => { const t = await txt(a, '#main'); return [/โทรได้อีกครั้ง/.test(gap) && (cl1.match(/โทรหาผู้รับ/g) || []).length === 2 && cl1.includes('โทรหาผู้สั่งให้ช่วยตาม') && /รอผู้รับถึง .* \(0\/10 นาที\)/.test(t), gap + ' / ' + cl1.slice(0, 100)]; });
  await openJob(u, j1.id);
  const sb = await txt(u, '.lateban.red');
  await T('CALL-03', 'ไรเดอร์โทร', 'ผู้สั่งเห็นว่าต้องช่วยตามผู้รับ', 'ผู้สั่งเปิดคำสั่งหลังไรเดอร์โทรหา', 'แถบ "ไรเดอร์ติดต่อผู้รับไม่ได้" บอกชื่อผู้รับ จุดส่ง และเวลาที่ต้องมารับ',
    async () => [sb.includes('ไรเดอร์ติดต่อผู้รับไม่ได้') && sb.includes('บีม') && sb.includes('อาคาร 22') && /ภายใน \d{2}:\d{2}/.test(sb), sb.slice(0, 120)]);
  await tr.goto(URL + '?t=' + j1.track_token); await W(tr, 900); const tc = await txt(tr, '#app');
  await T('TRK-03', 'ลิงก์ติดตาม', 'ผู้รับเห็นว่าไรเดอร์ถึงแล้วและโทรหาแล้ว', 'เปิดลิงก์ติดตามระหว่างรอผู้รับ', '"ไรเดอร์ถึงจุดส่งแล้ว" · "ไรเดอร์โทรหาคุณแล้ว 2 ครั้ง"', async () => [tc.includes('ไรเดอร์ถึงจุดส่งแล้ว') && tc.includes('ไรเดอร์โทรหาคุณแล้ว 2 ครั้ง'), tc.slice(0, 120)]);
  // ส่งแบบไม่มีรหัส
  await openJob(a, j1.id);
  await a.click('.seg2 label:has([value=photo])'); await W(a, 200);
  const codeHidden = await a.locator('#hocode').isHidden();
  await a.setInputFiles('#dvin', require('path').resolve(__dirname, 'fixtures/p.jpg')); await W(a, 500); await a.fill('#hname', 'บีม (นักศึกษา)'); await a.check('#codcol', { force: true });
  await a.click('#dvbtn'); await W(a, 1000);
  const j1d = await E(id => H.job(id), j1.id);
  await T('HO-01', 'ส่งไม่มีรหัส', 'ผู้รับไม่มีรหัส ไรเดอร์ถ่ายรูป + ใส่ชื่อคนรับแทน', 'เลือก "ผู้รับไม่มีรหัส" ถ่ายรูป ใส่ชื่อ ติ๊กเก็บเงิน แล้วยืนยัน', 'ช่องรหัสซ่อน · ส่งสำเร็จ handover=photo ชื่อ "บีม (นักศึกษา)" · ไม่มีใครได้ Point (ผู้รับไม่มีบัญชี)',
    async () => [codeHidden && j1d.status === 'delivered' && j1d.handover === 'photo' && j1d.handover_name === 'บีม (นักศึกษา)' && j1d.points_earned === '0' && !j1d.payer_id, j1d.status + ' / ' + j1d.handover + ' / ' + j1d.handover_name + ' / pt=' + j1d.points_earned]);
  // รีวิวจากลิงก์
  await tr.goto(URL + '?t=' + j1.track_token); await W(tr, 900);
  const noCode = !(await txt(tr, '#app')).includes(j1.code);
  await tr.click('[data-star="4"]'); await tr.click('[data-tag="ส่งตรงเวลา"]'); await tr.fill('#revf [name=text]', 'ไรเดอร์ใจดี'); await tr.click('#revf .btn'); await W(tr, 900);
  const rv = await E(id => H.job(id), j1.id); const tr2 = await txt(tr, '.reviewcard');
  const rv2 = await E(t => H.err(() => H.L.handle(null, 'track_review', { t, stars: 1 })), j1.track_token);
  await T('TRK-04', 'รีวิว', 'ผู้รับรีวิวได้ครั้งเดียวจากลิงก์ ไม่ต้องเข้าสู่ระบบ', 'ส่งแล้วเปิดลิงก์ ให้ 4 ดาว + แท็ก + ความเห็น แล้วลองรีวิวซ้ำ', 'ไม่แสดงรหัสหลังส่งแล้ว · บันทึก 4 ดาว แท็ก "ส่งตรงเวลา" · ขึ้น "ขอบคุณ" · รีวิวซ้ำถูกปฏิเสธ',
    async () => [noCode && rv.review_stars === '4' && rv.review_tags === 'ส่งตรงเวลา' && rv.review_text === 'ไรเดอร์ใจดี' && tr2.includes('ขอบคุณ') && /ไปแล้ว/.test(rv2), rv.review_stars + ' / ' + rv.review_tags + ' / ' + rv2]);
  await tr.screenshot({ path: SH + 'trk-review.png', fullPage: true });
  await openJob(u, j1.id); const urv = await txt(u, '.reviewcard');
  await T('TRK-05', 'รีวิว', 'ผู้สั่งเห็นรีวิวของผู้รับในหน้าคำสั่ง', 'ผู้สั่งเปิดคำสั่งที่ส่งสำเร็จ', 'การ์ด "รีวิวจากผู้รับ" + ความเห็น · แถบ "ส่งถึงมือโดยไม่มีรหัส"',
    async () => { const t = await txt(u, '#main'); return [urv.includes('รีวิวจากผู้รับ') && urv.includes('ไรเดอร์ใจดี') && t.includes('ส่งถึงมือโดยไม่มีรหัส'), urv.slice(0, 80)]; });
  // ===== ผู้รับที่มีบัญชี (เบอร์ตรง) =====
  const b2 = await bal('u02');
  const m1 = await E(() => { const id = H.mk({ f: { recipient_id: '', recipient_name: 'เพื่อน', recipient_phone: '0800000002', recipient_consent: 1, pay_method: 'cod', cod_agreed: 1 } }); return H.job(id); });
  await T('MEM-01', 'ผู้รับมีบัญชี', 'เบอร์ตรงกับสมาชิก ระบบผูกคำสั่งกับบัญชีนั้นให้เอง', 'สั่งถึงเบอร์ 0800000002 (u02)', 'recipient_id=U02 · ผู้จ่าย U02',
    async () => [m1.recipient_id === 'U02' && m1.payer_id === 'U02', m1.recipient_id + ' / ' + m1.payer_id]);
  const r2 = await E(id => { H.racc(id, 'u02'); const j = H.job(id); H.to(id, 'delivered'); return [j.total, j.points_used, H.job(id).points_earned]; }, m1.id);
  await T('MEM-02', 'ผู้รับมีบัญชี', 'ผู้รับใช้ Point ลดค่าปลายทาง และได้ Point เมื่อสำเร็จ', 'u02 เปิดสวิตช์ Point แล้วส่งสำเร็จ', 'ยอดลดลง · Point ถูกใช้ · ได้ Point เพราะเป็นคนจ่าย',
    async () => { const b3 = await bal('u02'); return [Number(r2[0]) < 13 && Number(r2[1]) > 0 && Number(r2[2]) > 0 && b3 === b2 - Number(r2[1]) + Number(r2[2]), 'ยอด ' + r2[0] + ' · ใช้ ' + r2[1] + ' · ได้ ' + r2[2] + ' · ' + b2 + '→' + b3]; });
  const cp = await E(() => { const id = H.mk({}); return [H.err(() => H.L.handle(H.tok('u02'), 'act', { id, action: 'cod_points', note: 'use_points' })), H.err(() => H.L.handle(H.tok('u03'), 'act', { id, action: 'cod_points', note: 'use_points' }))]; });
  await T('MEM-03', 'ผู้รับมีบัญชี', 'ใช้ Point ปลายทางได้เฉพาะผู้รับของคำสั่งปลายทาง', 'u02 กับคำสั่งที่ผู้สั่งจ่าย / u03 ที่ไม่ใช่ผู้รับ', 'ปฏิเสธทั้งสอง', async () => [cp.every(x => x !== 'OK'), cp.join(' | ')]);
  const old = await E(() => ['cod_accept', 'cod_decline', 'cod_withdraw', 'refuse', 'appeal'].map(ac => { const id = H.cod(); H.to(id, 'delivering'); const e = H.err(() => H.L.handle(H.tok('u02'), 'act', { id, action: ac, code: 'changed_mind', note: 'x' })); H.act(id, 'deliver', { code: H.job(id).code, note: 'cod_collected' }); return e; }));
  await T('MEM-04', 'ผู้รับมีบัญชี', 'ขั้นตอนเดิมของผู้รับใช้ไม่ได้แล้ว', 'เรียก ยอมรับ/ปฏิเสธ/ถอน/ไม่รับของ/โต้แย้ง', 'ปฏิเสธทุกขั้นตอน', async () => [old.every(x => /ระบบใหม่ไม่ใช้/.test(x)), old.length + ' ขั้น']);
  // ===== ส่งไม่สำเร็จ → ค้างชำระ → ส่งใหม่ =====
  const f5 = await E(() => { const id = H.cod(); H.to(id, 'delivering'); H.act(id, 'arrive');
    const e = H.err(() => H.L.handle(H.tok('admin'), 'act', { id, action: 'fail', code: 'not_found', photos: { list: H.ph } }));
    H.nf(id); const j = H.job(id); return [e, j.cancel_reason, j.fail_fault, j.sender_owed, j.penalty_user || '', id]; });
  await T('FAIL-01', 'ส่งไม่สำเร็จ', 'ติดต่อผู้รับไม่ได้ ต้องทำครบขั้นตอนก่อน และไม่ลงโทษใคร', 'บันทึก "ติดต่อผู้รับไม่ได้" ก่อน/หลังทำครบ', 'ก่อน: ปฏิเสธ บอกขั้นที่ขาด · หลัง: ส่งไม่สำเร็จ ผู้รับเป็นเหตุ ผู้สั่งค้าง ฿10 · ไม่มีบทลงโทษ',
    async () => [/ยังทำขั้นตอนไม่ครบ/.test(f5[0]) && f5[1] === 'failed' && f5[2] === 'recipient' && f5[3] === '10' && !f5[4], f5.slice(0, 5).join(' / ')]);
  const ow = await E(() => [H.err(() => H.cod()), H.L.handle(H.tok('u01'), 'recipients', {}).owed, H.err(() => H.L.handle(H.tok('u01'), 'delete_account', { confirm: 'ลบบัญชี', password: 'demo1234' }))]);
  await T('OWE-01', 'ค้างชำระ', 'ค้างชำระแล้วสั่งปลายทางและลบบัญชีไม่ได้', 'ผู้สั่งที่ค้าง ฿10 สั่งปลายทางใหม่ / ลบบัญชี', 'ปฏิเสธทั้งสอง บอกยอดค้าง',
    async () => [/ค้างชำระ ฿10/.test(ow[0]) && ow[1] === 10 && /ค้าง/.test(ow[2]), ow[0].slice(0, 60) + ' | ' + ow[2].slice(0, 60)]);
  await u.click('.tabbar [data-go=u-home]'); await W(u, 800); const hr = await txt(u, '.card.remind');
  await u.click('[data-svc=normal]'); await W(u, 800); const codOff = await u.locator('[name=pay_method][value=cod]').isDisabled();
  await T('OWE-02', 'ค้างชำระ', 'หน้าแรกเตือนยอดค้าง และปิดตัวเลือกปลายทาง', 'ผู้สั่งเปิดหน้าแรก แล้วเปิดหน้าสั่ง', 'การ์ด "ค้างชำระค่าส่ง ฿10" · ปลายทางกดไม่ได้',
    async () => [hr.includes('ค้างชำระค่าส่ง ฿10') && codOff, hr.slice(0, 60) + ' / ปิด=' + codOff]);
  await openJob(u, f5[5]);
  const retBtn = await u.locator('.returncard [data-do=returned]').count();
  const sRet = await E(id => H.err(() => H.L.handle(H.tok('u01'), 'act', { id, action: 'returned' })), f5[5]);
  await u.locator('#redof [name=rname]').fill('บีม'); const codDisabled = await u.locator('#redof [value=cod]').isDisabled();
  await u.click('#redof .btn'); await W(u, 1200);
  const nj = await E(id => { const o = H.job(id); return [o.redo_id, H.job(o.redo_id)]; }, f5[5]);
  await T('RED-01', 'ส่งใหม่', 'ผู้สั่งกด "ส่งใหม่ ราคาเดิม" แบบผู้สั่งจ่ายทีหลัง', 'เปิดคำสั่งที่ส่งไม่สำเร็จ กดส่งใหม่', 'ปลายทางเลือกไม่ได้ (ค้างอยู่) · ไม่มีปุ่มรับคืนเอง · คำสั่งใหม่ "รอรับของ" ราคาเดิม ฿10 ค้างเพิ่ม · เปิดหน้าคำสั่งใหม่',
    async () => { const t = await txt(u, '#main'); return [codDisabled && retBtn === 0 && /ค้าง/.test(sRet) && nj[1].status === 'confirmed' && nj[1].subtotal === '10' && nj[1].sender_owed === '10' && nj[1].redo_of === f5[5] && t.includes('ส่งใหม่จากคำสั่ง ' + f5[5]), (nj[0] || '-') + ' ' + nj[1].status + ' ฿' + nj[1].subtotal + ' / ' + sRet.slice(0, 40)]; });
  await openJob(a, nj[0]); const pk2 = await txt(a, '#pickupf');
  await E(id => { H.act(id, 'pickup'); }, nj[0]); const pd = await E(id => H.job(id).paid_at, nj[0]);
  await T('RED-02', 'ส่งใหม่', 'ไรเดอร์หยิบของส่งใหม่โดยไม่เก็บเงิน', 'แอดมินเปิดคำสั่งส่งใหม่', '"ไม่ต้องเก็บเงินตอนนี้ ผู้สั่งจ่ายทีหลัง ฿10" · paid_at ว่าง', async () => [pk2.includes('ผู้สั่งจ่ายทีหลัง ฿10') && !pd, pk2.slice(0, 90)]);
  await openJob(a, f5[5]); const ac = await txt(a, '#main');
  await a.click('.owedcard [data-do=owed_paid]'); await W(a, 300); await a.click('.owedcard [data-do=owed_paid]'); await W(a, 900);
  const op = await E(id => [H.job(id).owed_paid_at, H.L.handle(H.tok('u01'), 'recipients', {}).owed], f5[5]);
  await T('OWE-03', 'ค้างชำระ', 'แอดมินรับเงินค้างแล้วยอดลดลง', 'แอดมินเปิดคำสั่งเดิม กด "รับเงินแล้ว" (2 ครั้ง)', 'เห็น "ผู้สั่งค้างชำระ ฿10" · บันทึกเวลา · ยอดค้างเหลือ ฿10 (ของคำสั่งส่งใหม่)',
    async () => [ac.includes('ผู้สั่งค้างชำระ ฿10') && !!op[0] && op[1] === 10, 'ค้างเหลือ ' + op[1]]);
  const ov = await E(() => H.L.handle(H.tok('admin'), 'admin_overview', {}).flow);
  await a.click('.tabbar [data-go=a-home]'); await W(a, 900); const ovt = await txt(a, '#app');
  await T('ADM-01', 'ภาพรวม', 'ภาพรวมมีตัวชี้วัดการส่งถึงผู้รับและรีวิว', 'แอดมินเปิดภาพรวม', 'ส่งได้ในรอบแรก % · โทรตามผู้สั่ง · ไม่มีรหัส · ค้างชำระ · รีวิวเฉลี่ย 4',
    async () => [ovt.includes('ส่งได้ในรอบแรก') && ovt.includes('ต้องโทรตามผู้สั่ง') && ovt.includes('ส่งแบบไม่มีรหัส') && ovt.includes('ผู้สั่งค้างชำระ') && ovt.includes('รีวิวจากผู้รับ') && ov.reviews.avg === 4 && ov.no_code === 1, JSON.stringify(ov).slice(0, 150)]);
  await a.screenshot({ path: SH + 'ov-flow.png', fullPage: true });
  // ===== PDPA / หมดอายุลิงก์ =====
  const pd2 = await E(t => { const j = H.S.list('Jobs').find(x => x.track_token === t); H.S.update('Jobs', j.id, { delivered_at: new Date(Date.now() - 31 * 864e5).toISOString() });
    H.L.handle(H.tok('u03'), 'session', {}); return [H.job(j.id).recipient_phone, !!H.job(j.id).phone_purged_at, H.err(() => H.L.handle(null, 'track', { t }))]; }, j1.track_token);
  await T('PDPA-01', 'ข้อมูลส่วนบุคคล', 'ลบเบอร์ผู้รับหลังจบงาน 30 วัน และลิงก์หมดอายุหลัง 7 วัน', 'คำสั่งที่ส่งสำเร็จมา 31 วัน แล้วมีคนใช้งานระบบ', 'เบอร์ว่าง · บันทึกเวลาลบ · ลิงก์ "หมดอายุแล้ว"',
    async () => [pd2[0] === '' && pd2[1] && /หมดอายุ/.test(pd2[2]), (pd2[0] || 'ว่าง') + ' / ' + pd2[1] + ' / ' + pd2[2]]);
  // ===== ส่งช้า =====
  const lt = await E(() => { const j = H.mk({ sender: 'u03', f: { recipient_id: 'U01' } }); H.to(j, 'delivering'); const b0 = H.L.handle(H.tok('u03'), 'points', {}).balance;
    H.S.update('Jobs', j, { due_at: new Date(Date.now() - 15 * 60000).toISOString() }); H.act(j, 'deliver', { code: H.job(j).code }); return [H.job(j).late_min, H.job(j).comp_points, H.L.handle(H.tok('u03'), 'points', {}).balance - b0]; });
  await T('LATE-01', 'ส่งช้า', 'ช้าเกิน 10 นาที ชดเชย +2 ให้คนที่จ่าย', 'ส่งหลังกำหนด 15 นาที (ผู้สั่งจ่าย)', 'late 15 · comp 2 · ผู้สั่งได้ +2+2 (สำเร็จ + ชดเชย)', async () => [lt[0] === '15' && lt[1] === '2' && lt[2] === 4, lt.join(' / ')]);
  const ex = await E(() => { const j = H.mk({ f: { recipient_id: 'U03' } }); H.to(j, 'delivering'); H.act(j, 'arrive'); const due = new Date(Date.now() - 20 * 60000).toISOString(); H.S.update('Jobs', j, { arrived_at: new Date(Date.now() - 25 * 60000).toISOString(), due_at: due });
    H.act(j, 'deliver', { code: H.job(j).code }); return [H.job(j).late_excused, H.job(j).comp_points || '0']; });
  await T('LATE-02', 'ส่งช้า', 'ถึงก่อนกำหนดแต่ผู้รับไม่อยู่ ไม่นับว่าส่งช้า', 'ถึงจุดส่งก่อนกำหนด ส่งได้หลังกำหนด 20 นาที', 'excused · ไม่ชดเชย', async () => [ex[0] === '1' && ex[1] === '0', ex.join(' / ')]);
  const nl = await E(() => { const j = H.mk({ sender: 'u03', f: { recipient_id: '', recipient_name: 'ต้น', recipient_phone: '0877777777', recipient_consent: 1, pay_method: 'cod', cod_agreed: 1 } }); H.to(j, 'delivering');
    H.S.update('Jobs', j, { due_at: new Date(Date.now() - 15 * 60000).toISOString() }); H.act(j, 'deliver', { code: H.job(j).code, note: 'cod_collected' }); const x = H.job(j); return [x.late_min, x.comp_points || '0', H.S.list('Rewards').filter(r => r.job_id === j && r.kind === 'point').length]; });
  await T('LATE-03', 'ส่งช้า', 'ปลายทางที่ผู้รับไม่มีบัญชี ส่งช้าไม่มีใครรับ Point ชดเชย', 'ส่งช้า 15 นาที ถึงผู้รับที่ไม่มีบัญชี', 'บันทึกช้า 15 นาที · ไม่มีรายการ Point', async () => [nl[0] === '15' && nl[2] === 0, nl.join(' / ')]);
  const ov2 = await E(() => H.L.handle(H.tok('admin'), 'admin_overview', {}));
  await a.click('.tabbar [data-go=a-orders]'); await W(a, 600); await a.click('.tabbar [data-go=a-home]'); await W(a, 900); const ovt2 = await txt(a, '#app');
  await T('LATE-04', 'ส่งช้า', 'ภาพรวมแสดงอัตราส่งทันกำหนดและสาเหตุส่งไม่สำเร็จ', 'แอดมินเปิดภาพรวม', 'มี "ส่งทันกำหนด" % และ "สาเหตุ ผู้รับ / ผู้สั่ง / TheungMue"',
    async () => [ovt2.includes('ส่งทันกำหนด') && ovt2.includes('สาเหตุ ผู้รับ / ผู้สั่ง / TheungMue') && ov2.ontime_pct !== null, 'ทันกำหนด ' + ov2.ontime_pct + '% / ช้า ' + ov2.late_count + ' / ไม่สำเร็จ ' + JSON.stringify(ov2.fail_by)]);
  const sl = await E(() => { const j = H.mk({ f: { mode: 'urgent', deadline: new Date(Date.now() + 60 * 60000).toISOString() } }); H.S.update('Jobs', j, { created_at: new Date(Date.now() - 12 * 60000).toISOString(), due_at: new Date(Date.now() + 10 * 60000).toISOString() }); return j; });
  await a.click('.tabbar [data-go=a-orders]'); await W(a); await a.click('.otabs [data-t=pending]'); await W(a);
  await T('LATE-05', 'ส่งช้า', 'แอดมินเห็นงานด่วนที่รอยืนยันนานและใกล้กำหนด', 'งานด่วนรอ 12 นาที เหลือ 10 นาที', 'การ์ดขึ้นบนสุด "รอยืนยันมา 12 นาที" + ป้าย "ใกล้กำหนด"',
    async () => { const first = await a.locator('.aord').first().innerText(); return [first.includes(sl) && first.includes('รอยืนยันมา 12 นาที') && first.includes('ใกล้กำหนด'), first.replace(/\s+/g, ' ').slice(0, 120)]; });
  await u.click('.tabbar [data-go=profile]'); await W(u, 600); await u.click('[data-page=points]'); await W(u, 800); const ptp = await txt(u, '#app');
  await a.click('.tabbar [data-go=profile]'); await W(a, 600); await a.click('[data-page=pricing]'); await W(a, 900); const prc = await txt(a, '#app'); const npen = await a.locator('[name=penalty]').count();
  await a.locator('#prf .btn').click(); await W(a, 900); const sv = await txt(a, '#prf .btn');
  await T('OLD-01', 'กติกาเดิม', 'ไม่มีบทลงโทษผู้รับเหลือในหน้า Point และหน้าตั้งราคา', 'ผู้ใช้เปิดหน้า Point · แอดมินเปิดหน้าราคาและ Point แล้วกดบันทึก', 'ไม่มี "ปฏิเสธรับของ" · บอกว่าผู้รับไม่มีบัญชีไม่มีใครได้ Point · ไม่มีช่องหัก Point · บันทึกได้',
    async () => [!ptp.includes('ปฏิเสธรับของ') && ptp.includes('ถ้าผู้รับไม่มีบัญชีจะไม่มีใครได้ Point') && !prc.includes('ปฏิเสธ') && npen === 0 && sv === 'บันทึกแล้ว', 'Point มีปฏิเสธ=' + ptp.includes('ปฏิเสธรับของ') + ' ช่องหัก=' + npen + ' ปุ่ม=' + sv]);
  await T('ERR-00', 'ทั่วไป', 'ไม่มีข้อผิดพลาด JavaScript', 'ตลอดการทดสอบ', 'ไม่มี', async () => [errs.length === 0, errs.join(' | ') || 'ไม่มี']);
  fs.writeFileSync(require('path').resolve(__dirname, 'shots/cod-results.json'), JSON.stringify(R, null, 1));
  console.log('ผ่าน ' + R.filter(x => x.status === 'ผ่าน').length + '/' + R.length);
  await b.close();
})();
