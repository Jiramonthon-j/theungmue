// จำลอง Google Apps Script (SpreadsheetApp / DriveApp / LockService / PropertiesService / Utilities) สำหรับทดสอบ
// พฤติกรรม Sheet ที่จำลอง: ช่องที่ไม่ได้ตั้งเป็นข้อความจะแปลงตัวเลข/วันที่/TRUE-FALSE เอง · ข้อความขึ้นต้น = เป็นสูตร (แม้ตั้งเป็นข้อความ)
// · ขึ้นต้น ' = บังคับข้อความ (ไม่แสดง ') · ช่องละไม่เกิน 50,000 ตัวอักษร · getRange เกินขอบตารางเป็นข้อผิดพลาด
(function (G) {
  var KEY = 'gasmock-db';
  var mem = null;
  function ls() { try { return G.localStorage; } catch (e) { return null; } }
  function load() { var s = ls(); if (s) { try { var d = JSON.parse(s.getItem(KEY)); if (d) return d; } catch (e) {} return { sheets: {}, order: [], files: {}, props: {}, seq: 0 }; } return mem || (mem = { sheets: {}, order: [], files: {}, props: {}, seq: 0 }); }
  function save(d) { var s = ls(); if (s) s.setItem(KEY, JSON.stringify(d)); else mem = d; }
  G.__gasStats = { reads: 0, writes: 0, maxCell: 0 };
  function parseCell(v, fmt) {
    if (v === null || v === undefined) return { v: '', d: '' };
    if (typeof v === 'number') return { v: v, d: String(v) };
    if (typeof v === 'boolean') return { v: v, d: v ? 'TRUE' : 'FALSE' };
    var s = String(v);
    if (s.length > 50000) throw new Error('Your input contains more than the maximum of 50000 characters in a single cell.');
    G.__gasStats.maxCell = Math.max(G.__gasStats.maxCell, s.length);
    if (s.charAt(0) === "'") return { v: s.slice(1), d: s.slice(1) };
    if (s.charAt(0) === '=') return { v: s, d: '#ERROR!', f: true };
    if (fmt === '@') return { v: s, d: s };
    if (/^[+-]?\d+(\.\d+)?$/.test(s)) { var n = Number(s); return { v: n, d: String(n) }; }
    if (/^(true|false)$/i.test(s)) return { v: /^true$/i.test(s), d: s.toUpperCase() };
    if (/^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/.test(s)) { var t = new Date(s); return { v: t.toISOString(), d: (t.getMonth() + 1) + '/' + t.getDate() + '/' + t.getFullYear() + ' ' + t.getHours() + ':' + String(t.getMinutes()).padStart(2, '0') + ':' + String(t.getSeconds()).padStart(2, '0') }; }
    return { v: s, d: s };
  }
  function colNum(a) { var n = 0; for (var i = 0; i < a.length; i++) n = n * 26 + (a.charCodeAt(i) - 64); return n; }
  function Sheet(name) { this.name = name; }
  Sheet.prototype._d = function () { return load(); };
  Sheet.prototype._s = function (d) { return d.sheets[this.name]; };
  Sheet.prototype.getName = function () { return this.name; };
  Sheet.prototype.getLastRow = function () { var s = this._s(this._d()); for (var r = s.cells.length - 1; r >= 0; r--) if ((s.cells[r] || []).some(function (c) { return c && c.d !== ''; })) return r + 1; return 0; };
  Sheet.prototype.getLastColumn = function () { var s = this._s(this._d()), m = 0; s.cells.forEach(function (row) { (row || []).forEach(function (c, i) { if (c && c.d !== '') m = Math.max(m, i + 1); }); }); return m; };
  Sheet.prototype.getMaxRows = function () { return this._s(this._d()).maxRows; };
  Sheet.prototype.getMaxColumns = function () { return this._s(this._d()).maxCols; };
  Sheet.prototype.insertColumnsAfter = function (after, n) { var d = this._d(); this._s(d).maxCols += n; save(d); return this; };
  Sheet.prototype.insertRowsAfter = function (after, n) { var d = this._d(); this._s(d).maxRows += n; save(d); return this; };
  Sheet.prototype.setFrozenRows = function () { return this; };
  Sheet.prototype.deleteRow = function (r) { var d = this._d(), s = this._s(d); if (r < 1 || r > s.maxRows) throw new Error('deleteRow out of bounds'); s.cells.splice(r - 1, 1); s.maxRows -= 1; G.__gasStats.writes++; save(d); };
  Sheet.prototype.appendRow = function (vals) { var n = this.getLastRow() + 1; var d = this._d(), s = this._s(d); if (n > s.maxRows) s.maxRows = n; if (vals.length > s.maxCols) s.maxCols = vals.length; save(d); this.getRange(n, 1, 1, vals.length).setValues([vals]); return this; };
  Sheet.prototype.getDataRange = function () { var r = Math.max(1, this.getLastRow()), c = Math.max(1, this.getLastColumn()); return this.getRange(1, 1, r, c); };
  Sheet.prototype.getRange = function (a, b, c, e) {
    if (typeof a === 'string') { var m = /^([A-Z]+):([A-Z]+)$/.exec(a); if (!m) throw new Error('mock: unsupported A1 ' + a); var c1 = colNum(m[1]), c2 = colNum(m[2]); return this.getRange(1, c1, this.getMaxRows(), c2 - c1 + 1); }
    return new Range(this, a, b, c || 1, e || 1);
  };
  function Range(sh, r, c, nr, nc) {
    var s = sh._s(sh._d());
    if (r < 1 || c < 1 || r + nr - 1 > s.maxRows || c + nc - 1 > s.maxCols) throw new Error('Range out of bounds: ' + sh.name + ' r' + r + ' c' + c + ' ' + nr + 'x' + nc + ' (max ' + s.maxRows + 'x' + s.maxCols + ')');
    this.sh = sh; this.r = r; this.c = c; this.nr = nr; this.nc = nc;
  }
  Range.prototype._each = function (fn) { var d = this.sh._d(), s = this.sh._s(d); for (var i = 0; i < this.nr; i++) for (var j = 0; j < this.nc; j++) fn(s, this.r - 1 + i, this.c - 1 + j, i, j); return d; };
  Range.prototype.setNumberFormat = function (f) {
    var d = this.sh._d(), s = this.sh._s(d), self = this;
    if (this.r === 1 && this.nr === s.maxRows) { for (var j = 0; j < this.nc; j++) s.colFmt[this.c - 1 + j] = f; }
    else for (var i = 0; i < this.nr; i++) for (var k = 0; k < this.nc; k++) s.fmt[(self.r - 1 + i) + ':' + (self.c - 1 + k)] = f;
    save(d); return this; };
  Range.prototype.setFontWeight = function () { return this; };
  Range.prototype.setValues = function (vals) {
    if (vals.length !== this.nr || vals[0].length !== this.nc) throw new Error('setValues: size mismatch');
    G.__gasStats.writes++;
    var d = this._each(function (s, i, j, ii, jj) { var fmt = s.fmt[i + ':' + j] || s.colFmt[j] || null; (s.cells[i] = s.cells[i] || [])[j] = parseCell(vals[ii][jj], fmt); });
    save(d); return this;
  };
  Range.prototype.setValue = function (v) { var a = []; for (var i = 0; i < this.nr; i++) { a.push([]); for (var j = 0; j < this.nc; j++) a[i].push(v); } return this.setValues(a); };
  Range.prototype.getDisplayValues = function () { G.__gasStats.reads++; var out = []; this._each(function (s, i, j, ii) { var c = (s.cells[i] || [])[j]; (out[ii] = out[ii] || []).push(c ? c.d : ''); }); return out; };
  Range.prototype.getValues = function () { var out = []; this._each(function (s, i, j, ii) { var c = (s.cells[i] || [])[j]; (out[ii] = out[ii] || []).push(c ? c.v : ''); }); return out; };
  var SS = {
    getSheetByName: function (n) { return load().sheets[n] ? new Sheet(n) : null; },
    insertSheet: function (n) { var d = load(); d.sheets[n] = { cells: [], fmt: {}, colFmt: {}, maxRows: 1000, maxCols: 26 }; d.order.push(n); save(d); return new Sheet(n); },
    getSheets: function () { return load().order.map(function (n) { return new Sheet(n); }); },
  };
  G.SpreadsheetApp = { getActiveSpreadsheet: function () { return SS; }, flush: function () {}, getUi: function () { throw new Error('no UI in mock'); } };
  var lockHeld = 0;
  G.LockService = { getScriptLock: function () { return { waitLock: function () { lockHeld++; G.__gasStats.lockMax = Math.max(G.__gasStats.lockMax || 0, lockHeld); }, releaseLock: function () { lockHeld--; } }; } };
  G.__lockHeld = function () { return lockHeld; };
  G.PropertiesService = { getScriptProperties: function () { return { getProperty: function (k) { return load().props[k] || null; }, setProperty: function (k, v) { var d = load(); d.props[k] = String(v); save(d); } }; } };
  function b64(bytes) { return typeof Buffer !== 'undefined' ? Buffer.from(bytes).toString('base64') : btoa(String.fromCharCode.apply(null, bytes)); }
  function unb64(s) { if (typeof Buffer !== 'undefined') return Array.from(Buffer.from(s, 'base64')); var bin = atob(s), a = []; for (var i = 0; i < bin.length; i++) a.push(bin.charCodeAt(i)); return a; }
  G.Utilities = {
    base64Decode: unb64, base64Encode: b64,
    newBlob: function (bytes, type, name) { return { bytes: bytes, type: type, name: name, getBytes: function () { return bytes; } }; },
    getUuid: function () { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function () { return (Math.random() * 16 | 0).toString(16); }); },
  };
  G.DriveApp = {
    createFolder: function (n) { var d = load(); var id = 'F' + (++d.seq); d.files[id] = { folder: true, name: n }; save(d); return folderObj(id); },
    getFolderById: function (id) { if (!load().files[id]) throw new Error('no folder'); return folderObj(id); },
    getFileById: function (id) { var f = load().files[id]; if (!f) throw new Error('no file'); return { getBlob: function () { return { getBytes: function () { return unb64(f.b64); } }; } }; },
  };
  function folderObj(id) { return { getId: function () { return id; }, createFile: function (blob) { var d = load(); var fid = 'P' + (++d.seq); d.files[fid] = { name: blob.name, b64: b64(blob.bytes), parent: id }; save(d); return { getId: function () { return fid; } }; } }; }
  G.HtmlService = { XFrameOptionsMode: { ALLOWALL: 'ALLOWALL' } };
  G.ContentService = { MimeType: { JSON: 'application/json' }, createTextOutput: function (t) { var o = { text: t, mime: 'text/plain', setMimeType: function (m) { o.mime = m; return o; }, getContent: function () { return t; } }; return o; } };
})(typeof window !== 'undefined' ? window : globalThis);
