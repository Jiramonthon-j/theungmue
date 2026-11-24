const fs = require('fs');
const r = (f) => fs.readFileSync('src/' + f, 'utf8');
// Leaflet 1.9.4 (BSD-2) ฝังในไฟล์ — ใช้แสดงแผนที่ OpenStreetMap (ฟรี ไม่ต้องมี API key)
const script = [r('vendor/leaflet.js'), r('logic.js'), r('bot.js'), r('local-store.js'), r('app.js')].join('\n\n');
// ฟอนต์ Kanit (SIL Open Font License 1.1 · vendor/fonts/Kanit-OFL.txt) ฝังในไฟล์ ใช้ได้แม้ไม่มีอินเทอร์เน็ต
const RANGE = { thai: 'U+02D7,U+0303,U+0331,U+0E01-0E5B,U+200C-200D,U+25CC', latin: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD' };
const fonts = ['thai', 'latin'].map(function (sub) { return [400, 500, 600, 700].map(function (w) {
  return "@font-face{font-family:'Kanit';font-style:normal;font-display:swap;font-weight:" + w + ";src:url(data:font/woff2;base64," +
    fs.readFileSync('src/vendor/fonts/kanit-' + sub + '-' + w + '-normal.woff2').toString('base64') + ") format('woff2');unicode-range:" + RANGE[sub] + "}";
}).join('\n'); }).join('\n');
const html = r('shell.html').replace('/*STYLE*/', () => fonts + '\n' + r('vendor/leaflet.css') + '\n' + r('style.css')).replace('/*SCRIPT*/', () => script);
fs.mkdirSync('dist/gas', { recursive: true });
fs.writeFileSync('dist/TheungMue.html', html);
// เวอร์ชันใช้จริงบน Google Apps Script: ไม่มีบัญชีทดลอง · ลบแชทน้องถึงที่เก่ากว่า 90 วัน
const PROD = "\n\n// ---- ใช้จริง (Google Apps Script) ----\nCONFIG.PRODUCTION = true;\nCONFIG.SEED_USERS = CONFIG.SEED_USERS.filter(function (u) { return u.role === 'admin'; });\nBOT.PURGE = true;\n";
const gasScript = [r('vendor/leaflet.js'), r('logic.js'), r('bot.js'), PROD, r('local-store.js'), r('app.js')].join('\n\n');
const gasHtml = r('shell.html').replace('/*STYLE*/', () => fonts + '\n' + r('vendor/leaflet.css') + '\n' + r('style.css')).replace('/*SCRIPT*/', () => gasScript);
fs.writeFileSync('dist/gas/index.html', gasHtml);
fs.writeFileSync('dist/gas/Code.gs', '// TheungMue (ถึงมือ) — โค้ดฝั่ง Google Apps Script (วางทั้งไฟล์ในไฟล์ Code.gs)\n\n' + r('logic.js') + '\n\n' + r('bot.js') + PROD + '\n\n' + r('gas-server.js'));
// หน้าเว็บใช้จริงบน GitHub Pages (dist/web/index.html): เรียก Apps Script ผ่านลิงก์ /exec ในไฟล์ api-url.txt
const apiUrl = (process.env.TM_API_URL || (fs.existsSync('api-url.txt') ? fs.readFileSync('api-url.txt', 'utf8') : '')).trim();
if (apiUrl) {
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(apiUrl) && !process.env.TM_API_ANY) throw new Error('api-url.txt ต้องเป็นลิงก์ https://script.google.com/macros/s/.../exec');
  const webScript = [r('vendor/leaflet.js'), r('logic.js'), r('bot.js'), PROD + 'CONFIG.API_URL = ' + JSON.stringify(apiUrl) + ';\n', r('local-store.js'), r('app.js')].join('\n\n');
  fs.mkdirSync('dist/web', { recursive: true });
  fs.writeFileSync('dist/web/index.html', r('shell.html').replace('/*STYLE*/', () => fonts + '\n' + r('vendor/leaflet.css') + '\n' + r('style.css')).replace('/*SCRIPT*/', () => webScript));
  console.log('web ->', apiUrl);
}
console.log('built', html.length, 'bytes');
