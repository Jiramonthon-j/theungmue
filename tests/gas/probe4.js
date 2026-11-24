// ทดสอบหน้าเว็บ GitHub Pages (dist/web) ที่เรียก Apps Script จำลองข้ามโดเมน
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const api = require('./apiserver.js'); const apiSrv = api.start(8790);
const WEB = process.env.WEB_HTML || path.resolve(__dirname, '../../dist/web/index.html');
const page = http.createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); fs.createReadStream(WEB).pipe(r); }).listen(8791);
const out = {}; const ok = (k, v) => { out[k] = v; };
(async () => {
  api.ctx.setAdminPassword('Admin#2026x'); api.ctx.sheetStore_({}).insert('Settings', { id: 'service_override', value: 'on' });
  const reg = api.ctx.apiCall(null, 'register', { username: 'mint01', name: 'มิ้นท์', phone: '0812345678', password: 'secret12', pdpa_ok: 1 });
  api.ctx.apiCall(null, 'register', { username: 'beam02', name: 'บีม', phone: '0898765432', password: 'secret34', pdpa_ok: 1 });
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 390, height: 844 } });
  await c.addCookies([{ name: 'SID', value: 'other-google-account', domain: 'localhost', path: '/' }]); // จำลองว่ามีคุกกี้บัญชี Google อยู่
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8791/'); await p.waitForTimeout(1200);
  ok('demoList', await p.locator('.demoacc').count());
  await p.fill('input[name=username]', 'admin'); await p.fill('input[name=password]', 'wrongpass'); await p.click('#loginf button.btn'); await p.waitForTimeout(900);
  ok('wrongPwMsg', (await p.locator('#err').innerText()).slice(0, 40));
  await p.fill('input[name=username]', 'mint01'); await p.fill('input[name=password]', 'secret12'); await p.click('#loginf button.btn'); await p.waitForTimeout(1500);
  ok('userRole', await p.locator('.rolechip').innerText().catch(() => 'none'));
  // สั่งของผ่านเซิร์ฟเวอร์ แล้วดูในหน้าเว็บ
  const tok = await p.evaluate(() => localStorage.getItem('songtor-token'));
  ok('tokenSaved', !!tok);
  const recips = api.ctx.apiCall(tok, 'recipients', {});
  const rid = JSON.stringify(recips).match(/"id":"(U[^"]+)"/g); 
  const beam = api.ctx.list ? null : null;
  const users = api.ctx.sheetStore_({}).list('Users'); const beamId = users.find(u => u.username === 'beam02').id;
  const cr = api.ctx.apiCall(tok, 'create', { item_type: 'เอกสาร / ชีท', item_detail: 'ชีทสรุป', dropoff_zone: 'อาคาร 3', mode: 'normal', service: 'normal', pay_method: 'sender', recipient_id: beamId, photos: ['data:image/jpeg;base64,/9j/AAAA'] });
  await p.reload(); await p.waitForTimeout(1800);
  ok('afterReloadStillIn', await p.locator('.rolechip').innerText().catch(() => 'none'));
  ok('homeCard', (await p.locator('.icard').first().innerText().catch(() => 'none')).replace(/\s+/g, ' ').slice(0, 60));
  // แอดมินในอีกหน้าต่าง ยืนยันผ่านปุ่มจริง
  const c2 = await b.newContext({ viewport: { width: 390, height: 844 } }); const a = await c2.newPage(); a.on('pageerror', e => errs.push('A:' + e.message));
  await a.goto('http://localhost:8791/'); await a.waitForTimeout(1000);
  await a.fill('input[name=username]', 'admin'); await a.fill('input[name=password]', 'Admin#2026x'); await a.click('#loginf button.btn'); await a.waitForTimeout(1800);
  ok('adminRole', await a.locator('.rolechip').innerText().catch(() => 'none'));
  ok('adminSees', (await a.locator('.card.job').first().innerText().catch(() => 'none')).replace(/\s+/g, ' ').slice(0, 50));
  const q = a.locator('[data-qact=confirm]').first();
  if (await q.count()) { await q.click(); await a.waitForTimeout(1800); }
  const jobs = api.ctx.sheetStore_({}).list('Jobs'); ok('statusAfterConfirm', jobs[0] && jobs[0].status);
  await a.screenshot({ path: path.join(__dirname, 'web-admin.png') }); await p.screenshot({ path: path.join(__dirname, 'web-user.png') });
  const st = await (await fetch('http://localhost:8790/stats')).json();
  ok('posts', st.posts); ok('cookiesSent', st.credentialed); ok('preflight', st.preflight || 0);
  console.log(JSON.stringify(out, null, 1), '\nerrors', errs);
  await b.close(); apiSrv.close(); page.close();
})();
