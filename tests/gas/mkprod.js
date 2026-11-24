// หน้าเว็บแบบเดียวกับที่จะขึ้น Apps Script จริง (index.html ใช้จริง) + Code.gs ฝั่งเซิร์ฟเวอร์ทำงานในหน้าเดียวกันผ่าน google.script.run จำลอง
const fs = require('fs');
const idx = fs.readFileSync(require('path').resolve(__dirname, '../../dist/gas/index.html'), 'utf8');
const code = fs.readFileSync(require('path').resolve(__dirname, '../../dist/gas/Code.gs'), 'utf8');
const mock = fs.readFileSync(__dirname + '/gasmock.js', 'utf8');
// ฝั่งเซิร์ฟเวอร์อยู่ใน iframe แยก (ตัวแปรไม่ปนกับหน้าเว็บ) ใช้ localStorage เดียวกัน
const server = '<!doctype html><meta charset="utf-8"><script>' + mock + '\n' + code + '\n</script>';
fs.writeFileSync(__dirname + '/server.html', server);
const shim = `<script>
window.__srv = new Promise(function (res) { var f = document.createElement('iframe'); f.style.display = 'none'; f.src = 'server.html'; f.onload = function () { res(f.contentWindow); }; document.documentElement.appendChild(f); });
window.google = { script: { get run() { var ok, bad; var o = { withSuccessHandler: function (f) { ok = f; return o; }, withFailureHandler: function (f) { bad = f; return o; },
  apiCall: function (t, a, x) { __srv.then(function (w) { setTimeout(function () { try { var r = w.apiCall(t, a, JSON.parse(JSON.stringify(x))); ok && ok(JSON.parse(JSON.stringify(r))); } catch (e) { bad && bad(e); } }, 30); }); } }; return o; } } };
</script>`;
fs.writeFileSync(__dirname + '/prod.html', idx.replace('<head>', '<head>' + shim));
console.log('ok');
