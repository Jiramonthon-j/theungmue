// ตรวจเฉพาะจุดของ Sheet จำลอง + Code.gs
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + require('path').resolve(__dirname, 'TheungMue-gas.html')); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(500);
  const R = await p.evaluate(() => {
    const out = {}; const ok = (k, v) => out[k] = v;
    const db = () => JSON.parse(localStorage.getItem('gasmock-db'));
    ok('store-is-sheet', !!localStorage.getItem('gasmock-db') && !localStorage.getItem('theungmue-v2-db-2'));
    const d0 = db(); ok('jobs-cols', d0.sheets.Jobs.maxCols + ' / schema ' + SCHEMA.Jobs.length);
    ok('jobs-all-text', SCHEMA.Jobs.every((c, i) => d0.sheets.Jobs.colFmt[i] === '@'));
    const tok = u => apiCall(null, 'login', { username: u, password: 'demo1234' }).token;
    const u1 = tok('u01'), ad = tok('admin');
    ok('phone-zero', apiCall(u1, 'profile', {}).me.phone);
    LockService; const before = __gasStats.lockMax || 0;
    const j = apiCall(u1, 'create', { item_type: 'เอกสาร / ชีท', item_detail: '=HYPERLINK("x")', note: '+66 @me -5', dropoff_zone: 'อาคาร 3', mode: 'normal', service: 'normal', pay_method: 'sender', recipient_id: 'U02', photos: ['data:image/jpeg;base64,/9j/AAAA'] });
    const id = j.job ? j.job.id : (j.id || JSON.stringify(j).slice(0, 80));
    const jj = apiCall(u1, 'job', { id }).job;
    ok('formula-text-roundtrip', jj.item_detail + ' | ' + jj.note);
    const raw = db().sheets.Jobs.cells; const row = raw.find(r => r && r[0] && r[0].d === id);
    ok('no-formula-in-sheet', row.every(c => !c || !c.f));
    ok('created_at-text', jj.created_at);
    ok('photo-in-drive', JSON.stringify(db().sheets.Photos.cells[1].map(c => c && c.d).slice(0, 4)));
    const ph = apiCall(u1, 'photos', { id }); ok('photo-back', JSON.stringify(ph).slice(0, 90));
    ok('lock-released', __lockHeld());
    // อ่านอย่างเดียวไม่ล็อก
    const w0 = __gasStats.writes; apiCall(u1, 'jobs', {}); ok('read-no-write', __gasStats.writes - w0);
    // ลบแชทเก่า (PURGE) + ลบแถว
    BOT.PURGE = true;
    const st = sheetStore_({}); st.insert('BotMessages', { id: 'OLD1', thread_id: 'T', user_id: 'U03', role: 'user', text: 'เก่า', created_at: new Date(Date.now() - 100 * 864e5).toISOString() });
    const u3 = tok('u03'); apiCall(u3, 'bot_thread', {});
    ok('purge-old', !sheetStore_({}).list('BotMessages').some(m => m.id === 'OLD1'));
    // ลบบัญชี u04 (ไม่มีงานค้าง)
    const u4 = tok('u04'); apiCall(u4, 'bot_send', { text: 'สวัสดี' });
    let del; try { del = apiCall(u4, 'delete_account', { password: 'demo1234', confirm: 'ลบบัญชี' }); } catch (e) { del = e.message; }
    ok('delete-account', JSON.stringify(del).slice(0, 80) + ' / botmsgs left ' + sheetStore_({}).list('BotMessages').filter(m => m.user_id === 'U04').length);
    ok('lock-max', __gasStats.lockMax);
    ok('max-cell', __gasStats.maxCell);
    return out;
  });
  console.log(JSON.stringify(R, null, 1)); console.log('errors', errs);
  await b.close();
})();
