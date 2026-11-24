// เวอร์ชันออนไลน์ตอบช้า 1.5 วิ: เปิดหน้าซ้ำต้องขึ้นทันที · มีแถบโหลด · แอดมินยืนยันแล้วหน้าผู้ใช้อัปเดตเอง
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const api = require('./apiserver.js'); const apiSrv = api.start(8790);
const WEB = process.env.WEB_HTML;
const page = http.createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); fs.createReadStream(WEB).pipe(r); }).listen(8791);
const out = {}; const ok = (k, v) => { out[k] = v; };
(async () => {
  api.ctx.setAdminPassword('Admin#2026x');
  api.ctx.apiCall(null, 'register', { username: 'mint01', name: 'มิ้นท์', phone: '0812345678', password: 'secret12' });
  api.ctx.apiCall(null, 'register', { username: 'beam02', name: 'บีม', phone: '0898765432', password: 'secret34' });
  const tok = api.ctx.apiCall(null, 'login', { username: 'mint01', password: 'secret12' }).token;
  const beamId = api.ctx.sheetStore_({}).list('Users').find(u => u.username === 'beam02').id;
  api.ctx.apiCall(tok, 'create', { item_type: 'เอกสาร / ชีท', item_detail: 'x', dropoff_zone: 'อาคาร 3', mode: 'normal', service: 'normal', pay_method: 'sender', recipient_id: beamId, photos: ['data:image/jpeg;base64,/9j/AAAA'] });
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8791/'); await p.evaluate(t => localStorage.setItem('songtor-token', t), tok); await p.reload();
  await p.waitForSelector('.icard', { timeout: 15000 });
  const tab = sel => p.click('.tabbar [data-go="' + sel + '"]');
  let t = Date.now(); await tab('u-orders'); const bar = await p.evaluate(() => new Promise(r => setTimeout(() => r(document.body.classList.contains('netbusy')), 600)));
  await p.waitForSelector('.icard'); ok('ordersFirst', Date.now() - t + 'ms'); ok('loadingBarShown', bar);
  await tab('u-home'); await p.waitForSelector('.hero'); t = Date.now(); await tab('u-orders'); await p.waitForSelector('.icard'); ok('ordersAgain', Date.now() - t + 'ms');
  ok('statusBefore', await p.locator('.icard .badge').first().innerText());
  // แอดมินยืนยันจากเซิร์ฟเวอร์ → หน้าผู้ใช้ต้องเปลี่ยนเองภายในรอบดึงข้อมูล (20 วิ) หรือเมื่อเปิดหน้าซ้ำ
  const at = api.ctx.apiCall(null, 'login', { username: 'admin', password: 'Admin#2026x' }).token;
  api.ctx.apiCall(at, 'act', { id: 'TM2411-01', action: 'confirm' });
  await tab('u-home'); await p.waitForSelector('.hero'); await tab('u-orders');
  ok('immediately(cached)', await p.locator('.icard .badge').first().innerText());
  await p.waitForFunction(() => /รอรับของ/.test(document.querySelector('.icard .badge').innerText), null, { timeout: 8000 }).then(() => ok('refreshedAfterNet', true), () => ok('refreshedAfterNet', false));
  ok('statusAfter', await p.locator('.icard .badge').first().innerText());
  console.log(JSON.stringify(out, null, 1), '\nerrors', errs); await b.close(); apiSrv.close(); page.close();
})();
