// โหลดก่อนชุดทดสอบ: ตอบแทนฟอนต์และภาพพื้นแผนที่จากอินเทอร์เน็ต ไม่ให้ออกเน็ต
const pw = require('playwright');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
async function guard(ctx) {
  await ctx.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => {
    const u = r.request().url();
    if (/tile\.openstreetmap\.org/.test(u)) return r.fulfill({ status: 200, contentType: 'image/png', body: PNG });
    if (/fonts\.googleapis\.com/.test(u)) return r.fulfill({ status: 200, contentType: 'text/css', body: '' });
    if (/fonts\.gstatic\.com/.test(u)) return r.fulfill({ status: 200, contentType: 'font/woff2', body: '' });
    console.error('[offline] ไม่รู้จัก ' + u);
    return r.fulfill({ status: 204, body: '' });
  });
  return ctx;
}
const launch = pw.chromium.launch.bind(pw.chromium);
pw.chromium.launch = async (...a) => {
  const b = await launch(...a);
  const nc = b.newContext.bind(b), np = b.newPage.bind(b);
  b.newContext = async (...x) => guard(await nc(...x));
  b.newPage = async (...x) => { const p = await np(...x); await guard(p.context()); return p; };
  return b;
};
