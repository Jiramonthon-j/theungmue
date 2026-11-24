// ทดสอบอัปเดตโค้ดบน Sheet ที่สร้างจากเวอร์ชันเก่า: คำขอแรกผ่าน doPost ต้องเพิ่มคอลัมน์ใหม่ให้เอง
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = { console, JSON, Math, Date, Buffer, setTimeout }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'gasmock.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(process.argv[2] || path.join(__dirname, 'fixtures/Code-v2.28.gs'), 'utf8'), ctx);
vm.runInContext('ensureSetup_(); setAdminPassword("admin12345")', ctx);
const post = (action, args, token) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify({ token, action, args }) } }).getContent());
// เวอร์ชันเก่า: มีผู้ใช้สมัครไว้แล้ว
let r = post('register', { username: 'olduser', name: 'Old User', phone: '0812223333', password: 'abcd1234' }); if (!r.ok) throw new Error('old register: ' + r.error);
const head = t => vm.runInContext('SpreadsheetApp.getActiveSpreadsheet().getSheetByName("' + t + '").getRange(1,1,1,SpreadsheetApp.getActiveSpreadsheet().getSheetByName("' + t + '").getLastColumn()).getDisplayValues()[0]', ctx);
const before = { users: head('Users').includes('pdpa_ver'), jobs: head('Jobs').includes('track_token') };
// อัปเดตเป็นโค้ดใหม่ (วาง Code.gs ใหม่ทับ) แล้วใช้งานผ่าน doPost เท่านั้น (เหมือนหน้าเว็บบน GitHub Pages)
vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../../dist/gas/Code.gs'), 'utf8'), ctx);
const R = [];
const ok = (id, title, cond, actual) => { R.push(cond); console.log((cond ? 'PASS ' : 'FAIL ') + id + ' ' + title + ' | ' + actual); };
r = post('login', { username: 'olduser', password: 'abcd1234' }); const tok = r.data && r.data.token;
const after = { users: head('Users').includes('pdpa_ver'), jobs: head('Jobs').includes('track_token') && head('Jobs').includes('recipient_name') };
ok('UP-01', 'คำขอแรกหลังอัปเดตเพิ่มคอลัมน์ใหม่ให้เอง', !before.users && !before.jobs && after.users && after.jobs, JSON.stringify({ before, after }));
ok('UP-02', 'บัญชีเดิมต้องกดยอมรับ PDPA', r.ok && r.data.me.pdpa_ok === false, JSON.stringify(r.data && r.data.me));
r = post('pdpa_accept', {}, tok); const s = post('session', {}, tok);
ok('UP-03', 'กดยอมรับแล้วบันทึกได้ ครั้งต่อไปไม่ถาม', r.ok && r.data.me.pdpa_ok === true && s.data.me.pdpa_ok === true, (r.error || '') + ' ' + JSON.stringify(s.data && s.data.me.pdpa_at));
vm.runInContext('sheetStore_({}).insert("Settings", { id: "service_override", value: "on" })', ctx); // ทดสอบได้ทุกเวลา
const ph = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDAAAAAA=';
r = post('create', { item_type: 'เอกสาร / ชีท', item_detail: 'ทดสอบ', dropoff_zone: 'อาคาร 3', recipient_name: 'บีม', recipient_phone: '0891234567', recipient_consent: 1, mode: 'normal', pay_method: 'sender', photos: [ph] }, tok);
const j = r.ok && vm.runInContext('sheetStore_({}).list("Jobs")', ctx).filter(x => x.id === r.data.job.id)[0];
ok('UP-04', 'คำสั่งใหม่เก็บชื่อ เบอร์ผู้รับ และลิงก์ติดตามได้', !!j && j.recipient_name === 'บีม' && j.recipient_phone === '0891234567' && j.track_token.length >= 12, (r.error || '') + ' ' + (j ? j.recipient_name + ' / ' + j.recipient_phone + ' / ' + j.track_token : ''));
const tr = j && post('track', { t: j.track_token });
ok('UP-05', 'ลิงก์ติดตามเปิดได้', tr && tr.ok && tr.data.recipient_name === 'บีม', tr && (tr.error || tr.data.status_label));
const n0 = ctx.__gasStats.reads; post('session', {}, tok); const n1 = ctx.__gasStats.reads;
ok('UP-06', 'คำขอถัดไปไม่ตรวจตารางซ้ำ (ไม่ช้าลง)', n1 - n0 <= 3, 'อ่าน Sheet ' + (n1 - n0) + ' ครั้ง');
console.log('ผ่าน ' + R.filter(Boolean).length + '/' + R.length);
