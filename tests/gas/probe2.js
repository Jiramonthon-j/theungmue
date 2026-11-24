const { chromium } = require('playwright');
const http = require('http'), fs = require('fs');
const srvH = http.createServer((q, r) => { const f = __dirname + q.url.split('?')[0]; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); fs.createReadStream(f).pipe(r); }).listen(8765);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/prod.html'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  const out = {};
  out.demoList = await p.locator('.demoacc').count();
  out.resetBtn = await p.locator('[data-act=reset]').count();
  const srv = () => p.evaluate(fn => window.__srv.then(w => w.eval(fn)), arguments[0]);
  const ev = async s => p.evaluate(s => window.__srv.then(w => JSON.stringify(w.eval(s))), s);
  await ev("ensureSetup_()");
  out.users = await ev("sheetStore_({}).list('Users').map(u=>u.username+':'+u.role).join(',')");
  out.purge = await ev("BOT.PURGE + '/' + CONFIG.PRODUCTION");
  // ใช้รหัสทดลองไม่ได้
  await p.fill('input[name=username]', 'admin'); await p.fill('input[name=password]', 'demo1234'); await p.click('#loginf button.btn'); await p.waitForTimeout(800);
  out.demoLogin = (await p.locator('#err').innerText().catch(() => '')).slice(0, 60);
  out.setpw = await ev("setAdminPassword('Admin#2026x')");
  await p.fill('input[name=password]', 'Admin#2026x'); await p.click('#loginf button.btn'); await p.waitForTimeout(1500);
  out.adminIn = await p.locator('.rolechip').innerText().catch(() => 'none');
  out.token = await p.evaluate(() => !!localStorage.getItem('songtor-token'));
  // สมัครผู้ใช้จริง
  await p.evaluate(() => { localStorage.removeItem('songtor-token'); }); await p.reload(); await p.waitForTimeout(1200);
  out.reg = await ev("JSON.stringify(createLogic(sheetStore_({})).handle(null,'register',{username:'mint01',name:'มิ้นท์',phone:'0812345678',password:'secret12'})).slice(0,60)");
  await p.fill('input[name=username]', 'mint01'); await p.fill('input[name=password]', 'secret12'); await p.click('#loginf button.btn'); await p.waitForTimeout(1800);
  out.userHome = (await p.locator('.hero b').innerText().catch(() => 'none'));
  out.svc = await p.locator('.svc').count();
  await p.screenshot({ path: require('path').resolve(__dirname, 'prod-home.png') });
  console.log(JSON.stringify(out, null, 1), '\nerrors', errs);
  await b.close(); srvH.close();
})();
