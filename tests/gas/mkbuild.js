// สร้างหน้าเว็บทดสอบที่ใช้ "Google Sheet จำลอง" แทน localStorage: ทุกชุดทดสอบเดิมจะวิ่งผ่าน sheetStore_ ของ Code.gs จริง
const fs = require('fs');
const S = require('path').resolve(__dirname, '../../src') + '/', r = f => fs.readFileSync(S + f, 'utf8');
const swap = `
// ---- ทดสอบ: ใช้ sheetStore_ (Code.gs) บน Sheet จำลองแทน localStorage ----
createLocalStore = function () { ensureSetup_(); var st = sheetStore_({}); st.reset = function () { localStorage.removeItem('gasmock-db'); ensureSetup_(); }; return st; };`;
const script = [r('vendor/leaflet.js'), r('logic.js'), r('bot.js'), fs.readFileSync(__dirname + '/gasmock.js', 'utf8'), r('gas-server.js'), r('local-store.js'), swap, r('app.js')].join('\n\n');
const html = fs.readFileSync(require('path').resolve(__dirname, '../../dist/TheungMue.html'), 'utf8');
// ใช้ CSS/ฟอนต์จากไฟล์ build จริง เปลี่ยนเฉพาะสคริปต์
const i = html.indexOf('<script>'), j = html.lastIndexOf('</script>');
fs.writeFileSync(require('path').resolve(__dirname, 'TheungMue-gas.html'), html.slice(0, i) + '<script>\n' + script + '\n' + html.slice(j));
console.log('ok');
