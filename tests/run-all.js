// รันชุดทดสอบทั้งหมด: node tests/run-all.js            (ไฟล์ HTML เก็บข้อมูลในเบราว์เซอร์)
//                    node tests/run-all.js --gas      (ผ่านโค้ด Apps Script จริงบน Google Sheet จำลอง)
// หมายเหตุ: fix-test ทดสอบเวลาเปิด-ปิดบริการ ต้องรันช่วง 04:00–20:00
const { execFileSync } = require('child_process');
const path = require('path');
const gas = process.argv.includes('--gas');
const SUITES = ['test', 'cod-test', 'ai-test', 'ai-rating-test', 'ai-day-test', 'point-history-test', 'incoming-test', 'orders-test',
  'user-fix-test', 'popup-test', 'admin-test', 'drop-point-test', 'fix-test'];
const env = Object.assign({}, process.env, { NODE_OPTIONS: '--require ' + path.join(__dirname, 'offline.js') });
if (gas) {
  execFileSync('node', [path.join(__dirname, 'gas/mkbuild.js')], { stdio: 'inherit' });
  env.TM_URL = 'file://' + path.join(__dirname, 'gas/TheungMue-gas.html');
}
let pass = 0, fail = 0;
for (const s of SUITES) {
  let out = '';
  try { out = execFileSync('node', [path.join(__dirname, 'theungmue-v2-' + s + '.js')], { env, encoding: 'utf8', timeout: 600000 }); }
  catch (e) { out = String(e.stdout || '') + String(e.stderr || ''); }
  const p = (out.match(/^PASS /gm) || []).length, f = (out.match(/^FAIL /gm) || []).length;
  pass += p; fail += f;
  console.log((f ? 'FAIL ' : 'ok   ') + s.padEnd(20) + ' ผ่าน ' + p + ' ไม่ผ่าน ' + f);
  if (f) console.log(out.split('\n').filter(l => l.startsWith('FAIL')).join('\n'));
}
console.log('\nรวม ผ่าน ' + pass + ' ไม่ผ่าน ' + fail + (gas ? ' (โหมด Apps Script + Sheet จำลอง)' : ''));
process.exit(fail ? 1 : 0);
