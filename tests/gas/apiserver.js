// จำลอง Web App ของ Apps Script: POST /exec → doPost → ตอบ 302 ไปที่ /echo (แบบเดียวกับ Google) → GET /echo ได้ JSON + CORS
const http = require('http'), fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = { console, JSON, Math, Date, Buffer, setTimeout };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'gasmock.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(process.env.CODE_GS || path.resolve(__dirname, '../../dist/gas/Code.gs'), 'utf8'), ctx);
vm.runInContext('ensureSetup_()', ctx);
const results = {}; let n = 0; const stats = { posts: 0, credentialed: 0 };
function start(port) {
  return http.createServer((q, r) => {
    if (q.method === 'OPTIONS') { stats.preflight = (stats.preflight || 0) + 1; r.writeHead(405); return r.end(); } // Google ไม่รองรับ preflight
    if (q.method === 'POST' && q.url.startsWith('/exec')) {
      let b = ''; q.on('data', c => b += c); q.on('end', () => {
        stats.posts++; if (q.headers.cookie) stats.credentialed++;
        const out = ctx.doPost({ postData: { contents: b, type: q.headers['content-type'] } });
        const id = 'R' + (++n); results[id] = out.getContent();
        const D = +(process.env.DELAY || 0); setTimeout(() => {
        r.writeHead(302, { Location: 'http://localhost:' + port + '/echo?id=' + id, 'Access-Control-Allow-Origin': '*' }); r.end(); }, D);
      }); return;
    }
    if (q.method === 'GET' && q.url.startsWith('/echo')) {
      const id = new URL(q.url, 'http://x').searchParams.get('id');
      r.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }); return r.end(results[id] || '{}');
    }
    if (q.url === '/stats') { r.writeHead(200); return r.end(JSON.stringify(stats)); }
    r.writeHead(404); r.end();
  }).listen(port);
}
module.exports = { start, ctx, stats };
