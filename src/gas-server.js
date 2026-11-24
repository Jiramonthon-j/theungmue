// ===================== ส่วนของ Google Apps Script =====================
// ที่เก็บข้อมูลคือ Google Sheet ที่ผูกกับสคริปต์นี้ (แต่ละตารางใน SCHEMA = 1 แท็บ) · รูปเก็บในโฟลเดอร์ Google Drive
// v2.27: ทุกช่องเป็นข้อความ (กันเลข 0 หน้าเบอร์หาย/วันที่ถูกแปลง) · กันข้อความที่ขึ้นต้นด้วย = + - @ ถูกอ่านเป็นสูตร
//        ล็อกเฉพาะตอนเขียน (อ่านพร้อมกันได้) · จำข้อมูลที่อ่านแล้วภายในคำขอเดียว · ลบแถวได้ (ลบบัญชี/ลบแชทเก่า)

function doGet() {
  ensureSetup_();
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle(CONFIG.APP_NAME + ' ' + CONFIG.APP_NAME_TH + ' — ' + CONFIG.TAGLINE)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL); // ฝังในหน้า GitHub Pages ได้
}

// หน้าเว็บเรียกฟังก์ชันนี้ผ่าน google.script.run
function apiCall(token, action, args) {
  var store = sheetStore_({ cache: true, lock: true });
  try {
    var result = createLogic(store).handle(token, action, args || {});
    return JSON.parse(JSON.stringify(result));
  } finally {
    store.release();
  }
}

// หน้าเว็บบน GitHub Pages เรียกผ่าน fetch POST (ข้อความ JSON) → ตอบ JSON { ok, data | error }
function doPost(e) {
  var out;
  try {
    var q = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    out = { ok: true, data: apiCall(q.token || null, String(q.action || ''), q.args || {}) };
  } catch (err) {
    out = { ok: false, error: String((err && err.message) || err).replace(/^Error:\s*/, '') };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

/** ติดตั้งครั้งแรก: เลือกฟังก์ชัน setup แล้วกด Run (สร้างแท็บทุกตาราง + บัญชีแอดมิน) */
function setup() { ensureSetup_(); }

// เมนู "TheungMue" ใน Google Sheet (สคริปต์ผูกกับ Sheet)
function onOpen() {
  SpreadsheetApp.getUi().createMenu('TheungMue')
    .addItem('ติดตั้ง / ตรวจตาราง', 'setup')
    .addItem('ตั้งรหัสผ่านแอดมิน', 'promptAdminPassword')
    .addToUi();
}
function promptAdminPassword() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.prompt('ตั้งรหัสผ่านแอดมิน', 'รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  ui.alert(setAdminPassword(r.getResponseText()));
}

/** ตั้งรหัสผ่านแอดมินใหม่ (เรียกจากเมนู TheungMue → ตั้งรหัสผ่านแอดมิน) */
function setAdminPassword(pw) {
  pw = pw || '';
  if (String(pw).length < 8) throw new Error('รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร');
  ensureSetup_();
  var st = sheetStore_({});
  var admin = st.list('Users').filter(function (u) { return u.role === 'admin' && u.status !== 'deleted'; })[0];
  if (!admin) throw new Error('ไม่พบบัญชีแอดมิน');
  var salt = Utilities.getUuid().replace(/-/g, '');
  st.update('Users', admin.id, { pass_hash: hashPassword(String(pw), salt), salt: salt, must_change: '', failed_count: '0', locked_until: '' });
  return 'ตั้งรหัสผ่านแอดมิน @' + admin.username + ' แล้ว';
}

var TEXT_FMT_ = '@';
function ensureSetup_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SCHEMA).forEach(function (name) {
    var cols = SCHEMA[name];
    var sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getMaxColumns() < cols.length) sh.insertColumnsAfter(sh.getMaxColumns(), cols.length - sh.getMaxColumns());
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).setNumberFormat(TEXT_FMT_); // ทุกช่องเป็นข้อความ
      sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
      sh.setFrozenRows(1);
      if (name === 'Users') {
        // ใช้จริง: มีแค่บัญชีแอดมิน รหัสผ่านสุ่ม (ไม่มีใครรู้) ต้องตั้งรหัสผ่านจากเมนู TheungMue ใน Sheet ก่อนใช้
        if (CONFIG.PRODUCTION) CONFIG.DEMO_PASSWORD = Utilities.getUuid();
        var st = sheetStore_({});
        seedUserRows().forEach(function (u) { st.insert('Users', u); });
      }
    } else {
      // เพิ่มคอลัมน์ที่ยังไม่มี (กรณีอัปเดตโค้ดจากเวอร์ชันเก่า)
      var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
      cols.forEach(function (c) {
        if (head.indexOf(c) >= 0) return;
        if (sh.getMaxColumns() < head.length + 1) sh.insertColumnsAfter(sh.getMaxColumns(), 1);
        sh.getRange(1, head.length + 1, sh.getMaxRows(), 1).setNumberFormat(TEXT_FMT_);
        sh.getRange(1, head.length + 1).setValue(c).setFontWeight('bold');
        head.push(c);
      });
    }
  });
}

