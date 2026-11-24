// ที่เก็บข้อมูลแบบไฟล์ HTML: เก็บใน localStorage ของเบราว์เซอร์เครื่องนี้เท่านั้น
function createLocalStore() {
  var KEY = 'theungmue-v2-db-2';
  var memory = null;
  function fresh() {
    var d = {};
    Object.keys(SCHEMA).forEach(function (t) { d[t] = []; });
    d.Users = seedUserRows();
    return d;
  }
  function read() {
    try {
      var d = JSON.parse(localStorage.getItem(KEY));
      if (d && d.Users) return d;
    } catch (e) {}
    if (memory) return memory;
    var f = fresh();
    write(f);
    return f;
  }
  function write(d) {
    memory = d;
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {
      // พื้นที่ในเบราว์เซอร์เต็ม (ส่วนใหญ่เพราะรูป): แจ้งให้ล้างข้อมูลทดสอบ ข้อมูลที่บันทึกไว้แล้วยังอยู่ครบ
      if (e && (e.name === 'QuotaExceededError' || e.code === 22)) {
        memory = null;
        throw new Error('พื้นที่เก็บข้อมูลในเบราว์เซอร์เต็ม กรุณาลบรูปบางส่วน หรือกด "ล้างข้อมูลทดสอบทั้งหมด"');
      }
    }
  }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  return {
    kind: 'local',
    list: function (t) { return clone(read()[t] || []); },
    insert: function (t, row) { var d = read(); (d[t] = d[t] || []).push(clone(row)); write(d); return row; },
    update: function (t, id, patch, ifMatch, key) {
      key = key || (SCHEMA[t] || ['id'])[0];
      var d = read();
      var row = (d[t] || []).filter(function (r) { return r[key] === id; })[0];
      if (!row) throw new Error('ไม่พบข้อมูล');
      if (ifMatch) for (var k in ifMatch) if (String(row[k]) !== String(ifMatch[k])) throw new Error('CONFLICT');
      for (var p in patch) row[p] = patch[p];
      write(d);
      return clone(row);
    },
    remove: function (t, id) { var d = read(); d[t] = (d[t] || []).filter(function (r) { return r.id !== id; }); write(d); },
    reset: function () { write(fresh()); },
  };
}