// ข้อความที่ขึ้นต้นด้วยอักษรเหล่านี้ Sheet อาจอ่านเป็นสูตร: เติมตัวอักษรล่องหน (U+2060) ไว้หน้า และตัดออกตอนอ่าน
var GUARD_ = '⁠';
function cellOut_(v) {
  if (v == null) return '';
  var s = String(v);
  return /^[=+\-@'⁠]/.test(s) ? GUARD_ + s : s;
}
function cellIn_(s) { return s.charAt(0) === GUARD_ ? s.slice(1) : s; }

function sheetStore_(opt) {
  opt = opt || {};
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = {}, cache = {}, lock = null;
  function sheet(t) {
    if (sheets[t]) return sheets[t];
    var sh = ss.getSheetByName(t);
    if (!sh) { ensureSetup_(); sh = ss.getSheetByName(t); } // ยังไม่ได้ติดตั้ง/มีคนลบแท็บ: สร้างให้ใหม่
    return (sheets[t] = sh);
  }
  // ล็อกเมื่อจะเขียนครั้งแรก แล้วถือไว้จนจบคำขอ (คำขอที่อ่านอย่างเดียวไม่ต้องรอกัน)
  function writing(t) {
    if (opt.lock && !lock) { lock = LockService.getScriptLock(); lock.waitLock(20000); cache = {}; }
    delete cache[t];
  }
  function rows(t) { // อ่านทั้งแท็บ: [หัวตาราง, ...แถว]
    var v = sheet(t).getDataRange().getDisplayValues();
    return v.map(function (r) { return r.map(cellIn_); });
  }
  function toObj(head, r) { var o = {}; head.forEach(function (h, i) { o[h] = r[i]; }); return o; }
  function writeRow(sh, rowNo, head, o) {
    var vals = head.map(function (c) { return cellOut_(o[c]); });
    sh.getRange(rowNo, 1, 1, head.length).setNumberFormat(TEXT_FMT_).setValues([vals]);
  }
  function photoFolder() {
    var props = PropertiesService.getScriptProperties(), id = props.getProperty('PHOTO_FOLDER_ID');
    if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
    var f = DriveApp.createFolder('TheungMue Photos');
    props.setProperty('PHOTO_FOLDER_ID', f.getId());
    return f;
  }
  return {
    kind: 'google-sheet',
    release: function () { if (lock) { SpreadsheetApp.flush(); lock.releaseLock(); lock = null; } },
    // รูปเก็บเป็นไฟล์ใน Drive (ช่องใน Sheet เก็บได้ไม่เกิน 50,000 ตัวอักษร) · Sheet จดแค่รหัสไฟล์
    putPhoto: function (dataUrl, name) {
      var b64 = String(dataUrl).split(',')[1];
      var blob = Utilities.newBlob(Utilities.base64Decode(b64), 'image/jpeg', name + '.jpg');
      return 'drive:' + photoFolder().createFile(blob).getId();
    },
    getPhoto: function (ref) {
      if (String(ref).indexOf('drive:') !== 0) return ref;
      try {
        var blob = DriveApp.getFileById(String(ref).slice(6)).getBlob();
        return 'data:image/jpeg;base64,' + Utilities.base64Encode(blob.getBytes());
      } catch (e) { return ''; } // ไฟล์ถูกลบจาก Drive
    },
    list: function (t) {
      if (!opt.cache || !cache[t]) {
        var v = rows(t), head = v.shift() || [];
        cache[t] = v.filter(function (r) { return r[0] !== ''; }).map(function (r) { return toObj(head, r); });
      }
      return cache[t].map(function (o) { var c = {}; for (var k in o) c[k] = o[k]; return c; });
    },
    insert: function (t, row) {
      writing(t);
      var sh = sheet(t);
      var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
      var n = sh.getLastRow() + 1;
      if (n > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), 50);
      writeRow(sh, n, head, row);
      return row;
    },
    update: function (t, id, patch, ifMatch, key) {
      writing(t);
      var sh = sheet(t), v = rows(t), head = v[0];
      var kc = head.indexOf(key || SCHEMA[t][0]);
      for (var i = 1; i < v.length; i++) {
        if (v[i][kc] !== String(id)) continue;
        var o = toObj(head, v[i]);
        if (ifMatch) for (var k in ifMatch) if (String(o[k]) !== String(ifMatch[k])) throw new Error('CONFLICT');
        for (var p in patch) if (head.indexOf(p) >= 0) o[p] = patch[p] == null ? '' : String(patch[p]);
        writeRow(sh, i + 1, head, o);
        return o;
      }
      throw new Error('ไม่พบข้อมูล');
    },
    remove: function (t, id) {
      writing(t);
      var sh = sheet(t), v = rows(t), kc = v[0].indexOf(SCHEMA[t][0]);
      for (var i = v.length - 1; i >= 1; i--) if (v[i][kc] === String(id)) sh.deleteRow(i + 1);
    },
  };
}
