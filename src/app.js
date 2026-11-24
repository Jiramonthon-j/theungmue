// ===================== หน้าเว็บ =====================
(function () {
  var IS_GAS = typeof google !== 'undefined' && google.script && google.script.run;
  // หน้าเว็บบน GitHub Pages: ส่งคำขอไป Apps Script (/exec) โดยไม่แนบบัญชี Google ของผู้เปิด
  var API_URL = (typeof CONFIG !== 'undefined' && CONFIG.API_URL) || '';
  var REMOTE = !!(IS_GAS || API_URL);
  var local = REMOTE ? null : createLogic(createLocalStore());
  var TZ = 'Asia/Bangkok';
  var app = document.getElementById('app');
  var state = { view: 'auth', id: null, back: null };
  var me = null;
  var timers = [];
  var memToken = null;

  // ---------- token การเข้าสู่ระบบ ----------
  // เวอร์ชัน Google: จำการเข้าสู่ระบบไว้ในเบราว์เซอร์ / ไฟล์ HTML: แยกตามแท็บ (เปิดหลายแท็บเป็นคนละบัญชีได้)
  function box() { try { return REMOTE ? localStorage : sessionStorage; } catch (e) { return null; } }
  function getToken() { try { return (box() && box().getItem('songtor-token')) || memToken; } catch (e) { return memToken; } }
  function setToken(v) {
    memToken = v; memo = {};
    try { if (box()) { v ? box().setItem('songtor-token', v) : box().removeItem('songtor-token'); } } catch (e) {}
  }

  // ---- เวอร์ชันออนไลน์ (Apps Script ตอบช้า ~1.5–2 วินาทีต่อคำขอ) ----
  // 1) หน้าที่เคยเปิดแล้วแสดงข้อมูลล่าสุดที่จำไว้ทันที แล้วดึงของใหม่ตามหลัง ถ้าเปลี่ยนจึงวาดใหม่
  // 2) มีแถบโหลดบางๆ ด้านบนระหว่างรอ  3) กดคำสั่งที่เปลี่ยนข้อมูลแล้วล้างที่จำไว้ทั้งหมด
  var SWR = { jobs: 1, job: 1, points: 1, profile: 1, chat_inbox: 1, messages: 1, photos: 1, admin_overview: 1, admin_badges: 1, bot_unread: 1,
    bot_thread: 1, bot_queue: 1, bot_stats: 1, bot_history: 1, bot_admin_thread: 1, pricing: 1, recipients: 1, contact: 1 };
  var NOCLEAR = { session: 1, lock_status: 1, check_name: 1, check_phone: 1, check_username: 1, quote: 1, demo: 1, rewards_unseen: 1 };
  var memo = {}, staleTimer = null, busy = 0, busyTimer = null;
  function busyOn() { busy++; if (!busyTimer) busyTimer = setTimeout(function () { document.body.classList.add('netbusy'); }, 250); }
  function busyOff() { if (--busy > 0) return; busy = 0; clearTimeout(busyTimer); busyTimer = null; document.body.classList.remove('netbusy'); }
  function onStale() { // ข้อมูลที่แสดงอยู่เก่าไป: เรียกตัวดึงข้อมูลของหน้านี้อีกรอบ
    clearTimeout(staleTimer);
    staleTimer = setTimeout(function () { if (typing()) return; timerFns.forEach(function (f) { try { f(); } catch (e) {} }); }, 60);
  }
  function call(action, args) {
    if (!REMOTE) return rawCall(action, args);
    if (!SWR[action]) {
      if (!NOCLEAR[action]) memo = {};
      busyOn();
      return rawCall(action, args).then(function (d) { busyOff(); return d; }, function (e) { busyOff(); throw e; });
    }
    var k = action + '|' + JSON.stringify(args || {}), hit = memo[k];
    if (!hit) busyOn();
    var net = rawCall(action, args).then(function (d) {
      if (!hit) busyOff();
      var s = JSON.stringify(d), old = memo[k];
      memo[k] = s;
      if (hit && old !== s) onStale();
      return d;
    }, function (e) { if (!hit) busyOff(); throw e; });
    if (hit) { net.catch(function () {}); return Promise.resolve(JSON.parse(hit)); }
    return net;
  }
  function rawCall(action, args) {
    var token = getToken();
    return new Promise(function (resolve, reject) {
      if (IS_GAS) {
        google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(function (e) { reject(new Error(String((e && e.message) || e).replace(/^Error:\s*/, ''))); })
          .apiCall(token, action, args || {});
      } else if (API_URL) {
        fetch(API_URL, { method: 'POST', credentials: 'omit', redirect: 'follow',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // แบบ simple request ไม่ต้องขอ CORS ล่วงหน้า
          body: JSON.stringify({ token: token, action: action, args: args || {} }) })
          .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
          .then(function (d) { if (d && d.ok) resolve(d.data); else reject(new Error((d && d.error) || 'เกิดข้อผิดพลาด')); })
          .catch(function (e) { reject(/^(Failed to fetch|NetworkError|Load failed|HTTP )/.test(e.message) ? new Error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่') : e); });
      } else {
        try { resolve(JSON.parse(JSON.stringify(local.handle(token, action, args || {})))); }
        catch (e) { reject(e); }
      }
    });
  }

  // ---------- ตัวช่วย ----------
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmtClock(iso) { return fmtTime(iso).replace('วันนี้ ', ''); }
  function fmtTime(iso) {
    if (!iso) return '–';
    var d = new Date(iso);
    var today = new Date().toLocaleDateString('en-CA', { timeZone: TZ });
    var day = d.toLocaleDateString('en-CA', { timeZone: TZ });
    var time = d.toLocaleTimeString('th-TH', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
    if (day === today) return 'วันนี้ ' + time;
    return d.toLocaleDateString('th-TH', { timeZone: TZ, day: 'numeric', month: 'short' }) + ' ' + time;
  }
  function fmtDate(iso) { return iso ? new Date(iso).toLocaleDateString('th-TH', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' }) : '–'; }
  function timeLeft(iso) {
    var ms = new Date(iso) - Date.now();
    if (ms <= 0) return 'เลยกำหนดแล้ว';
    var m = Math.round(ms / 60000);
    if (m < 60) return 'อีก ' + m + ' นาที';
    if (m >= 180) return 'อีก ' + Math.round(m / 60) + ' ชม.';
    return 'อีก ' + Math.floor(m / 60) + ' ชม.' + (m % 60 ? ' ' + (m % 60) + ' นาที' : '');
  }
  function fmtPhone(p) { return p && p.length === 10 ? p.slice(0, 3) + '-' + p.slice(3, 6) + '-' + p.slice(6) : (p || ''); }
  function closed(j) { return j.status === 'delivered' || j.status === 'cancelled'; }
  function active(j) { return j.status === 'accepted' || j.status === 'picked'; }
  var timerFns = [];
  function clearTimers() { timers.forEach(clearInterval); timers = []; timerFns = []; }
  // ดึงข้อมูลใหม่เป็นระยะ · ไม่ดึงตอนสลับไปแท็บอื่น · เวอร์ชัน Google ช้าลง 2.5 เท่า (8 วิ → 20 วิ) ลดภาระ Apps Script
  function every(ms, fn) { timerFns.push(fn); timers.push(setInterval(function () { if (document.hidden) return; fn(); }, REMOTE ? ms * 2.5 : ms)); }
  function typing() { var a = document.activeElement; return a && /INPUT|TEXTAREA|SELECT/.test(a.tagName); }
  function showError(id, msg) {
    var el = document.getElementById(id);
    if (el) { el.textContent = msg || ''; el.style.display = msg ? 'block' : 'none'; }
  }
  function $(id) { return document.getElementById(id); }

  // ---------- ไอคอน (เส้นเรียบ) ----------
  var ICON = {
    home: '<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/>',
    plus: '<circle cx="12" cy="12" r="8.5"/><path d="M12 8v8M8 12h8"/>',
    inbox: '<path d="M4 13l2.5-7h11L20 13v6H4z"/><path d="M4 13h4.5l1.5 2.5h4L15.5 13H20"/>',
    user: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/>',
    list: '<path d="M9 7h11M9 12h11M9 17h11"/><circle cx="5" cy="7" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="5" cy="17" r="1"/>',
    route: '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7"/>',
    check: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>',
    tick: '<path d="M5 12.5l4 4 9-9"/>',
    chat: '<path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7a2.5 2.5 0 0 1-2.5 2.5H11l-4 3.5V16a2 2 0 0 1-2-2z"/>',
    next: '<path d="M9 5l7 7-7 7"/>',
    login: '<path d="M10 17l5-5-5-5"/><path d="M15 12H4"/><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/>',
    logout: '<path d="M14 17l5-5-5-5"/><path d="M19 12H8"/><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"/>',
    box: '<path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v8"/>',
    staro: '<path d="M12 4l2.4 5 5.6.6-4.2 3.8 1.2 5.5L12 16.2 7 18.9l1.2-5.5L4 9.6l5.6-.6z"/>',
    alert: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v5.5"/><circle cx="12" cy="16.3" r=".5"/>',
    ticks: '<path d="M2.5 12.5l4 4 9-9"/><path d="M11.5 15.5l1 1 9-9"/>',
    phone: '<path d="M6.5 4h3l1.5 4-2 1.5a10 10 0 0 0 5.5 5.5l1.5-2 4 1.5v3a1.5 1.5 0 0 1-1.6 1.5A15 15 0 0 1 5 5.6 1.5 1.5 0 0 1 6.5 4z"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    camera: '<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2l1.4-2h5.8l1.4 2h2.2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="12.8" r="3.4"/>',
    gift: '<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M3 9h18M12 9v11M12 9S10.5 4.5 8 4.5A2.2 2.2 0 0 0 8 9M12 9s1.5-4.5 4-4.5A2.2 2.2 0 0 1 16 9"/>',
    edit: '<path d="M4 20h4l10-10-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.8 9.5a2.3 2.3 0 0 1 4.4.8c0 1.6-2.2 1.9-2.2 3.4"/><circle cx="12" cy="16.8" r=".5"/>',
    out: '<path d="M14 5h4a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-4M10 16l-4-4 4-4M6 12h9"/>',
    trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/>',
    warn: '<path d="M12 4l9 16H3z"/><path d="M12 10v4"/><circle cx="12" cy="17" r=".5"/>',
    // คนเดิน: ไอคอน directions_walk ของ Material Icons (Google, Apache License 2.0) แบบทึบ
    walk: '<path fill="currentColor" stroke="none" d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/>',
    navi: '<path d="M4 11l16-7-7 16-2-7z"/>',
    up: '<path d="M6 15l6-6 6 6"/>',
    down: '<path d="M6 9l6 6 6-6"/>',
    coin: '<circle cx="12" cy="12" r="8.5"/><path d="M14.5 9.3c-.4-.8-1.3-1.3-2.5-1.3-1.5 0-2.5.8-2.5 1.9 0 2.6 5 1.4 5 4.1 0 1.1-1.1 2-2.5 2-1.3 0-2.2-.6-2.6-1.4M12 6.5V8M12 16v1.5"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
    eye: '<path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M2.5 12s3.5-6.5 9.5-6.5c2 0 3.7.7 5.1 1.7M21.5 12s-3.5 6.5-9.5 6.5c-2 0-3.7-.7-5.1-1.7"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="M4 20L20 4"/>',
    dot: '<circle cx="12" cy="12" r="7.5"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5"/><circle cx="12" cy="7.8" r=".6"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    spark: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l2 2M14 9l2 2"/>',
    doc: '<path d="M7 4h7l4 4v12H7z"/><path d="M14 4v4h4M10 13h5M10 16h5"/>',
    bag: '<path d="M6 10h12l-1 9H7z"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/>',
    chart: '<path d="M4 19V5M4 19h16M8 15v-4M12 15V8M16 15v-6"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  };
  function icon(n) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICON[n] + '</svg>'; }
  var STAR = '<path d="M12 3.6l2.5 5.2 5.7.8-4.1 4 1 5.7L12 16.6l-5.1 2.7 1-5.7-4.1-4 5.7-.8z"/>';
  function stars(n, size) {
    var h = '<span class="stars' + (size ? ' ' + size : '') + '" aria-label="' + n + ' ดาว">';
    for (var i = 1; i <= 5; i++) h += '<svg viewBox="0 0 24 24" class="' + (i <= Math.round(n) ? 'on' : '') + '">' + STAR + '</svg>';
    return h + '</span>';
  }
  function ratingStat(r) {
    return '<div class="stat"><b>' + (r.count ? r.avg.toFixed(1) : '–') + '</b>' + stars(r.avg, 'sm') +
      '<span>' + (r.count ? r.count + ' รีวิว' : 'ยังไม่มีรีวิว') + '</span></div>';
  }

  // ---------- โครงหน้าจอ ----------
  var NAV = {
    user: [['u-home', 'home', 'หน้าแรก'], ['u-orders', 'list', 'คำสั่งของฉัน'], ['u-incoming', 'inbox', 'ของที่จะได้รับ'], ['profile', 'user', 'ฉัน']],
    admin: [['a-orders', 'list', 'คำสั่ง'], ['chats', 'chat', 'แชท'], ['a-home', 'chart', 'ภาพรวม'], ['profile', 'user', 'ฉัน']],
  };
  function shell(title, body, opts) {
    opts = opts || {};
    var role = me.role;
    var current = opts.nav || state.view;
    return '<header class="topbar"><div class="row gap">' +
      (opts.back ? '<button class="iconbtn" data-act="nav-back" aria-label="กลับ">' + icon('back') + '</button>' : '<span class="brand">' + esc(CONFIG.APP_NAME) + '</span>') +
      (opts.back ? '<span class="crumb">' + esc(title) + '</span>' : '') +
      '</div><div class="row gap">' +
      (role !== 'admin' ? '<button class="iconbtn chaticon' + (state.view === 'chats' ? ' on' : '') + '" data-go="chats" aria-label="แชท">' + icon('chat') +
        '<span class="cbadge" id="cbadge"' + (chatUnread ? '' : ' hidden') + '>' + (chatUnread > 99 ? '99+' : chatUnread) + '</span></button>' : '') +
      '<span class="rolechip">' + (role === 'admin' ? 'แอดมิน' : 'ผู้ใช้') + '</span></div></header>' +
      (opts.back || !title ? '' : '<h1>' + esc(title) + '</h1>') +
      body +
      '<nav class="tabbar">' + NAV[role].map(function (n) {
        var bn = role === 'admin' && adminBadges ? (n[0] === 'chats' ? adminBadges.bot + adminBadges.order_unread : n[0] === 'a-orders' ? adminBadges.pending : 0) : 0; // ตัวเลขล่าสุด (กันกระพริบตอนหน้ารีเฟรช)
        return '<button data-go="' + n[0] + '" class="' + (n[0] === current ? 'on' : '') + '">' + icon(n[1]) + '<span>' + n[2] + '</span>' + (bn ? '<em class="navbadge">' + (bn > 99 ? '99+' : bn) + '</em>' : '') + '</button>';
      }).join('') + '</nav>';
  }
  function badge(s) { return '<span class="badge st-' + s + '">' + esc(CONFIG.STATUS[s] || s) + '</span>'; }
  function modeTag(m) { return '<span class="mode m-' + m + '">' + esc((CONFIG.MODES[m] || {}).label || m) + '</span>'; }


  function jobCardInner(j, extra) {
    var bdg = j.status === 'pending' && j.cod_status === 'waiting' ? '<span class="badge st-pending">รอผู้รับยอมรับ</span>' : badge(j.status);
    return '<div class="row between"><div class="row gap">' + modeTag(j.mode) + '<strong>' + esc(j.id) + '</strong>' + codTag(j) + '</div>' + bdg + '</div>' +
      '<div class="route"><span class="arrow">ส่งถึง</span><span>' + esc(zoneName(j.dropoff_zone, j.dropoff_detail)) + '</span>' + (j.total ? '<b class="price">' + baht(j.total) + '</b>' : '') + '</div>' +
      '<div class="meta"><span>' + esc(j.item_type) + '</span>' +
      (closed(j) ? '<span>' + fmtTime(j.delivered_at || j.cancelled_at) + '</span>' : '<span>ต้องถึง ' + fmtTime(j.due_at) + ' · ' + timeLeft(j.due_at) + '</span>') +
      (j.overdue_min ? '<span class="latepill">เลยกำหนด ' + j.overdue_min + ' นาที</span>' : j.near_due ? '<span class="latepill warn">ใกล้กำหนด</span>' : '') +
      (j.status === 'delivered' && Number(j.late_min) > CONFIG.LATE.GRACE_MIN && !j.late_excused ? '<span class="latepill">ส่งช้า ' + j.late_min + ' นาที</span>' : '') +
      (extra ? '<span>' + extra + '</span>' : '') + '</div>';
  }
  function jobCard(j, extra) { return '<a href="#" class="card job" data-job="' + esc(j.id) + '">' + jobCardInner(j, extra) + '</a>'; }
  function list(items, emptyText, extraFn) {
    if (!items.length) return '<p class="empty">' + esc(emptyText) + '</p>';
    return '<div class="stack">' + items.map(function (j) { return jobCard(j, extraFn && extraFn(j)); }).join('') + '</div>';
  }
  function section(title, items, emptyText, extraFn) {
    return '<h2>' + esc(title) + ' <span class="count">' + items.length + '</span></h2>' + list(items, emptyText, extraFn);
  }
  // ---------- ระยะทาง แผนที่ (OpenStreetMap + Leaflet) และเครดิต ----------
  function walkMin(m) { return Math.max(1, Math.round(m / CONFIG.WALK_M_PER_MIN)); }
  function gmapsUrl(ll) { // นำทางด้วย Google Maps (ลิงก์ธรรมดา ฟรี)
    var o = CONFIG.DROP_POINT_LL;
    return 'https://www.google.com/maps/dir/?api=1&origin=' + o[0] + ',' + o[1] + '&destination=' + ll[0] + ',' + ll[1] + '&travelmode=walking';
  }
  function tierClass(label) { return { 'ระยะใกล้': 't1', 'ระยะกลาง': 't2', 'ระยะไกล': 't3' }[label] || 't2'; }
  // แถบบอกระยะ + แผนที่เส้นทาง (open = กางแผนที่ไว้เลย) + ปุ่มนำทาง (nav)
  function routeBox(zone, opts) {
    opts = opts || {};
    var p = CONFIG.PLACES[zone];
    if (!zone) return '';
    if (!p) return '<div class="distrow solo">' + icon('walk') + '<span>' + (zone === CONFIG.ZONE_OTHER ? 'ระยะขึ้นอยู่กับสถานที่ที่ระบุ' : 'ยังไม่มีข้อมูลระยะของสถานที่นี้') + '</span>' +
      '<span class="tier t2">' + esc(CONFIG.TIERS[1].label) + '</span></div>';
    var t = CONFIG.TIERS.filter(function (x) { return p.m <= x.max; })[0];
    return '<div class="routebox' + (opts.open ? ' open' : '') + '"><div class="distrow">' + icon('walk') +
      '<span><b>' + p.m + ' ม.</b> · เดิน ' + walkMin(p.m) + ' นาที</span><span class="tier ' + tierClass(t.label) + '">' + t.label + '</span>' +
      (opts.open ? '' : '<button type="button" class="maptoggle" data-act="maptoggle"><span>ดูเส้นทาง</span>' + icon('down') + '</button>') + '</div>' +
      '<div class="mapwrap"' + (opts.open ? '' : ' hidden') + '><div class="rmap" data-zone="' + esc(zone) + '"></div>' +
      '<div class="mapfoot"><span>เส้นประบอกทิศทาง ระยะที่แสดงเป็นระยะเดินโดยประมาณ</span><span class="offline" hidden>ต้องต่ออินเทอร์เน็ตเพื่อแสดงแผนที่</span></div></div>' +
      (opts.nav ? '<a class="btn ghost navbtn" target="_blank" rel="noopener" href="' + gmapsUrl(p.ll) + '">' + icon('navi') + 'นำทางด้วย Google Maps</a>' : '') + '</div>';
  }
  function mountMaps() {
    if (!window.L) return;
    var accent = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#1d5c63';
    app.querySelectorAll('.rmap:not([data-on])').forEach(function (el) {
      if (el.offsetParent === null) return; // ยังพับอยู่ ไว้สร้างตอนกาง
      var p = CONFIG.PLACES[el.getAttribute('data-zone')];
      if (!p) return;
      el.setAttribute('data-on', '1');
      var O = CONFIG.DROP_POINT_LL, same = O[0] === p.ll[0] && O[1] === p.ll[1];
      var m = L.map(el, { zoomControl: false, scrollWheelZoom: false });
      var tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(m);
      tiles.once('tileerror', function () { var off = el.parentNode.querySelector('.offline'); if (off) off.hidden = false; });
      var dot = function (cls) { return L.divIcon({ className: '', html: '<div class="' + cls + '"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }); };
      L.marker(O, { icon: dot('mk-o') }).addTo(m).bindTooltip(same ? 'จุดรับฝาก · ปลายทางอยู่ในอาคารเดียวกัน' : 'จุดรับฝาก', { permanent: true, direction: 'left', className: 'mlab', offset: [-8, 0] });
      if (same) { m.setView(O, 18); }
      else {
        L.polyline([O, p.ll], { color: '#ffffff', weight: 8, opacity: .9 }).addTo(m);
        L.polyline([O, p.ll], { color: accent, weight: 4, dashArray: '8 7' }).addTo(m);
        L.marker(p.ll, { icon: dot('mk-d') }).addTo(m).bindTooltip(el.getAttribute('data-zone').replace(/ \(.*\)$/, ''), { permanent: true, direction: 'right', className: 'mlab', offset: [8, 0] });
        m.fitBounds([O, p.ll], { padding: [40, 40], maxZoom: 18 });
      }
      L.control.zoom({ position: 'bottomright' }).addTo(m);
    });
  }



  function leftText(iso) { // เวลาที่เหลือ เช่น "18 ชม." / "35 นาที"
    var ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return 'หมดเวลาแล้ว';
    var h = Math.floor(ms / 3600000);
    return h >= 1 ? h + ' ชม.' : Math.max(1, Math.ceil(ms / 60000)) + ' นาที';
  }
  function tagsHtml(t, cls) { return t ? '<div class="tagrow ' + (cls || '') + '">' + String(t).split('|').map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</div>' : ''; }

  // ---------- ประวัติ: หน้าหลักแสดงล่าสุด 3 รายการ ที่เหลือดูในหน้า "ประวัติทั้งหมด" (ไม่ลบ ซ่อนได้) ----------
  var HIST_PREVIEW = 3;
  function closedAt(j) { return j.delivered_at || j.cancelled_at || j.created_at; }
  function byClosedDesc(a, b) { return String(closedAt(b)).localeCompare(String(closedAt(a))); }
  function historyPreview(kind, title, items, emptyText, extraFn) {
    var vis = items.filter(function (j) { return !j.hidden; }).sort(byClosedDesc);
    var nHid = items.length - vis.length;
    var empty = nHid ? 'ไม่มีรายการที่แสดง (ซ่อนไว้ ' + nHid + ' รายการ)' : emptyText;
    return '<h2>' + esc(title) + ' <span class="count">' + vis.length + '</span>' +
      (items.length ? '<button class="h2link" data-hist="' + kind + '">ดูทั้งหมด</button>' : '') + '</h2>' +
      list(vis.slice(0, HIST_PREVIEW), empty, extraFn); // ดูทั้งหมดได้ที่ลิงก์หัวข้ออันเดียว
  }

  function handleAuthError(e) {
    if (/ตั้งรหัสผ่านใหม่ก่อน/.test(e.message) && me) { me.must_change = true; go('force-pw'); return true; }
    if (/ถูกระงับ/.test(e.message)) {
      setToken(null); me = null; state.authNotice = { text: e.message, kind: 'bad' }; state.view = 'auth'; render('login'); return true;
    }
    if (/เข้าสู่ระบบ/.test(e.message)) { setToken(null); me = null; go('auth'); return true; }
    return false;
  }
  // ---------- ย้อนกลับแบบแอปทั่วไป: จำเส้นทางเป็นลำดับชั้น ----------
  // หน้าเมนูหลัก (เมนูล่าง/แชท) = เริ่มเส้นทางใหม่ / หน้างานและหน้าแชท = ซ้อนต่อจากหน้าเดิม
  // ถ้าเปิดหน้าที่อยู่ในเส้นทางอยู่แล้ว (เช่น แชท → ดูงาน → กดแชทของงานเดิม) จะย้อนกลับไปหน้านั้นแทนการซ้อนใหม่ จึงไม่วนลูป
  state.stack = [];
  function navOpen(view, id, room) {
    var same = function (e) { return e.view === view && e.id === id; }; // แชทของงานเดียวกันนับเป็นหน้าเดียวกัน (สลับห้องในหน้าได้)
    for (var i = state.stack.length - 1; i >= 0; i--) {
      if (same(state.stack[i])) {
        var e = state.stack[i];
        state.stack = state.stack.slice(0, i);
        state.view = e.view; state.id = e.id; state.room = view === 'chat' && room ? room : e.room;
        render(); window.scrollTo(0, 0); return;
      }
    }
    if (!(state.view === view && state.id === id)) {
      state.stack.push({ view: state.view, id: state.id, room: state.room });
    }
    state.view = view; state.id = id; state.room = room;
    render(); window.scrollTo(0, 0);
  }
  function navBack() {
    var e = state.stack.pop() || { view: home() };
    state.view = e.view; state.id = e.id; state.room = e.room;
    render(); window.scrollTo(0, 0);
  }
  function navRoot() { // แท็บเมนูล่างที่หน้างาน/แชทซ้อนอยู่ (ไว้ไฮไลต์เมนูล่าง)
    var r = state.stack.length ? state.stack[0].view : home();
    return r === 'chat' || r === 'job' || r === 'history' || r === 'activity' || r === 'reviews' || r === 'credits' || r === 'points' || r === 'points-all' || r === 'editprofile' || r === 'changepw' || r === 'deleteacc' || r === 'u-new' || r === 'resetpw' || r === 'pricing' || r === 'bot' || r === 'a-bot' || r === 'bot-history' || r === 'bot-day' ? home() : r;
  }
  function go(view, id) {
    state.stack = [];
    state.view = view; state.id = id || null;
    render(); window.scrollTo(0, 0);
  }

  // ---------- หน้าเข้าสู่ระบบ / สมัครสมาชิก ----------
  function viewAuth(mode) {
    document.body.className = 'role-none';
    mode = mode || 'login';
    app.innerHTML =
      '<div class="auth"><i class="tape authtape"></i>' +
      '<div class="brandblock"><span class="authpg">' + BIRD + '</span><span class="brand big">' + esc(CONFIG.APP_NAME) + '</span><div class="brand-th">' + esc(CONFIG.APP_NAME_TH) + '</div><p class="sub">' + esc(CONFIG.TAGLINE) + '</p></div>' +
      '<div class="tabs"><button data-auth="login" class="' + (mode !== 'register' ? 'on' : '') + '">เข้าสู่ระบบ</button>' +
      '<button data-auth="register" class="' + (mode === 'register' ? 'on' : '') + '">สมัครสมาชิก</button></div>' +
      (mode === 'login'
        ? '<form id="loginf" class="card">' +
          '<label class="field"><span>ชื่อผู้ใช้<b class="req" aria-hidden="true">*</b></span><input type="text" name="username" autocomplete="username" autocapitalize="none" required></label>' +
          '<label class="field"><span>รหัสผ่าน<b class="req" aria-hidden="true">*</b></span><input type="password" name="password" autocomplete="current-password" required></label>' +
          '<div id="err" class="error"></div><button class="btn" id="submit">เข้าสู่ระบบ</button>' +
          '<button type="button" class="linkbtn pwlink" data-auth="forgot">ลืมรหัสผ่าน</button></form>' +
          '<p class="footer-note" id="demo"></p>'
        : mode === 'forgot'
        ? '<div class="card">' +
          '<div class="cardhead"><b>ลืมรหัสผ่าน</b><span>แอดมินจะรีเซ็ตรหัสผ่านให้หลังยืนยันตัวตน</span></div>' +
          '<ol class="howto"><li>ติดต่อแอดมินตามช่องทางด้านล่าง</li>' +
          '<li>แอดมินยืนยันตัวตนแล้วให้รหัสผ่านชั่วคราว</li>' +
          '<li>เข้าสู่ระบบด้วยรหัสชั่วคราว แล้วตั้งรหัสผ่านใหม่ทันที</li></ol>' +
          '<div class="infobox">' + icon('info') + '<div><b>ช่องทางติดต่อแอดมิน</b><span id="contact">…</span></div></div>' +
          '<button type="button" class="linkbtn pwlink" data-auth="login">กลับไปหน้าเข้าสู่ระบบ</button></div>'
        : '<form id="regf" class="card">' +
          '<div class="infobox">' + icon('info') + '<div><b>บัญชีผู้ใช้สำหรับฝากส่งและรับของ</b>' +
          '<span>ไรเดอร์ของ ' + esc(CONFIG.APP_NAME) + ' เป็นคนรับของและนำส่งให้</span></div></div>' +
          '<label class="field"><span>ชื่อผู้ใช้<b class="req" aria-hidden="true">*</b> <em>(ใช้เข้าสู่ระบบ)</em></span><input type="text" name="username" autocomplete="username" autocapitalize="none" required minlength="3" maxlength="20"></label>' +
          '<label class="field"><span>ชื่อโปรไฟล์<b class="req" aria-hidden="true">*</b></span><input type="text" name="name" required minlength="2" maxlength="30" placeholder="เช่น มิ้นท์ หรือ Mint"></label>' +
          '<label class="field"><span>เบอร์โทรศัพท์<b class="req" aria-hidden="true">*</b></span><input type="tel" name="phone" inputmode="numeric" required maxlength="10" data-phone placeholder="08xxxxxxxx"></label>' +
          '<label class="field"><span>รหัสผ่าน<b class="req" aria-hidden="true">*</b></span><input type="password" name="password" autocomplete="new-password" required minlength="6"></label>' +
          '<label class="field"><span>ยืนยันรหัสผ่าน<b class="req" aria-hidden="true">*</b></span><input type="password" name="password2" autocomplete="new-password" required minlength="6"></label>' +
          '<div id="err" class="error"></div><button class="btn" id="submit">สมัครสมาชิก</button></form>') +
      (local ? '<button class="linkbtn" data-act="reset">ล้างข้อมูลทดสอบทั้งหมด (โหมดไฟล์ HTML)</button>' : '') +
      '</div>';

    guardEnglish(app.querySelectorAll('input[name=username], input[name=password], input[name=password2], #regf input[name=name]'));
    if (mode === 'login') {
      call('demo').then(function (d) {
        var el = $('demo');
        if (el && d.accounts.length) el.innerHTML = '<span class="demohead">บัญชีทดลอง · รหัสผ่าน <code>' + esc(d.password) + '</code></span><span class="demolist">' + d.accounts.map(function (a) {
            return '<span class="demoacc"><code>' + esc(a.username) + '</code><small>' + (a.role === 'user' ? a.points + ' Point' : 'แอดมิน') + '</small></span>';
          }).join('') + '</span>';
      });
      if (state.authNotice) {
        var n = state.authNotice; state.authNotice = null;
        $('loginf').insertAdjacentHTML('afterbegin', '<div class="formnote' + (n.kind === 'bad' ? ' bad' : '') + '">' + icon(n.kind === 'bad' ? 'info' : 'check') + '<span>' + esc(n.text) + '</span></div>');
        $('loginf').username.focus();
      }
      var lf = $('loginf');
      lf.addEventListener('submit', function (e) {
        e.preventDefault();
        if (lf.dataset.locked) return;
        submitAuth('login', { username: this.username.value, password: this.password.value });
      });
      // ชื่อผู้ใช้ที่ถูกล็อกอยู่: ล็อกปุ่มเข้าสู่ระบบพร้อมนับถอยหลัง
      lf.username.addEventListener('blur', function () { checkLock(lf); });
      lf.username.addEventListener('input', function () { if (lf.dataset.locked && lf.username.value.trim().toLowerCase() !== lf.dataset.locked) unlockForm(lf); });
    } else if (mode === 'forgot') {
      call('contact').then(function (d) { if ($('contact')) $('contact').textContent = d.text; });
    } else {
      // ตรวจชื่อผู้ใช้ซ้ำระหว่างพิมพ์ (รอให้หยุดพิมพ์ครู่หนึ่งก่อนค่อยเช็ก)
      var uname = $('regf').username, checkTimer = null, lastChecked = '';
      uname.addEventListener('input', function () {
        clearTimeout(checkTimer);
        uname.dataset.taken = '';
        var v = uname.value.trim().toLowerCase();
        if (v.length < 3) return;
        checkTimer = setTimeout(function () {
          lastChecked = v;
          call('check_username', { username: v }).then(function (r) {
            if (uname.value.trim().toLowerCase() !== lastChecked) return;
            uname.dataset.taken = r.available ? '0' : '1';
            uname.dispatchEvent(new Event('rules:update'));
            fieldError(uname, r.available ? '' : r.reason === 'reserved' ? 'ชื่อผู้ใช้นี้สงวนไว้สำหรับระบบ' : 'มีชื่อผู้ใช้นี้อยู่แล้วในระบบ');
          });
        }, 400);
      });
      attachRules(uname, 'username');
      liveNameCheck($('regf').name);
      livePhoneCheck($('regf').phone);
      attachRules($('regf').password, 'password');
      var p2 = $('regf').password2;
      bindConfirm($('regf').password, p2);
      $('regf').addEventListener('submit', function (e) {
        e.preventDefault();
        if (this.password.value !== this.password2.value) { fieldError(p2, 'รหัสผ่านไม่ตรงกัน'); return p2.focus(); }
        submitAuth('register', {
          username: this.username.value,
          name: this.name.value, phone: this.phone.value, password: this.password.value,
        });
      });
    }
  }
  // ตรวจช่องยืนยันรหัสผ่านระหว่างพิมพ์
  function bindConfirm(p1, p2) {
    function checkMatch(final) {
      var a = p1.value, b2 = p2.value;
      if (!b2) return fieldError(p2, '');
      var wrong = b2 !== a.slice(0, b2.length) || ((final || b2.length >= a.length) && b2 !== a);
      fieldError(p2, wrong ? 'รหัสผ่านไม่ตรงกัน' : '');
    }
    // หน่วงไว้ 1 จังหวะ ให้ทำงานหลังตัวล้างข้อความกลางของฟอร์ม
    p2.addEventListener('input', function () { setTimeout(function () { checkMatch(false); }, 0); });
    p1.addEventListener('input', function () { if (p2.value) setTimeout(function () { checkMatch(false); }, 0); });
    p2.addEventListener('blur', function () { checkMatch(true); });
  }
  // ช่องที่รับได้เฉพาะภาษาอังกฤษ: กันตัวอักษรอื่นทันที และบอกผู้ใช้ว่าเกิดอะไรขึ้น
  function guardEnglish(inputs) {
    Array.prototype.forEach.call(inputs, function (inp) {
      var warn = document.createElement('small');
      warn.className = 'fieldwarn';
      var isUser = inp.name === 'username', isName = inp.name === 'name';
      warn.textContent = isUser ? 'ใช้ได้เฉพาะภาษาอังกฤษ ตัวเลข และ _ เท่านั้น'
        : isName ? 'ใช้ได้เฉพาะภาษาไทย ภาษาอังกฤษ ตัวเลข และอักขระพิเศษ' : 'ใช้ได้เฉพาะภาษาอังกฤษ ตัวเลข และสัญลักษณ์เท่านั้น';
      inp.insertAdjacentElement('afterend', warn);
      var timer = null;
      inp.addEventListener('input', function () {
        var clean = inp.value.replace(isUser ? /[^A-Za-z0-9_]/g : isName ? /[^\x20-\x7E\u0E00-\u0E7F]/g : /[^\x21-\x7E]/g, '');
        if (isUser && clean !== clean.toLowerCase() && clean.length === inp.value.length) {
          // ตัวพิมพ์ใหญ่: แปลงเป็นตัวเล็กให้เห็นทันที (ไม่ต้องเตือน)
          var pos = inp.selectionStart; inp.value = clean.toLowerCase(); inp.setSelectionRange(pos, pos); return;
        }
        if (isUser) clean = clean.toLowerCase();
        if (clean !== inp.value) {
          inp.value = clean;
          warn.classList.add('show');
          clearTimeout(timer);
          timer = setTimeout(function () { warn.classList.remove('show'); }, 4000);
        }
      });
    });
  }
  // กล่องเงื่อนไขการตั้งค่า: ขึ้นเมื่อคลิกช่อง และติ๊กถูกข้อที่ผ่านแล้วระหว่างพิมพ์
  var RULES = {
    username: [
      ['ภาษาอังกฤษตัวเล็ก ตัวเลข หรือ _ เท่านั้น', function (v) { return /^[a-z0-9_]+$/i.test(v); }],
      ['ความยาว 3–20 ตัว', function (v) { return v.length >= 3 && v.length <= 20; }],
      ['ยังไม่มีคนใช้ชื่อนี้ และไม่ใช่ชื่อที่สงวนไว้', function (v, el) { return el.dataset.taken === '0' && v.length >= 3; }],
    ],
    password: [
      ['อย่างน้อย 6 ตัว', function (v) { return v.length >= 6; }],
      ['ภาษาอังกฤษ ตัวเลข หรือสัญลักษณ์ เช่น ! @ # _', function (v) { return v.length > 0 && /^[\x21-\x7E]+$/.test(v); }],
      ['ไม่มีเว้นวรรค', function (v) { return v.length > 0 && !/\s/.test(v); }],
    ],
  };
  function attachRules(input, key) {
    var field = input.closest('.field');
    var pop = document.createElement('div');
    pop.className = 'rules';
    pop.setAttribute('role', 'tooltip');
    field.appendChild(pop);
    function draw() {
      var v = input.value;
      pop.innerHTML = '<b>เงื่อนไข' + (key === 'username' ? 'การตั้งชื่อผู้ใช้' : 'การตั้งรหัสผ่าน') + '</b><ul>' + RULES[key].map(function (r) {
        var ok = r[1](v, input);
        return '<li class="' + (ok ? 'ok' : '') + '">' + icon(ok ? 'check' : 'dot') + '<span>' + r[0] + '</span></li>';
      }).join('') + '</ul>';
    }
    input.addEventListener('focus', function () { draw(); pop.classList.add('show'); });
    input.addEventListener('blur', function () { pop.classList.remove('show'); });
    input.addEventListener('input', function () { setTimeout(draw, 0); });
    input.addEventListener('rules:update', draw);
    draw();
  }
  // เช็กชื่อซ้ำระหว่างพิมพ์ (รอให้หยุดพิมพ์ครู่หนึ่ง) ใช้กับชื่อโปรไฟล์
  function livePhoneCheck(input) {
    input.addEventListener('input', function () {
      var v = input.value;
      if (!/^0[689]\d{8}$/.test(v)) return;
      call('check_phone', { phone: v }).then(function (r) {
        // หน่วง 1 จังหวะ ให้ทำงานหลังตัวล้างข้อความกลางของฟอร์ม
        setTimeout(function () {
          if (input.value !== v) return;
          fieldError(input, r.available ? '' : 'มีเบอร์โทรศัพท์นี้อยู่แล้วในระบบ');
        }, 0);
      });
    });
  }
  function liveNameCheck(input) {
    var timer = null;
    input.addEventListener('input', function () {
      clearTimeout(timer);
      var v = input.value.trim();
      if (!v) return;
      timer = setTimeout(function () {
        call('check_name', { name: v }).then(function (r) {
          if (input.value.trim() !== v) return;
          fieldError(input, r.available ? '' : 'มีชื่อโปรไฟล์นี้อยู่แล้วในระบบ');
        });
      }, 400);
    });
  }
  var lockTimer = null;
  function checkLock(form) {
    var u = form.username.value.trim().toLowerCase();
    if (!u) return;
    call('lock_status', { username: u }).then(function (r) {
      if (r.seconds > 0 && form.isConnected && form.username.value.trim().toLowerCase() === u) lockForm(form, u, r.seconds);
    });
  }
  function lockForm(form, username, seconds) {
    var btn = form.querySelector('#submit'), end = Date.now() + seconds * 1000;
    form.dataset.locked = username;
    clearInterval(lockTimer);
    function tick() {
      var left = Math.ceil((end - Date.now()) / 1000);
      if (!form.isConnected) return clearInterval(lockTimer);
      if (left <= 0) { unlockForm(form); return; }
      btn.disabled = true;
      btn.textContent = 'ลองใหม่ได้ในอีก ' + Math.floor(left / 60) + ':' + ('0' + (left % 60)).slice(-2);
      showError('err', 'ใส่รหัสผ่านผิดครบ ' + CONFIG.MAX_PASSWORD_FAILS + ' ครั้ง บัญชีนี้ถูกล็อกชั่วคราว');
    }
    tick(); lockTimer = setInterval(tick, 1000);
  }
  function unlockForm(form) {
    clearInterval(lockTimer);
    delete form.dataset.locked;
    var btn = form.querySelector('#submit');
    btn.disabled = false; btn.textContent = 'เข้าสู่ระบบ'; showError('err', '');
  }
  function submitAuth(action, body) {
    var btn = $('submit'), label = btn.textContent;
    btn.disabled = true; btn.textContent = 'กำลังดำเนินการ…'; showError('err', '');
    call(action, body).then(function (r) {
      if (r.registered) {
        state.authNotice = { username: r.username, text: 'สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ' };
        state.view = 'auth'; return render('login');
      }
      setToken(r.token); me = r.me; go(home());
    }).catch(function (e) {
      btn.disabled = false; btn.textContent = label;
      var u = document.querySelector('#regf [name=username]');
      if (u && /ชื่อผู้ใช้นี้อยู่แล้ว/.test(e.message)) { fieldError(u, e.message); u.focus(); return; }
      var nm = document.querySelector('#regf [name=name]');
      if (nm && /ชื่อโปรไฟล์นี้อยู่แล้ว/.test(e.message)) { fieldError(nm, e.message); nm.focus(); return; }
      var ph = document.querySelector('#regf [name=phone]');
      if (ph && /เบอร์โทรศัพท์นี้อยู่แล้ว/.test(e.message)) { fieldError(ph, e.message); ph.focus(); return; }
      if (u && /สงวนไว้/.test(e.message)) { fieldError(u, e.message); u.focus(); return; }
      if (action === 'login' && /ถูกล็อก/.test(e.message)) { showError('err', e.message); return checkLock($('loginf')); }
      showError('err', e.message);
    });
  }
  function home() {
    if (!me) return 'auth';
    if (me.must_change) return 'force-pw';
    return me.role === 'admin' ? 'a-orders' : 'u-home';
  }

  // ---------- ฟอร์มเปลี่ยนรหัสผ่าน (ใช้ทั้งหน้าโปรไฟล์และหลังแอดมินรีเซ็ต) ----------
  function pwFormHtml(id, oldLabel, btnLabel) {
    return '<form id="' + id + '">' +
      '<label class="field"><span>' + oldLabel + '<b class="req" aria-hidden="true">*</b></span><input type="password" name="old_password" autocomplete="current-password" required></label>' +
      '<label class="field"><span>รหัสผ่านใหม่<b class="req" aria-hidden="true">*</b></span><input type="password" name="password" autocomplete="new-password" required minlength="6"></label>' +
      '<label class="field"><span>ยืนยันรหัสผ่านใหม่<b class="req" aria-hidden="true">*</b></span><input type="password" name="password2" autocomplete="new-password" required minlength="6"></label>' +
      '<div id="' + id + '-err" class="error"></div><button class="btn">' + btnLabel + '</button></form>';
  }
  function bindPwForm(form, onDone) {
    guardEnglish(form.querySelectorAll('input'));
    attachRules(form.password, 'password');
    bindConfirm(form.password, form.password2);
    var errId = form.id + '-err';
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = form.querySelector('.btn');
      if (form.password.value && form.password.value === form.old_password.value) {
        fieldError(form.password, 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม'); return form.password.focus();
      }
      if (form.password.value !== form.password2.value) { fieldError(form.password2, 'รหัสผ่านไม่ตรงกัน'); return form.password2.focus(); }
      btn.disabled = true; showError(errId, '');
      call('change_password', { old_password: form.old_password.value, password: form.password.value })
        .then(function (r) { btn.disabled = false; me = r.me; if (document.activeElement) document.activeElement.blur(); onDone(r); })
        .catch(function (err) {
          btn.disabled = false;
          if (handleAuthError(err)) return;
          if (/ซ้ำกับรหัสผ่านเดิม|รหัสผ่านใหม่ใช้ได้/.test(err.message)) { fieldError(form.password, err.message); return form.password.focus(); }
          showError(errId, err.message);
        });
    });
  }
  // เข้าสู่ระบบด้วยรหัสชั่วคราวจากแอดมิน: ต้องตั้งรหัสใหม่ก่อน (ไม่มีเมนูอื่น)
  function viewForcePw() {
    app.innerHTML = '<header class="topbar"><span class="brand">' + esc(CONFIG.APP_NAME) + '</span><span class="rolechip">' + esc(me.name) + '</span></header>' +
      '<h1>ตั้งรหัสผ่านใหม่</h1>' +
      '<div class="card"><div class="infobox">' + icon('info') + '<div><b>คุณเข้าสู่ระบบด้วยรหัสผ่านชั่วคราว</b><span>กรุณาตั้งรหัสผ่านใหม่ก่อนเริ่มใช้งาน</span></div></div>' +
      pwFormHtml('fpf', 'รหัสผ่านชั่วคราว', 'บันทึกรหัสผ่านใหม่') + '</div>' +
      '<button class="linkbtn" data-act="logout">ออกจากระบบ</button>';
    bindPwForm($('fpf'), function () { go(home()); });
    $('fpf').old_password.focus();
  }





  // ---------- ผู้ใช้: ฝากส่งของ ----------
  // ช่องแนบรูปแบบใช้ซ้ำ (หลักฐานของคนส่ง): list คืออาร์เรย์ที่เก็บรูปไว้ ไม่หายแม้หน้าวาดใหม่
  function bindPicker(grid, input, list, max, addLabel) {
    function draw() {
      grid.innerHTML = list.map(function (p, i) {
        return '<div class="ph"><img src="' + p + '" alt="รูป ' + (i + 1) + '"><button type="button" data-rm="' + i + '" aria-label="ลบรูป">' + icon('x') + '</button></div>';
      }).join('') + (list.length < max ? '<button type="button" class="ph add">' + icon('camera') + '<span>' + (list.length ? 'เพิ่มรูป' : addLabel) + '</span></button>' : '');
    }
    draw();
    grid.addEventListener('click', function (e) {
      var rm = e.target.closest('[data-rm]');
      if (rm) { list.splice(Number(rm.getAttribute('data-rm')), 1); draw(); return; }
      if (e.target.closest('.add')) input.click();
    });
    input.addEventListener('change', function () {
      var files = Array.prototype.slice.call(this.files || []), room = max - list.length;
      this.value = '';
      if (!files.length) return;
      var skipped = files.length > room;
      Promise.all(files.slice(0, room).map(function (file) { return shrinkImage(file).catch(function () { return null; }); })).then(function (out) {
        var bad = out.filter(function (x) { return !x; }).length;
        out.forEach(function (x) { if (x) list.push(x); });
        draw();
        fieldError(grid, bad ? 'มีไฟล์ที่เปิดไม่ได้ ' + bad + ' ไฟล์ กรุณาใช้รูป JPG หรือ PNG' : skipped ? 'แนบได้มากสุด ' + max + ' รูป' : '');
      });
    });
  }
  function proofField(id, label, hint) {
    return '<div class="field"><span class="lbl">' + label + '<b class="req" aria-hidden="true">*</b></span>' +
      '<p class="hint">' + hint + '</p>' +
      '<div class="photogrid" id="' + id + 'grid" data-need="' + CONFIG.PROOF_MIN + '" data-need-msg="กรุณาถ่ายรูปอย่างน้อย ' + CONFIG.PROOF_MIN + ' รูป"></div>' +
      '<input type="file" id="' + id + 'in" accept="image/*" capture="environment" multiple hidden></div>';
  }

  // ย่อรูปให้ด้านยาวไม่เกิน 1024px เป็น JPEG (ไฟล์ละประมาณ 60–150 KB) เพื่อให้เก็บได้หลายงาน
  function shrinkImage(file) {
    return new Promise(function (resolve, reject) {
      if (!/^image\//.test(file.type)) return reject(new Error('not image'));
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var max = 1024, w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, max / Math.max(w, h));
        var c = document.createElement('canvas');
        c.width = Math.round(w * k); c.height = Math.round(h * k);
        var ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        var q = 0.7, out = c.toDataURL('image/jpeg', q);
        while (out.length > 200000 && q > 0.35) { q -= 0.1; out = c.toDataURL('image/jpeg', q); }
        resolve(out);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('bad image')); };
      img.src = url;
    });
  }

  // "อื่นๆ" แสดงเป็นชื่อสถานที่ที่ผู้ใช้พิมพ์เอง
  function zoneName(z, d) { return z === CONFIG.ZONE_OTHER ? (d || 'อื่นๆ') : z; }
  function zoneFull(z, d) { return z === CONFIG.ZONE_OTHER ? (d || 'อื่นๆ') : z + (d ? ' · ' + d : ''); }
  function zoneOptions(ph) {
    return '<option value="">' + ph + '</option>' + CONFIG.ZONE_GROUPS.map(function (g) {
      return '<optgroup label="' + esc(g.label) + '">' + g.items.map(function (x) { return '<option>' + esc(x) + '</option>'; }).join('') + '</optgroup>';
    }).join('');
  }

  function viewNew() {
    call('recipients').then(function (d) {
      function opts(arr, ph) { return '<option value="">' + ph + '</option>' + arr.map(function (x) { return '<option>' + esc(x) + '</option>'; }).join(''); }
      var recips = d.users.map(function (u) { return '<option value="' + esc(u.id) + '">' + esc(u.name) + ' (@' + esc(u.username) + ')</option>'; }).join('');
      var modes = Object.keys(CONFIG.MODES).map(function (k) {
        var m = CONFIG.MODES[k];
        var noUrg = k === 'urgent' && !d.service.urgent_ok;
        return '<label class="' + (k === 'normal' ? 'on' : '') + (noUrg ? ' dis' : '') + '"><input type="radio" name="mode" value="' + k + '"' + (k === 'normal' ? ' checked' : '') + (noUrg ? ' disabled' : '') +
          '><b>' + esc(m.label) + '</b><small>' + (noUrg ? 'ปิดรับแล้ววันนี้ (สั่งได้ถึง ' + esc(d.service.urgent_until) + ' น.)' : esc(m.hint)) + '</small></label>';
      }).join('');
      var svc = CONFIG.SERVICES.filter(function (x) { return x.key === state.service; })[0];
      app.innerHTML = shell(svc ? svc.label : 'สั่งบริการ',
        '<p class="sub">ถ่ายรูปของ กรอกรายละเอียด เลือกจุดส่ง แล้วตรวจยอดก่อนยืนยันคำสั่ง</p>' + svcBanner(d.service) +
        '<div class="infobox">' + icon('info') + '<div><b>' + esc(CONFIG.DROP_POINT) + ' · ' + esc(CONFIG.DROP_POINT_PLACE) + '</b><span>' + esc(CONFIG.DROP_POINT_NOTE) + '</span></div></div>' +
        '<form id="f">' +
        '<label class="field"><span>ประเภทของ<b class="req" aria-hidden="true">*</b></span><select name="item_type" required>' + opts(CONFIG.ITEM_TYPES, 'เลือกประเภท') + '</select></label>' +
        '<label class="field"><span>รายละเอียดของ<b class="req" aria-hidden="true">*</b></span><input type="text" name="item_detail" required maxlength="300" placeholder="เช่น ซองเอกสารสีน้ำตาล 1 ซอง"></label>' +
        '<div class="field"><span class="lbl">รูปของ<b class="req" aria-hidden="true">*</b> <em id="pcount">(0/' + CONFIG.PHOTO_MAX + ')</em></span>' +
        '<p class="hint">แนบอย่างน้อย ' + CONFIG.PHOTO_MIN + ' รูป มากสุด ' + CONFIG.PHOTO_MAX + ' รูป ให้เห็นตัวของชัดเจน เพื่อให้ไรเดอร์รับของถูกชิ้นและผู้รับตรวจของได้</p>' +
        '<div class="photogrid" id="photos" data-need="' + CONFIG.PHOTO_MIN + '"></div>' +
        '<input type="file" id="photoin" accept="image/*" multiple hidden></div>' +
        '<label class="field"><span>จุดส่งของ<b class="req" aria-hidden="true">*</b></span><select name="dropoff_zone" required>' + zoneOptions('เลือกจุดส่ง') + '</select></label><div id="distbox"></div>' +
        '<label class="field"><span><span data-lbl>รายละเอียดจุดส่ง</span> <em>(ไม่บังคับ)</em></span><input type="text" name="dropoff_detail" maxlength="200" placeholder="เช่น ล็อบบี้ชั้น 1"></label>' +
        '<label class="field"><span>ผู้รับปลายทาง<b class="req" aria-hidden="true">*</b></span><select name="recipient_id" required><option value="">เลือกผู้รับ</option>' + recips + '</select></label>' +
        '<div class="field"><span class="lbl">แบบการส่ง<b class="req" aria-hidden="true">*</b></span><div class="choice" id="modes">' + modes + '</div></div>' +
        '<label class="field" id="dlwrap" hidden><span>ต้องถึงก่อนกี่โมง <em>(ไม่บังคับ)</em></span>' +
        '<input type="time" name="deadline"><small class="hint" id="dlhint"></small></label>' +
        '<label class="field"><span>หมายเหตุถึงแอดมิน <em>(ไม่บังคับ)</em></span><textarea name="note" maxlength="500" placeholder="เช่น ของแตกง่าย ถือแนวตั้ง"></textarea></label>' +
        '<h2>วิธีชำระค่าบริการ</h2><div class="paypick" id="paypick">' + Object.keys(CONFIG.PAY_METHODS).map(function (k) {
          var m = CONFIG.PAY_METHODS[k];
          return '<label class="' + (k === 'sender' ? 'on' : '') + '"><input type="radio" name="pay_method" value="' + k + '"' + (k === 'sender' ? ' checked' : '') + '><i></i><span><b>' + m.label + '</b><small>' + m.hint + '</small></span></label>';
        }).join('') + '</div><div class="error" id="payerr"></div>' +
        '<h2>สรุปค่าบริการ</h2><div class="card" id="quote"></div>' +
        '<div id="err" class="error"></div><button class="btn" id="submit"' + (d.service.open ? '' : ' disabled') + '>' + (d.service.open ? 'ยืนยันคำสั่ง' : 'นอกเวลาให้บริการ') + '</button></form>', { back: true, nav: 'u-home' });
      if (svc) {
        $('f').mode.value = svc.mode;
        Array.prototype.forEach.call($('modes').querySelectorAll('label'), function (l) { l.classList.toggle('on', l.querySelector('input').value === svc.mode); });
        if (svc.item) $('f').item_type.value = svc.item;
      }
      // ---------- สรุปค่าบริการ + ใช้ Point ----------
      var balance = 0, usePts = false, lastTotal = null;
      function quote() {
        var f = $('f'), z = f.dropoff_zone.value, P = CONFIG.PRICE, U = CONFIG.POINT_USE;
        var ti = 1; if (CONFIG.PLACES[z]) { for (var i = 0; i < CONFIG.TIERS.length; i++) if (CONFIG.PLACES[z].m <= CONFIG.TIERS[i].max) { ti = i; break; } }
        var base = P.BASE[f.mode.value] || P.BASE.normal, dist = z ? P.DIST[ti] : 0, extra = P.ITEM_EXTRA[f.item_type.value] || 0, sub = base + dist + extra;
        var maxD = Math.max(0, Math.min(Math.floor(balance / U.PER_BAHT), Math.floor(sub * U.MAX_RATIO)));
        var cod = f.pay_method.value === 'cod';
        var disc = usePts && !cod ? maxD : 0;
        lastTotal = sub - disc;
        var rec = recipMap[f.recipient_id.value];
        $('payerr').textContent = ''; // สถานะการถูกระงับรับปลายทางแจ้งตอนกดสั่ง (ไม่เปิดเผยข้อมูลของคนอื่นล่วงหน้า)
        $('payerr').style.display = $('payerr').textContent ? 'block' : 'none';
        Array.prototype.forEach.call($('paypick').querySelectorAll('label'), function (l) { l.classList.toggle('on', l.querySelector('input').checked); });
        $('quote').innerHTML = '<div class="sum3"><div><span>ค่าบริการส่ง' + esc(CONFIG.MODES[f.mode.value].label) + '</span>' + baht(base) + '</div>' +
          '<div><span>ตามระยะ' + (z ? ' (' + CONFIG.TIERS[ti].label + ')' : ' (เลือกจุดส่งก่อน)') + '</span>' + baht(dist) + '</div>' +
          (extra ? '<div><span>ประเภทของ (' + esc(f.item_type.value) + ')</span>' + baht(extra) + '</div>' : '') +
          (cod ? '<div class="ptuse off"><span>Point ใช้ได้เฉพาะคนที่จ่าย<small>ผู้รับเลือกใช้ Point ของตัวเองได้ตอนกดยอมรับชำระ</small></span></div>'
            : '<label class="ptuse' + (maxD ? '' : ' off') + '"><span>' + (maxD ? 'ใช้ ' + maxD * U.PER_BAHT + ' Point ลด ' + baht(maxD) : 'Point ของคุณ ' + balance + (balance ? ' ยังไม่พอใช้ลด' : '')) +
              '<small>' + (U.PER_BAHT * 5) + ' Point = ฿5 · ลดได้ไม่เกินครึ่งหนึ่งของค่าบริการ</small></span><input type="checkbox" id="usepts"' + (usePts && maxD ? ' checked' : '') + (maxD ? '' : ' disabled') + '><i class="tog"></i></label>') +
          (disc ? '<div><span>ส่วนลดจาก Point</span>−' + baht(disc) + '</div>' : '') +
          '<div class="tot"><span>' + (cod ? 'ค่าบริการ (ผู้รับชำระ)' : 'ยอดชำระ') + '</span><b>' + baht(lastTotal) + '</b></div><p class="paynote">' +
          (cod ? 'ผู้รับจ่ายเงินสดตอนรับของ · ยอดจริงอาจน้อยกว่านี้ถ้าผู้รับใช้ Point · Point จากคำสั่งนี้เข้าบัญชีผู้รับ' : 'ชำระเงินสดตอนไรเดอร์รับของที่จุดรับฝาก') + '</p></div>';
        $('submit').textContent = cod ? 'ยืนยันคำสั่ง · เก็บเงินปลายทาง' : 'ยืนยันคำสั่ง · ' + baht(lastTotal);
      }
      $('quote').addEventListener('change', function (e) { if (e.target.id === 'usepts') { usePts = e.target.checked; quote(); } });
      var recipMap = {}; d.users.forEach(function (x) { recipMap[x.id] = x; });
      ['mode', 'dropoff_zone', 'item_type', 'pay_method', 'recipient_id'].forEach(function (n) { var el = $('f')[n]; (el.length && !el.tagName ? Array.prototype.slice.call(el) : [el]).forEach(function (x) { x.addEventListener('change', quote); }); });
      quote();
      call('quote', { mode: 'normal', dropoff_zone: '', item_type: '' }).then(function (q) { balance = q.balance; quote(); }).catch(function () {});

      // ---------- แนบรูปของ ----------
      var photos = [];
      function drawPhotos() {
        var g = $('photos');
        g.innerHTML = photos.map(function (p, i) {
          return '<div class="ph"><img src="' + p + '" alt="รูปของ ' + (i + 1) + '"><button type="button" data-rm="' + i + '" aria-label="ลบรูป">' + icon('x') + '</button></div>';
        }).join('') + (photos.length < CONFIG.PHOTO_MAX
          ? '<button type="button" class="ph add" id="addph">' + icon('camera') + '<span>' + (photos.length ? 'เพิ่มรูป' : 'ถ่าย / เลือกรูป') + '</span></button>' : '');
        $('pcount').textContent = '(' + photos.length + '/' + CONFIG.PHOTO_MAX + ')';
      }
      drawPhotos();
      $('photos').addEventListener('click', function (e) {
        var rm = e.target.closest('[data-rm]');
        if (rm) { photos.splice(Number(rm.getAttribute('data-rm')), 1); drawPhotos(); return; }
        if (e.target.closest('#addph')) $('photoin').click();
      });
      $('photoin').addEventListener('change', function () {
        var files = Array.prototype.slice.call(this.files || []), room = CONFIG.PHOTO_MAX - photos.length, g = $('photos');
        this.value = '';
        if (!files.length) return;
        var skipped = files.length > room;
        files = files.slice(0, room);
        Promise.all(files.map(function (file) { return shrinkImage(file).catch(function () { return null; }); })).then(function (out) {
          var bad = out.filter(function (x) { return !x; }).length;
          out.forEach(function (x) { if (x) photos.push(x); });
          drawPhotos();
          fieldError(g, bad ? 'มีไฟล์ที่เปิดไม่ได้ ' + bad + ' ไฟล์ กรุณาใช้รูป JPG หรือ PNG'
            : skipped ? 'แนบได้มากสุด ' + CONFIG.PHOTO_MAX + ' รูป รูปที่เกินไม่ได้ถูกเพิ่ม' : '');
        });
      });

      // ต้องถึงก่อนกี่โมง: มีเฉพาะงานด่วน เลือกได้ตั้งแต่ตอนนี้ถึงไม่เกินกำหนดของงานด่วน (งานปกติเรียงตามคิว เลือกเวลาไม่ได้)
      var dl = $('f').deadline, URGENT_MS = CONFIG.MODES.urgent.hours * 3600000;
      function hhmm(d) { return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
      function deadlineDate() { // เวลาที่เลือก → วันเวลาจริง (ถ้าข้ามเที่ยงคืนนับเป็นวันพรุ่งนี้)
        if (!dl.value) return null;
        var p = dl.value.split(':'), d = new Date(); d.setHours(Number(p[0]), Number(p[1]), 0, 0);
        if (d.getTime() < Date.now() - 60000) d.setDate(d.getDate() + 1);
        return d;
      }
      var LEAD_MS = CONFIG.URGENT_LEAD_MINUTES * 60000;
      function refreshRange() {
        // เผื่อเวลาให้คนส่งกดรับงานและเดินทาง: เลือกได้ตั้งแต่ตอนนี้ + 30 นาที ถึงตอนนี้ + 2 ชม.
        var from = new Date(Date.now() + LEAD_MS), to = new Date(Date.now() + URGENT_MS);
        if (!d.service.override && new Date(d.service.close_at) < to) to = new Date(d.service.close_at); // งานด่วนต้องถึงก่อนปิด
        dl.min = hhmm(from); dl.max = hhmm(to);
        $('dlhint').textContent = 'เลือกได้ระหว่าง ' + hhmm(from) + '–' + hhmm(to) + ' น. (เผื่อเวลาให้ไรเดอร์ ' + CONFIG.URGENT_LEAD_MINUTES +
          ' นาที) ถ้าไม่เลือก จะส่งถึงภายใน ' + hhmm(to) + ' น. (ไม่เกิน ' + CONFIG.MODES.urgent.hours + ' ชม. นับจากเวลาที่แจ้ง)';
      }
      function checkDeadline() {
        refreshRange();
        var d = deadlineDate(), msg = '';
        if (d && (d.getTime() < Date.now() + LEAD_MS - 60000 || d.getTime() > Date.now() + URGENT_MS + 60000)) msg = 'เลือกได้ระหว่าง ' + dl.min + '–' + dl.max + ' น.';
        fieldError(dl, msg);
        return !msg;
      }
      function showDeadline() {
        var urgent = $('f').mode.value === 'urgent';
        $('dlwrap').hidden = !urgent;
        if (!urgent) { dl.value = ''; fieldError(dl, ''); } else refreshRange();
      }
      showDeadline();
      $('modes').addEventListener('change', showDeadline);
      dl.addEventListener('focus', refreshRange);
      every(30000, function () { if (!$('dlwrap').hidden && document.activeElement !== dl) refreshRange(); }); // ให้เวลาในคำแนะนำเดินตามนาฬิกา
      dl.addEventListener('change', checkDeadline);

      // เลือก "อื่นๆ" → ช่องรายละเอียดกลายเป็นช่องบังคับให้พิมพ์ชื่อสถานที่
      [['dropoff_zone', 'dropoff_detail', 'รายละเอียดจุดส่ง', 'สถานที่ส่งของ', 'เช่น ล็อบบี้ชั้น 1']].forEach(function (z) {
        var sel = $('f')[z[0]], inp = $('f')[z[1]], head = inp.closest('.field').querySelector(':scope > span');
        sel.addEventListener('change', function () {
          var other = sel.value === CONFIG.ZONE_OTHER;
          $('distbox').innerHTML = routeBox(sel.value);
          inp.required = other;
          inp.placeholder = other ? 'เช่น อาคาร 6 ชั้น 3' : z[4];
          head.innerHTML = other ? '<span data-lbl>' + z[3] + '</span><b class="req" aria-hidden="true">*</b>' : '<span data-lbl>' + z[2] + '</span> <em>(ไม่บังคับ)</em>';
          if (!other) fieldError(inp, '');
          if (other) inp.focus();
        });
      });

      $('modes').addEventListener('change', function (e) {
        Array.prototype.forEach.call(this.querySelectorAll('label'), function (l) { l.classList.toggle('on', l.contains(e.target)); });
      });
      $('f').addEventListener('submit', function (e) {
        e.preventDefault();
        var fd = new FormData(this), body = {};
        fd.forEach(function (v, k) { body[k] = v; });
        if (body.mode !== 'urgent') delete body.deadline;
        else if (!checkDeadline()) { dl.focus(); return; }
        if (body.deadline) body.deadline = deadlineDate().toISOString();
        if (photos.length < CONFIG.PHOTO_MIN) {
          fieldError($('photos'), 'กรุณาแนบรูปของอย่างน้อย ' + CONFIG.PHOTO_MIN + ' รูป');
          $('photos').scrollIntoView({ block: 'center' }); return;
        }
        body.photos = photos; body.use_points = usePts && body.pay_method !== 'cod' ? 1 : 0; body.expect_total = lastTotal; body.service = state.service || '';
        var btn = $('submit');
        btn.disabled = true; btn.textContent = 'กำลังส่งคำสั่ง…'; showError('err', '');
        call('create', body).then(function (r) { state.service = ''; state.otab = 'all'; state.stack = [{ view: 'u-home' }]; state.view = 'job'; state.id = r.job.id; render(); window.scrollTo(0, 0); })
          .catch(function (err) { showError('err', err.message); btn.disabled = false; quote(); });
      });
    }).catch(function (e) { if (!handleAuthError(e)) app.innerHTML = '<div class="error" style="display:block">' + esc(e.message) + '</div>'; });
  }






  // ---------- Popup เมื่อได้รับ Point / เครดิต ----------
  var rewardQueue = [], rewardOpen = false, rewardSeen = {}, rewardStep = 0, rewardStepN = 0;
  function checkRewards() {
    if (!me || me.role === 'admin' || me.must_change) return;
    call('rewards_unseen').then(function (d) {
      d.items.forEach(function (r) { if (!rewardSeen[r.id]) { rewardSeen[r.id] = 1; rewardQueue.push(r); } });
      showNextReward();
    }).catch(function () {});
  }
  function showNextReward() {
    if (rewardOpen || !rewardQueue.length) return;
    // เรื่องที่ต้องรับทราบขึ้นก่อนทีละอัน · ได้ Point หลายรายการรวมเป็นอันเดียว
    var imp = rewardQueue.filter(function (x) { return x.kind !== 'point'; });
    if (!imp.length && rewardQueue.length > 1) return showPointSummary(rewardQueue.splice(0));
    var r = imp.length ? imp[0] : rewardQueue[0];
    rewardQueue.splice(rewardQueue.indexOf(r), 1);
    if (r.kind !== 'point') { rewardStep++; rewardStepN = Math.max(rewardStepN, rewardStep + imp.length - 1); }
    var step = r.kind !== 'point' && rewardStepN > 1 ? '<div class="rwstep">เรื่องที่ ' + rewardStep + ' จาก ' + rewardStepN + '</div>' : '';
    rewardOpen = true;
    var el = document.createElement('div');
    el.className = 'rwpop'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    if (r.kind === 'penalty') {
      var pp = String(r.detail).split('|'), R = CONFIG.REFUSE;
      el.innerHTML = '<div class="rwcard">' + step + '<div class="rwic bad">' + icon('warn') + '</div><strong>คุณปฏิเสธรับของ ' + esc(r.job_id) + '</strong><p>เหตุผล: ' + esc(pp[0]) + '</p>' +
        '<div class="rwamt bad">' + (Number(r.amount) ? '−' + esc(r.amount) + ' <span>Point</span>' : '<span>ไม่มี Point ให้หัก</span>') + '</div>' +
        '<p class="small">ปฏิเสธครั้งที่ ' + esc(pp[1]) + ' จาก ' + R.LIMIT + ' ในรอบ ' + R.WINDOW_DAYS + ' วัน' + (pp[2] ? ' · ระงับการรับของแบบเก็บเงินปลายทางถึง ' + fmtDate(pp[2]) : ' · ครบ ' + R.LIMIT + ' ครั้งจะรับของแบบเก็บเงินปลายทางไม่ได้ ' + R.BAN_DAYS + ' วัน') + '</p>' +
        '<button class="btn" data-rw="ok">รับทราบ</button><button class="linkbtn" data-rw="job">แจ้งว่าไม่ถูกต้อง (ยื่นโต้แย้ง)</button></div>';
    } else if (r.kind === 'expire') {
      el.innerHTML = '<div class="rwcard">' + step + '<div class="rwic">' + icon('clock') + '</div><strong>คำสั่ง ' + esc(r.job_id) + ' ถูกยกเลิกอัตโนมัติ</strong><p>' + esc(r.detail) + '</p><button class="btn" data-rw="ok">รับทราบ</button><button class="linkbtn" data-rw="job">ดูคำสั่ง</button></div>';
    } else if (r.kind === 'cancel' || r.kind === 'return') {
      el.innerHTML = '<div class="rwcard">' + step + '<div class="rwic bad">' + icon(r.kind === 'cancel' ? 'x' : 'box') + '</div><strong>' + (r.kind === 'cancel' ? 'แอดมินยกเลิกคำสั่ง ' : 'มารับของคืน ') + esc(r.job_id) + '</strong><p>' + esc(r.detail) + '</p><button class="btn" data-rw="ok">รับทราบ</button><button class="linkbtn" data-rw="job">ดูคำสั่ง</button></div>';
    } else if (r.kind === 'notice') {
      el.innerHTML = '<div class="rwcard">' + step + '<div class="rwic">' + icon('info') + '</div><strong>ผลการตรวจคำโต้แย้ง ' + esc(r.job_id) + '</strong><p>' + esc(r.detail) + '</p><button class="btn" data-rw="ok">ตกลง</button></div>';
    } else {
      el.innerHTML = '<div class="rwcard"><div class="rwic pt">' + icon('gift') + '</div>' +
        '<div class="rwamt">+' + esc(r.amount) + ' <span>Point</span></div>' +
        '<strong>' + (/ชดเชย/.test(r.detail) ? 'ได้รับ Point ชดเชย' : /ยกเลิกบทลงโทษ/.test(r.detail) ? 'ได้ Point คืน' : 'ได้รับ Point จากคำสั่งที่สำเร็จ') + '</strong><p>' + esc(r.detail) + ' · ใช้ลดค่าบริการครั้งถัดไปได้</p>' +
        '<button class="btn" data-rw="ok">ตกลง</button><button class="linkbtn" data-rw="more">ดู Point ของฉัน</button></div>';
    }
    document.body.appendChild(el);
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-rw]');
      if (!b && e.target !== el) return;
      el.remove(); rewardOpen = false;
      call('rewards_seen', { ids: [r.id] }).catch(function () {});
      if (b && b.getAttribute('data-rw') === 'more') navOpen('points');
      if (b && b.getAttribute('data-rw') === 'job') navOpen('job', r.job_id);
      if (!rewardQueue.some(function (x) { return x.kind !== 'point'; })) { rewardStep = 0; rewardStepN = 0; }
      setTimeout(showNextReward, 250);
    });
  }
  function pointRowLabel(r) { return esc(r.job_id) + ' ' + (/ชดเชย/.test(r.detail) ? esc(String(r.detail).replace(/^.*?(ชดเชย)/, '$1')) : /ยกเลิกบทลงโทษ/.test(r.detail) ? 'คืน Point จากโต้แย้ง' : 'สำเร็จ'); }
  function showPointSummary(items) {
    rewardOpen = true;
    var total = items.reduce(function (n, x) { return n + Number(x.amount || 0); }, 0), SHOW = 3;
    var el = document.createElement('div');
    el.className = 'rwpop'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML = '<div class="rwcard"><div class="rwic pt">' + icon('gift') + '</div><div class="rwamt">+' + total + ' <span>Point</span></div>' +
      '<strong>ได้รับ Point ' + items.length + ' รายการ</strong><p id="rwbal">ใช้ลดค่าบริการครั้งถัดไปได้</p>' +
      '<div class="rwlist">' + items.slice(0, SHOW).map(function (x) { return '<div><span>' + pointRowLabel(x) + '<small>' + fmtTime(x.created_at) + '</small></span><b>+' + esc(x.amount) + '</b></div>'; }).join('') + '</div>' +
      (items.length > SHOW ? '<p class="rwmore">และอีก ' + (items.length - SHOW) + ' รายการ</p>' : '') +
      '<button class="btn" data-rw="ok">ตกลง</button><button class="linkbtn" data-rw="more">ดู Point ของฉัน</button></div>';
    document.body.appendChild(el);
    call('points').then(function (d) { var p = el.querySelector('#rwbal'); if (p && d && d.balance !== undefined) p.textContent = 'ใช้ลดค่าบริการครั้งถัดไปได้ · คงเหลือ ' + d.balance + ' Point'; }).catch(function () {});
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-rw]');
      if (!b && e.target !== el) return;
      el.remove(); rewardOpen = false;
      call('rewards_seen', { ids: items.map(function (x) { return x.id; }) }).catch(function () {});
      if (b && b.getAttribute('data-rw') === 'more') navOpen('points');
      setTimeout(showNextReward, 250);
    });
  }

  // ---------- รีวิวทั้งหมด (คนส่ง): สรุปดาว + กรองตามจำนวนดาว ----------












  // ---------- โปรไฟล์ ----------
  var LOG_LABEL = {
    register: 'สมัครสมาชิก', login: 'เข้าสู่ระบบ', login_failed: 'ล็อกอินไม่สำเร็จ', logout: 'ออกจากระบบ',
    job_create: 'สั่งบริการ', job_confirm: 'ยืนยันคำสั่ง', job_reject: 'ปฏิเสธคำสั่ง', job_pickup: 'รับของที่จุดรับฝาก', job_start: 'ออกนำส่ง', job_deliver: 'ส่งถึงมือผู้รับ',
    job_code_locked: 'ใส่รหัสรับของผิดครบกำหนด', cod_accept: 'ยอมรับชำระปลายทาง', cod_decline: 'ปฏิเสธชำระปลายทาง', cod_withdraw: 'ถอนการยอมรับชำระ',
    job_arrive: 'ถึงจุดส่ง', job_contact: 'บันทึกการติดต่อผู้รับ', job_fail: 'ส่งไม่สำเร็จ', job_refuse: 'ไม่รับของ', appeal: 'ยื่นโต้แย้ง', appeal_decide: 'ตรวจคำโต้แย้ง', job_cancel: 'ยกเลิกคำสั่ง', job_returned: 'รับของคืน', chat_send: 'ส่งข้อความ', profile_update: 'แก้ไขข้อมูลส่วนตัว',
    change_password: 'เปลี่ยนรหัสผ่าน', change_password_failed: 'เปลี่ยนรหัสผ่านไม่สำเร็จ', account_locked: 'บัญชีถูกล็อกชั่วคราว',
    admin_reset_password: 'รีเซ็ตรหัสผ่านให้ผู้ใช้', delete_account_failed: 'ลบบัญชีไม่สำเร็จ',
    cod_expire: 'ยกเลิกอัตโนมัติ (ผู้รับไม่ตอบรับ)', service_override: 'ตั้งค่ารับคำสั่งนอกเวลา',
    pricing_update: 'แก้ไขราคาและ Point', admin_disable_user: 'ระงับบัญชีผู้ใช้', admin_enable_user: 'ยกเลิกระงับบัญชี', return_remind: 'แจ้งผู้สั่งให้มารับของคืน',
    return_extend: 'ขยายเวลาเก็บของ', return_dispose: 'จัดการของที่ไม่มีคนรับคืน', refund_paid: 'คืนเงินผู้สั่ง',
  };
  // ประเภทของรายการ → ไอคอนและสี
  var LOG_KIND = {
    login: ['login', ''], logout: ['logout', ''], register: ['user', 'ok'],
    login_failed: ['alert', 'warn'], account_locked: ['lock', 'warn'], change_password_failed: ['alert', 'warn'],
    delete_account_failed: ['alert', 'warn'], job_code_locked: ['alert', 'warn'],
    change_password: ['lock', 'job'], admin_reset_password: ['lock', 'job'],
    job_create: ['box', 'job'], job_confirm: ['check', 'job'], job_pickup: ['box', 'job'], job_start: ['walk', 'job'], job_deliver: ['check', 'ok'],
    job_reject: ['x', 'warn'], job_cancel: ['x', 'warn'], job_returned: ['box', 'job'], profile_update: ['edit', 'job'],
    cod_accept: ['coin', 'ok'], cod_decline: ['x', 'warn'], cod_withdraw: ['x', 'warn'], job_arrive: ['walk', 'job'], job_contact: ['phone', 'job'],
    job_fail: ['warn', 'warn'], job_refuse: ['warn', 'warn'], appeal: ['info', 'job'], appeal_decide: ['check', 'job'],
    pricing_update: ['coin', 'job'], admin_disable_user: ['lock', 'warn'], admin_enable_user: ['user', 'ok'], return_remind: ['box', 'job'], return_extend: ['clock', 'job'], return_dispose: ['box', 'warn'], refund_paid: ['coin', 'ok'],
  };
  // ===================== v2: หน้าร้าน (ผู้ใช้) =====================
  function svcIcon(n) { return icon({ box: 'box', clock: 'clock', doc: 'doc', bag: 'bag' }[n] || 'box'); }
  // ---- ดาวน์โหลดรายงาน CSV (เปิดใน Excel/Google Sheets ได้ ภาษาไทยไม่เพี้ยน)
  function csvCell(v) { v = v === null || v === undefined ? '' : String(v); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; // กัน Excel อ่านเป็นสูตร (CSV injection)
    return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function downloadCsv(name, rows) {
    var text = '\ufeff' + rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function exportCsv(kind) {
    return call('jobs').then(function (d) {
      var all = d.orders.slice().sort(function (a, b) { return String(a.created_at).localeCompare(String(b.created_at)); });
      var day = function (t) { return t ? dayKeyTz(t) : ''; }, tm = function (t) { return t ? new Date(t).toLocaleString('th-TH', { hour12: false }) : ''; };
      var stamp = dayKeyTz(new Date().toISOString());
      if (kind === 'jobs') return downloadCsv('TheungMue-orders-' + stamp + '.csv', [['เลขคำสั่ง', 'วันที่สั่ง', 'เวลาสั่ง', 'แบบการส่ง', 'ประเภทของ', 'จุดส่ง', 'ผู้สั่ง', 'ผู้รับ', 'วิธีชำระ', 'ค่าบริการ', 'ส่วนลด', 'ยอดชำระ', 'สถานะ', 'ต้องถึง', 'ส่งถึงเมื่อ', 'ส่งช้า (นาที)', 'เหตุผลยกเลิก', 'สาเหตุจาก', 'คืนเงิน', 'Point ที่ได้']].concat(all.map(function (j) {
        return [j.id, day(j.created_at), tm(j.created_at), (CONFIG.MODES[j.mode] || {}).label, j.item_type, zoneName(j.dropoff_zone, j.dropoff_detail), j.sender_name, j.recipient_name, (CONFIG.PAY_METHODS[j.pay_method] || CONFIG.PAY_METHODS.sender).label,
          j.subtotal, j.discount, j.total, CONFIG.STATUS[j.status], tm(j.due_at), tm(j.delivered_at), j.late_min || '', j.status === 'cancelled' ? adminCancelWhy(j) : '', CONFIG.FAULT_LABEL[j.fail_fault] || '', j.refund_amount || '', j.points_earned || ''];
      })));
      var by = {};
      all.forEach(function (j) { var k = day(j.created_at); (by[k] = by[k] || []).push(j); });
      downloadCsv('TheungMue-daily-' + stamp + '.csv', [['วันที่', 'คำสั่งใหม่', 'ปกติ', 'ด่วน', 'สำเร็จ', 'ยกเลิก', 'ส่งไม่สำเร็จ', 'ส่งทันกำหนด (%)', 'รายรับงานสำเร็จ (บาท)', 'คืนเงิน (บาท)']].concat(Object.keys(by).sort().map(function (k) {
        var js = by[k], done = js.filter(function (j) { return j.status === 'delivered'; });
        var ontime = done.filter(function (j) { return Number(j.late_min || 0) <= CONFIG.LATE.GRACE_MIN || j.late_excused; }).length;
        return [k, js.length, js.filter(function (j) { return j.mode === 'normal'; }).length, js.filter(function (j) { return j.mode === 'urgent'; }).length, done.length,
          js.filter(function (j) { return j.status === 'cancelled'; }).length, js.filter(function (j) { return j.cancel_reason === 'failed'; }).length,
          done.length ? Math.round(ontime / done.length * 100) : '', done.reduce(function (t, j) { return t + Number(j.total || 0); }, 0), js.reduce(function (t, j) { return t + Number(j.refund_amount || 0); }, 0)];
      })));
    }).catch(function (e) { if (!handleAuthError(e)) showError('err', e.message); });
  }
  function baht(n) { return '฿' + Number(n || 0).toLocaleString('th-TH'); }
  function startPrice(s) { return CONFIG.PRICE.BASE[s.mode] + (CONFIG.PRICE.ITEM_EXTRA[s.item] || 0); }
  // แถบเวลาให้บริการ: ปิดอยู่ = สั่งไม่ได้ · เปิดอยู่แต่หมดเวลางานด่วน = แจ้ง
  function svcBanner(sv) {
    if (!sv) return '';
    applyPricingClient(sv.pricing);
    if (!sv.open) return '<div class="card svcban off">' + icon('clock') + '<span><b>นอกเวลาให้บริการ</b>เปิดทุกวัน ' + sv.hours.open + '–' + sv.hours.close + ' น. สั่งได้อีกครั้งตอน ' + sv.hours.open + ' น.</span></div>';
    if (sv.override && !sv.in_hours) return '<div class="card svcban test">' + icon('info') + '<span><b>เปิดรับคำสั่งนอกเวลา (โหมดทดสอบ)</b>แอดมินเปิดไว้สำหรับทดสอบหรือนำเสนอ</span></div>';
    if (!sv.urgent_ok) return '<div class="card svcban">' + icon('clock') + '<span><b>งานด่วนปิดรับแล้ววันนี้</b>งานด่วนสั่งได้ถึง ' + sv.urgent_until + ' น. ตอนนี้สั่งส่งปกติได้ ปิด ' + sv.hours.close + ' น.</span></div>';
    return '';
  }
  function viewUserHome() {
    function load() {
      return call('jobs').then(function (d) {
        me = d.me;
        var bal = d.points.balance, maxB = Math.floor(bal / CONFIG.POINT_USE.PER_BAHT);
        var active = d.sent.filter(function (j) { return !closed(j); });
        var incoming = d.incoming.filter(function (j) { return !closed(j); });
        var toAccept = incoming.filter(function (j) { return j.status === 'pending' && j.cod_status === 'waiting'; });
        app.innerHTML = shell('', '<div class="hero"><b>ส่งของในมหาวิทยาลัย ถึงมือผู้รับ</b><span>ฝากของที่จุดรับฝาก' + esc(CONFIG.DROP_POINT_PLACE.replace(/\s*\(.*\)/, '')) +
            ' · ส่งปกติภายใน 1 วัน ด่วนภายใน 1–2 ชม. · จ่ายตอนฝาก หรือให้ผู้รับจ่ายปลายทาง</span><em>ใช้ Point ลดค่าบริการได้</em><span class="heropg">' + BIRD + '</span><i class="tape"></i></div>' +
          svcBanner(d.service) +
          '<h2>เลือกบริการ</h2><div class="svcgrid' + (d.service.open ? '' : ' off') + '">' + CONFIG.SERVICES.map(function (s) {
            return '<button type="button" class="svc" data-svc="' + s.key + '"' + (d.service.open ? '' : ' disabled') + '><i>' + svcIcon(s.icon) + '</i><b>' + esc(s.label) + '</b><small>' + esc(s.hint) + '</small><em>เริ่ม ' + baht(startPrice(s)) + '</em></button>';
          }).join('') + '</div>' +
          '<a href="#" class="card ptbar" data-page="points">' + icon('gift') + '<span>Point ของฉัน <b>' + bal + '</b>' + (maxB ? ' · ใช้ลดได้สูงสุด ' + baht(maxB) : ' · สะสมเมื่อคำสั่งสำเร็จ') + '</span>' + icon('next') + '</a>' +
          '<div id="err" class="error"></div>' +
          (toAccept.length ? '<a href="#" class="card remind" data-job="' + esc(toAccept[0].id) + '"><span class="ri">' + icon('coin') + '</span><span><b>มีคำสั่งรอคุณยอมรับชำระ ' + toAccept.length + ' รายการ</b><small>' +
            esc(toAccept[0].sender_name) + ' ส่งของถึงคุณแบบเก็บเงินปลายทาง ' + baht(toAccept[0].total) + '</small></span>' + icon('next') + '</a>' : '') +
          '<h2>คำสั่งที่กำลังดำเนินการ <span class="count">' + active.length + '</span>' + (d.sent.length ? '<button class="h2link" data-go="u-orders">ดูทั้งหมด</button>' : '') + '</h2>' +
          (active.length ? '<div class="stack">' + active.slice().sort(function (a, b) { return (sentRank(a) - sentRank(b)) || String(a.due_at).localeCompare(String(b.due_at)); }).slice(0, 3).map(ordCard).join('') + '</div>' : '<p class="empty">ยังไม่มีคำสั่ง เลือกบริการด้านบนเพื่อเริ่มสั่ง</p>') +
          (incoming.length ? '<h2>ของที่กำลังมาถึงคุณ <span class="count">' + incoming.length + '</span><button class="h2link" data-go="u-incoming">ดูทั้งหมด</button></h2>' + '<div class="stack">' + incoming.slice().sort(function (a, b) { return (INC_ORDER[a.status] - INC_ORDER[b.status]) || String(a.due_at).localeCompare(String(b.due_at)); }).slice(0, 2).map(function (j) { return incCard(j, 'active'); }).join('') + '</div>' : ''),
          { brand: true });
      }).catch(function (e) { if (!handleAuthError(e)) showError('err', e.message); });
    }
    load();
    every(8000, function () { if (!typing()) load(); });
  }

  // คำสั่งของฉัน: แท็บตามสถานะ
  var ORDER_TABS = {
    user: [['all', 'ทั้งหมด'], ['pending', 'รอยืนยัน'], ['confirmed', 'รอรับของ'], ['active', 'กำลังส่ง'], ['delivered', 'สำเร็จ'], ['cancelled', 'ยกเลิก']],
    admin: [['pending', 'รอยืนยัน'], ['confirmed', 'รอรับของ'], ['active', 'กำลังส่ง'], ['delivered', 'สำเร็จ'], ['cancelled', 'ยกเลิก']],
  };
  function inTab(j, t) {
    if (t === 'all') return true;
    if (t === 'active') return j.status === 'picked' || j.status === 'delivering';
    return j.status === t;
  }
  function tabBar(tabs, cur, items) {
    return '<div class="otabs">' + tabs.map(function (t) {
      var n = items.filter(function (j) { return inTab(j, t[0]); }).length;
      if (t[0] === 'cancelled' && me.role === 'admin') n = items.filter(function (j) { return j.todo && j.todo.any; }).length; // แอดมิน: จำนวนที่ยังต้องจัดการ
      return '<button data-act="otab" data-t="' + t[0] + '" class="' + (cur === t[0] ? 'on' : '') + '">' + t[1] +
        (n && t[0] !== 'all' && t[0] !== 'delivered' && (t[0] !== 'cancelled' || me.role === 'admin') ? '<em>' + n + '</em>' : '') + '</button>';
    }).join('') + '</div>';
  }
  // การ์ดคำสั่งฝั่งผู้สั่ง: ถึงใคร · ยกเลิกบอกเหตุผลแทนราคา · งานจบบอกเวลาจบ · ปลายทางรอผู้รับบอกเวลาที่เหลือ
  var SENT_CANCEL = { sender: 'คุณยกเลิกเอง', admin: 'แอดมินยกเลิก', rejected: 'แอดมินปฏิเสธคำสั่ง', cod_declined: 'ผู้รับปฏิเสธชำระปลายทาง', cod_withdrawn: 'ผู้รับถอนการยอมรับ', cod_expired: 'ผู้รับไม่ตอบรับใน 24 ชม.', failed: 'ส่งไม่สำเร็จ' };
  var SENT_ORDER = { delivering: 0, picked: 1, confirmed: 2, pending: 3 };
  function sentRank(j) { return SENT_ORDER[j.status] + (j.cod_status === 'waiting' ? 0.5 : 0); }
  function ordCard(j) {
    var codWait = j.status === 'pending' && j.cod_status === 'waiting';
    var st = j.status === 'delivered' ? '<span class="ist ok">สำเร็จ</span>' : j.status === 'cancelled' ? '<span class="ist x">ยกเลิก</span>' :
      codWait ? '<span class="badge st-pending">รอผู้รับยอมรับ</span>' : badge(j.status);
    var right = j.status === 'cancelled' ? '<span class="ipaid">' + esc(SENT_CANCEL[j.cancel_reason] || 'ยกเลิก') + '</span>' : (j.total ? '<b class="price">' + baht(j.total) + '</b>' : '');
    var h = '<a href="#" class="card icard" data-job="' + esc(j.id) + '"><div class="ir1">' + modeTag(j.mode) + '<b>' + esc(j.id) + '</b>' + codTag(j) + st + '</div>' +
      '<div class="ir2"><span>ถึง ' + esc(j.recipient_name) + ' → ' + esc(zoneName(j.dropoff_zone, j.dropoff_detail)) + '</span>' + right + '</div>';
    if (j.status === 'delivered') h += '<div class="ir3">ส่งถึงเมื่อ ' + fmtTime(j.delivered_at) + (Number(j.late_min) > CONFIG.LATE.GRACE_MIN && !j.late_excused ? ' <span class="latepill">ส่งช้า ' + j.late_min + ' นาที</span>' : '') + '</div>';
    else if (j.status === 'cancelled') h += '<div class="ir3">ยกเลิกเมื่อ ' + fmtTime(j.cancelled_at || j.created_at) + '</div>';
    else {
      h += '<div class="ir3">' + (j.status === 'confirmed' ? '<span class="idrop">นำของมาฝากที่จุดรับฝากได้เลย</span> · ต้องถึง ' + fmtTime(j.due_at) : esc(j.item_type) + ' · ต้องถึง ' + fmtTime(j.due_at) + (codWait ? '' : ' · ' + timeLeft(j.due_at))) +
        (j.overdue_min ? ' <span class="latepill">เลยกำหนด ' + j.overdue_min + ' นาที</span>' : j.near_due ? ' <span class="latepill warn">ใกล้กำหนด</span>' : '') + '</div>';
      if (codWait) {
        var left = Math.max(0, Math.ceil((new Date(j.created_at).getTime() + CONFIG.COD_WAIT_HOURS * 3600000 - Date.now()) / 3600000));
        h += '<div class="owait">ผู้รับต้องตอบภายใน ' + left + ' ชม. ไม่งั้นยกเลิกอัตโนมัติ</div>';
      }
    }
    return h + '</a>';
  }
  function viewOrders() {
    state.otab = state.otab || 'all';
    var Q = state.oq || '', showHid = false, items = [];
    function match(j) {
      var q = Q.trim().toLowerCase();
      return !q || [j.id, j.item_type, j.item_detail, zoneName(j.dropoff_zone, j.dropoff_detail), j.recipient_name].join(' ').toLowerCase().indexOf(q) >= 0;
    }
    function draw() {
      var t = state.otab, canHide = t === 'delivered' || t === 'cancelled';
      var inT = items.filter(function (j) { return inTab(j, t) && match(j); });
      var nHid = inT.filter(function (j) { return j.hidden; }).length;
      var shown = inT.filter(function (j) { return showHid || !j.hidden; });
      if (t === 'all' && !Q.trim()) { // ทั้งหมด: กำลังดำเนินการ บน · จบแล้ว 3 ล่าสุด + ดูทั้งหมด
        var act = items.filter(function (j) { return !closed(j); }).sort(function (a, b) { return (sentRank(a) - sentRank(b)) || String(a.due_at).localeCompare(String(b.due_at)); });
        var done = items.filter(closed), vis = done.filter(function (j) { return !j.hidden; }).sort(byClosedDesc);
        $('olist').innerHTML = '<h2>กำลังดำเนินการ <span class="count">' + act.length + '</span></h2>' +
          (act.length ? '<div class="stack">' + act.map(ordCard).join('') + '</div>' : '<p class="empty">ไม่มีคำสั่งที่กำลังดำเนินการ</p>') +
          (done.length ? '<h2>จบแล้ว <span class="count">' + vis.length + '</span>' + (vis.length > HIST_PREVIEW || vis.length < done.length ? '<button class="h2link" data-hist="sent">ดูทั้งหมด</button>' : '') + '</h2>' +
            (vis.length ? '<div class="stack">' + vis.slice(0, HIST_PREVIEW).map(ordCard).join('') + '</div>' : '<p class="empty">ซ่อนไว้ทั้งหมด ' + done.length + ' รายการ</p>') : '');
        return;
      }
      if (!canHide) shown.sort(function (a, b) { return (sentRank(a) - sentRank(b)) || String(a.due_at).localeCompare(String(b.due_at)); });
      $('olist').innerHTML = (shown.length ? '<div class="stack">' + shown.map(function (j) {
          return canHide ? '<div class="hitem' + (j.hidden ? ' ishid' : '') + '">' + ordCard(j) +
            '<button class="hidebtn" data-act="ohide" data-id="' + esc(j.id) + '" data-on="' + (j.hidden ? '0' : '1') + '">' + icon(j.hidden ? 'eye' : 'eyeoff') + (j.hidden ? 'เลิกซ่อน' : 'ซ่อนรายการ') + '</button></div>' : ordCard(j);
        }).join('') + '</div>'
        : '<p class="empty">' + (Q.trim() ? 'ไม่พบคำสั่งที่ตรงกับ "' + esc(Q.trim()) + '"' : t === 'all' ? 'ยังไม่มีคำสั่ง' : 'ไม่มีคำสั่งในสถานะนี้') + '</p>') +
        (canHide && nHid ? '<button class="linkbtn hidtoggle" data-act="ohid">' + (showHid ? 'ซ่อนรายการที่ซ่อนไว้อีกครั้ง' : 'แสดงรายการที่ซ่อนไว้ (' + nHid + ')') + '</button>' : '');
    }
    function load() {
      return call('jobs').then(function (d) {
        me = d.me; items = d.sent;
        var focus = document.activeElement && document.activeElement.id === 'oq';
        if (!items.length) {
          app.innerHTML = shell('คำสั่งของฉัน', '<div id="err" class="error"></div><div class="incempty">' + icon('inbox') + '<b>ยังไม่มีคำสั่ง</b><span>ฝากของที่จุดรับฝาก แล้ว TheungMue จะส่งถึงมือผู้รับในมหาวิทยาลัย</span>' +
            '<button type="button" class="btn block oempty" data-go="u-home">สั่งส่งของ</button></div>');
          return;
        }
        app.innerHTML = shell('คำสั่งของฉัน',
          '<label class="hsearch">' + icon('search') + '<input type="search" id="oq" placeholder="ค้นหาเลขคำสั่ง สิ่งของ สถานที่ หรือผู้รับ" autocomplete="off"></label>' +
          tabBar(ORDER_TABS.user, state.otab, items.filter(function (j) { return !j.hidden; })) + '<div id="err" class="error"></div><div id="olist"></div>');
        var tb = app.querySelector('.otabs'), on = tb && tb.querySelector('.on'); // แท็บที่เลือกต้องเห็นเสมอ (แท็บเลื่อนซ้ายขวาได้)
        if (on) { var r1 = tb.getBoundingClientRect(), r2 = on.getBoundingClientRect(); if (r2.right > r1.right) tb.scrollLeft += r2.right - r1.right + 8; }
        var q = $('oq'); q.value = Q;
        q.addEventListener('input', function () { Q = state.oq = q.value; draw(); });
        if (focus) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
        draw();
      }).catch(function (e) { if (!handleAuthError(e)) showError('err', e.message); });
    }
    state.histAct = function (a, el) {
      if (a === 'otab') { state.otab = el.getAttribute('data-t'); showHid = false; load(); }
      if (a === 'ohid') { showHid = !showHid; draw(); }
      if (a === 'ohide') {
        var id = el.getAttribute('data-id'), on = el.getAttribute('data-on') === '1';
        var j = items.filter(function (x) { return x.id === id; })[0]; if (!j) return;
        j.hidden = on ? '1' : ''; draw();
        call('hide', { id: id, on: on }).catch(function (e) { j.hidden = on ? '' : '1'; draw(); if (!handleAuthError(e)) showError('err', e.message); });
      }
    };
    load();
    every(8000, function () { if (!typing()) load(); });
  }


  // ===== ของที่จะได้รับ: ต้องทำ (ปลายทางรอยอมรับ) · กำลังมาถึงคุณ · ประวัติ =====
  var CANCEL_SHORT = { sender: 'ผู้สั่งยกเลิก', admin: 'แอดมินยกเลิก', rejected: 'แอดมินปฏิเสธคำสั่ง', cod_declined: 'คุณปฏิเสธชำระปลายทาง', cod_withdrawn: 'คุณถอนการยอมรับ', cod_expired: 'ไม่ได้ตอบรับใน 24 ชม.', failed: 'ส่งไม่สำเร็จ' };
  var INC_ORDER = { delivering: 0, picked: 1, confirmed: 2, pending: 3 };
  function incPay(j) { // ราคาบนการ์ดของผู้รับ: แสดงยอดเฉพาะที่ผู้รับต้องจ่าย
    if (j.status === 'cancelled') return '<span class="ipaid">' + esc(CANCEL_SHORT[j.cancel_reason] || 'ยกเลิก') + '</span>';
    if (!isCod(j)) return '<span class="ipaid">ผู้สั่งเป็นคนจ่าย</span>';
    if (j.status === 'delivered') return '<span class="ipaid">จ่ายแล้ว ' + baht(j.total) + '</span>';
    return '<span class="ipay">ต้องจ่าย ' + baht(j.cod_status === 'waiting' ? j.subtotal : j.total) + '</span>';
  }
  function codLeft(j) { return Math.max(0, Math.ceil((new Date(j.created_at).getTime() + CONFIG.COD_WAIT_HOURS * 3600000 - Date.now()) / 3600000)); }
  function incCard(j, kind) {
    var st = kind === 'todo' ? '<span class="ist me">รอคุณยอมรับ</span>' : j.status === 'delivered' ? '<span class="ist ok">ได้รับแล้ว</span>' : j.status === 'cancelled' ? '<span class="ist x">ยกเลิก</span>' :
      '<span class="badge st-' + esc(j.status) + '">' + esc(CONFIG.STATUS[j.status]) + '</span>';
    var h = '<a href="#" class="card icard' + (kind === 'todo' ? ' todo' : '') + '" data-job="' + esc(j.id) + '"><div class="ir1">' + modeTag(j.mode) + '<b>' + esc(j.id) + '</b>' + codTag(j) + st + '</div>' +
      '<div class="ir2"><span>จาก ' + esc(j.sender_name) + ' → ' + esc(zoneName(j.dropoff_zone, j.dropoff_detail)) + '</span>' + incPay(j) + '</div>';
    if (kind === 'todo') {
      var left = Math.max(0, Math.ceil((new Date(j.created_at).getTime() + CONFIG.COD_WAIT_HOURS * 3600000 - Date.now()) / 3600000));
      h += '<div class="idue">ยอมรับภายใน ' + left + ' ชม. ไม่งั้นคำสั่งจะถูกยกเลิกอัตโนมัติ</div>' +
        '<div class="ibtns"><button type="button" class="btn ghost small" data-decline="' + esc(j.id) + '">ปฏิเสธ</button><button type="button" class="btn small" data-job="' + esc(j.id) + '">ดูและยอมรับ</button></div>';
    } else if (kind === 'active') {
      h += '<div class="ir3">' + esc(j.item_type) + ' · ต้องถึง ' + fmtTime(j.due_at) + ' · ' + timeLeft(j.due_at) + (j.overdue_min ? ' <span class="latepill">เลยกำหนด ' + j.overdue_min + ' นาที</span>' : '') + '</div>';
      if (j.status === 'delivering' && j.code) h += '<div class="icode"><span>รหัสรับของ<small>บอกไรเดอร์หลังได้รับของแล้วเท่านั้น</small></span><b>' + esc(j.code) + '</b></div>';
    } else h += '<div class="ir3">' + (j.status === 'delivered' ? 'ได้รับเมื่อ ' + fmtTime(j.delivered_at) : fmtTime(j.cancelled_at || j.created_at)) + '</div>';
    return h + '</a>';
  }
  function viewUserIncoming() {
    function load() {
      return call('jobs').then(function (d) {
        me = d.me;
        var todo = d.incoming.filter(function (j) { return j.status === 'pending' && j.cod_status === 'waiting'; });
        var active = d.incoming.filter(function (j) { return !closed(j) && todo.indexOf(j) < 0; }).sort(function (a, b) {
          return (INC_ORDER[a.status] - INC_ORDER[b.status]) || String(a.due_at).localeCompare(String(b.due_at)); });
        var done = d.incoming.filter(closed), vis = done.filter(function (j) { return !j.hidden; }).sort(byClosedDesc), nHid = done.length - vis.length;
        var body;
        if (!d.incoming.length) body = '<div class="incempty">' + icon('inbox') + '<b>ยังไม่มีของที่ส่งถึงคุณ</b><span>เมื่อมีคนส่งของถึงคุณ จะแสดงที่หน้านี้</span>' +
          '<ol><li>ได้แจ้งเตือนเมื่อมีคนส่งของถึงคุณ</li><li>ถ้าเป็นเก็บเงินปลายทาง ต้องกดยอมรับภายใน ' + CONFIG.COD_WAIT_HOURS + ' ชม.</li><li>ตอนได้รับของ บอกรหัส 4 หลักกับไรเดอร์</li></ol></div>';
        else body = (todo.length ? '<h2>ต้องทำ <span class="count">' + todo.length + '</span></h2><div class="stack">' + todo.map(function (j) { return incCard(j, 'todo'); }).join('') + '</div>' : '') +
          '<h2>กำลังมาถึงคุณ <span class="count">' + active.length + '</span></h2>' + (active.length ? '<div class="stack">' + active.map(function (j) { return incCard(j, 'active'); }).join('') + '</div>' : '<p class="empty">ยังไม่มีของที่กำลังส่งมาถึงคุณ</p>') +
          (done.length ? '<h2>ประวัติ <span class="count">' + vis.length + '</span>' + (vis.length > HIST_PREVIEW || nHid ? '<button class="h2link" data-hist="incoming">ดูทั้งหมด</button>' : '') + '</h2>' +
            (vis.length ? '<div class="stack">' + vis.slice(0, HIST_PREVIEW).map(function (j) { return incCard(j, 'done'); }).join('') + '</div>' : '<p class="empty">ไม่มีรายการที่แสดง (ซ่อนไว้ ' + nHid + ' รายการ)</p>') : '');
        app.innerHTML = shell('ของที่จะได้รับ', '<div id="err" class="error"></div>' + body);
        app.querySelectorAll('[data-decline]').forEach(function (bt) {
          bt.addEventListener('click', function (e) {
            e.preventDefault(); e.stopPropagation();
            if (!bt.dataset.armed) { bt.dataset.armed = '1'; bt.textContent = 'กดอีกครั้งเพื่อปฏิเสธ'; return; }
            bt.disabled = true;
            call('act', { id: bt.getAttribute('data-decline'), action: 'cod_decline' }).then(load).catch(function (er) { bt.disabled = false; showError('err', er.message); });
          });
        });
      }).catch(function (e) { if (!handleAuthError(e)) showError('err', e.message); });
    }
    load();
    every(8000, function () { if (!typing() && !app.querySelector('[data-decline][data-armed]')) load(); });
  }

  // ---------- Point ของฉัน ----------
  // ประวัติ Point: หน้า Point แสดง 5 รายการล่าสุด · ทั้งหมดแบ่งตามวันในหน้า "ดูทั้งหมด"
  var PT_SHOW = 5;
  var PT_LABEL = { earn: 'ได้จากคำสั่งที่สำเร็จ', use: 'ใช้เป็นส่วนลด', refund: 'คืน Point (คำสั่งถูกยกเลิก)', start: 'Point ตั้งต้นสำหรับทดสอบ', comp: 'ชดเชยส่งช้า', penalty: 'หัก: ปฏิเสธรับของ', revoked: 'คืน: แอดมินยกเลิกบทลงโทษ' };
  function ptRow(x, i, arr, clockOnly) {
    var plus = x.kind !== 'use' && x.kind !== 'penalty', when = clockOnly === true ? fmtClock(x.at) : fmtTime(x.at);
    if (x.kind === 'start') return '<div class="lr"><span>' + PT_LABEL.start + '<small>ให้มากับบัญชีทดลอง เพื่อทดสอบการใช้ Point แลกส่วนลด</small></span><b>+' + x.amount + '</b></div>';
    return '<a href="#" class="lr" data-job="' + esc(x.id) + '"><span>' + esc(x.id) + ' · ' + PT_LABEL[x.kind] + '<small>' + esc((CONFIG.MODES[x.mode] || {}).label || '') + ' → ' + esc(x.dropoff_zone) +
      (x.cod ? ' · ปลายทาง' : '') + (x.kind === 'use' ? ' · ลด ' + baht(x.discount) : '') + (x.kind === 'comp' ? ' · ช้า ' + x.late + ' นาที' : '') + (x.kind === 'penalty' ? ' · ' + esc(x.reason || '') : '') + ' · ' + when + '</small></span><b class="' + (plus ? '' : 'minus') + '">' + (plus ? '+' : '−') + x.amount + '</b></a>';
  }
  function viewPointsAll() {
    app.innerHTML = shell('ประวัติ Point ทั้งหมด', '<div id="err" class="error"></div><div id="ptall"><p class="empty">กำลังโหลด…</p></div>', { back: true, nav: navRoot() });
    call('points').then(function (d) {
      var days = [], by = {};
      d.items.forEach(function (x) { var k = x.at ? dayKeyTz(x.at) : 'start'; if (!by[k]) { by[k] = []; days.push(k); } by[k].push(x); });
      $('ptall').innerHTML = '<p class="sub">คงเหลือ <b>' + d.balance + '</b> Point · ทั้งหมด ' + d.items.length + ' รายการ</p>' + (days.length ? days.map(function (k) {
        var sum = by[k].reduce(function (s, x) { return s + (x.kind === 'use' || x.kind === 'penalty' ? -1 : 1) * Number(x.amount); }, 0);
        return '<div class="logday">' + (k === 'start' ? 'ตั้งต้น' : esc(dayLabel(by[k][0].at))) + '<span>' + (sum >= 0 ? '+' : '−') + Math.abs(sum) + ' Point</span></div>' +
          '<div class="card crlist">' + by[k].map(function (x) { return ptRow(x, 0, null, true); }).join('') + '</div>';
      }).join('') : '<p class="empty">ยังไม่มี Point</p>');
    }).catch(function (e) { if (!handleAuthError(e)) showError('err', e.message); });
  }
  function viewPoints() {
    app.innerHTML = shell('Point ของฉัน', '<div id="err" class="error"></div><div id="ptbody"><p class="empty">กำลังโหลด…</p></div>', { back: true, nav: navRoot() });
    call('points').then(function (d) {
      me = d.me;
      var P = CONFIG.POINTS, U = CONFIG.POINT_USE, T = CONFIG.TIERS;
      $('ptbody').innerHTML =
        '<div class="stats"><div class="stat"><b>' + d.balance + '</b><span>Point คงเหลือ</span></div><div class="stat"><b>' + baht(Math.floor(d.balance / U.PER_BAHT)) + '</b><span>มูลค่าที่ใช้ลดได้</span></div></div>' +
        '<h2>วิธีได้และใช้ Point</h2><div class="card"><table class="rate">' +
        '<tr><td>ได้เมื่อคำสั่งสำเร็จ งานปกติ / งานด่วน</td><td>' + P.BASE.normal + ' / ' + P.BASE.urgent + '</td></tr>' +
        '<tr><td>บวกตามระยะส่ง<small>ใกล้ ≤' + T[0].max + ' ม. · กลาง ≤' + T[1].max + ' ม. · ไกล >' + T[1].max + ' ม.</small></td><td>+' + P.DIST.join(' / +') + '</td></tr>' +
        '<tr><td>ใช้ลดค่าบริการ<small>ลดได้ไม่เกินครึ่งหนึ่งของค่าบริการ</small></td><td>' + (U.PER_BAHT * 5) + ' Point = ฿5</td></tr>' +
        '<tr><td>ชดเชยเมื่อส่งช้าเกิน ' + CONFIG.LATE.GRACE_MIN + ' นาที</td><td>+' + CONFIG.LATE.COMP_POINTS + '</td></tr>' +
        '<tr><td>ปฏิเสธรับของปลายทางหลังไรเดอร์ออกส่ง<small>ความผิดผู้รับ · ไม่ติดลบ</small></td><td>−' + CONFIG.REFUSE.PENALTY + '</td></tr></table>' +
        '<p class="ratenote">คนที่จ่ายเงินเป็นคนใช้และได้ Point · จ่ายตอนฝาก = ผู้สั่ง · เก็บเงินปลายทาง = ผู้รับ · ยกเลิกคำสั่งแล้วคืน Point ให้คนที่ใช้</p></div>' +
        (d.refusals && d.refusals.recent ? '<div class="card lateban ' + (d.refusals.ban_until ? 'red' : 'warn') + '">' + icon('warn') + '<span><b>ปฏิเสธรับของ ' + d.refusals.recent + ' ครั้งใน ' + CONFIG.REFUSE.WINDOW_DAYS + ' วัน</b>' +
          (d.refusals.ban_until ? 'รับของแบบเก็บเงินปลายทางไม่ได้ถึง ' + fmtDate(d.refusals.ban_until) : 'ครบ ' + CONFIG.REFUSE.LIMIT + ' ครั้งจะรับของแบบเก็บเงินปลายทางไม่ได้ ' + CONFIG.REFUSE.BAN_DAYS + ' วัน') + '</span></div>' : '') +
        '<h2>ประวัติ Point <span class="count">' + d.items.length + '</span>' + (d.items.length > PT_SHOW ? '<button class="h2link" data-page="points-all">ดูทั้งหมด</button>' : '') + '</h2>' +
        (d.items.length ? '<div class="card crlist">' + d.items.slice(0, PT_SHOW).map(ptRow).join('') + '</div>' +
          (d.items.length > PT_SHOW ? '<p class="morenote">แสดง ' + PT_SHOW + ' รายการล่าสุด · อีก ' + (d.items.length - PT_SHOW) + ' รายการดูได้ที่ "ดูทั้งหมด"</p>' : '') : '<p class="empty">ยังไม่มี Point ได้ Point เมื่อคำสั่งสำเร็จ</p>');
    }).catch(function (e) { if (!handleAuthError(e)) showError('err', e.message); });
  }

  // ===================== v2: หลังร้าน (แอดมิน) =====================
  // การ์ดคำสั่งที่ยกเลิกแล้วของแอดมิน: เหตุผลแทนราคา + ป้ายงานที่ยังต้องทำ
  function adminCancelWhy(j) {
    if (j.cancel_reason === 'failed') { var FR = CONFIG.FAIL_REASONS[j.fail_reason] || {}; return FR.by === 'recipient' ? 'ผู้รับไม่รับของ' : 'ส่งไม่สำเร็จ' + (CONFIG.FAULT_LABEL[j.fail_fault] ? ' · ' + CONFIG.FAULT_LABEL[j.fail_fault] : ''); }
    return { sender: 'ผู้สั่งยกเลิก', admin: 'แอดมินยกเลิก', rejected: 'แอดมินปฏิเสธคำสั่ง', cod_declined: 'ผู้รับปฏิเสธชำระ', cod_withdrawn: 'ผู้รับถอนการยอมรับ', cod_expired: 'ผู้รับไม่ตอบใน 24 ชม.' }[j.cancel_reason] || 'ยกเลิก';
  }
  function todoFlags(t, j) {
    if (!t || !t.any) return '';
    return '<div class="flags">' + (t.refund ? '<span class="flag r">ต้องคืนเงิน ' + baht(j.refund_amount) + '</span>' : '') + (t.appeal ? '<span class="flag b">รอตรวจโต้แย้ง</span>' : '') +
      (t.ret ? '<span class="flag ' + (t.overdue ? 'r' : 'y') + '">' + (t.overdue ? 'เกินกำหนดรับของคืนแล้ว' : 'รอผู้สั่งมารับของคืน · เหลือ ' + t.days_left + ' วัน') + '</span>' : '') + '</div>';
  }
  function adminClosedCard(j) {
    return '<a href="#" class="card icard" data-job="' + esc(j.id) + '"><div class="ir1">' + modeTag(j.mode) + '<b>' + esc(j.id) + '</b>' + codTag(j) + '<span class="ist x">ยกเลิก</span></div>' +
      '<div class="ir2"><span>' + esc(j.sender_name) + ' → ' + esc(j.recipient_name) + ' · ' + esc(zoneName(j.dropoff_zone, j.dropoff_detail)) + '</span><span class="ipaid">' + esc(adminCancelWhy(j)) + '</span></div>' +
      '<div class="ir3">ยกเลิกเมื่อ ' + fmtTime(j.cancelled_at) + '</div>' + todoFlags(j.todo, j) + '</a>';
  }
  function viewAdminOrders() {
    state.atab = state.atab || 'pending';
    var Q = state.aq || '';
    function load() {
      return call('jobs').then(function (d) {
        me = d.me;
        var all = d.orders, t = state.atab;
        var c = function (s) { return all.filter(function (j) { return inTab(j, s); }).length; };
        var shown = all.filter(function (j) { return inTab(j, t); }).filter(function (j) {
          var q = Q.trim().toLowerCase();
          return !q || [j.id, j.sender_name, j.recipient_name, j.dropoff_zone, j.item_detail].join(' ').toLowerCase().indexOf(q) >= 0;
        });
        if (t === 'cancelled') shown.sort(function (a, b) { return ((b.todo && b.todo.any) ? 1 : 0) - ((a.todo && a.todo.any) ? 1 : 0) || String(b.cancelled_at).localeCompare(String(a.cancelled_at)); });
        if (t === 'pending' || t === 'confirmed' || t === 'active') shown.sort(function (a, b) { // ด่วนและใกล้กำหนดก่อน
          var na = a.near_due || a.overdue_min > 0, nb = b.near_due || b.overdue_min > 0;
          if (na !== nb) return na ? -1 : 1; // ใกล้กำหนด/เลยกำหนดขึ้นก่อน
          if (a.mode !== b.mode) return a.mode === 'urgent' ? -1 : 1;
          return String(a.due_at).localeCompare(String(b.due_at));
        });
        var focus = document.activeElement && document.activeElement.id === 'aq';
        app.innerHTML = shell('คำสั่งทั้งหมด',
          '<div class="kpis"><div class="' + (c('pending') ? 'hot' : '') + '"><b>' + c('pending') + '</b><span>รอยืนยัน</span></div><div><b>' + c('confirmed') + '</b><span>รอรับของ</span></div>' +
          '<div><b>' + c('active') + '</b><span>กำลังส่ง</span></div><div><b>' + all.filter(function (j) { return j.status === 'delivered' && dayKeyTz(j.delivered_at) === dayKeyTz(new Date().toISOString()); }).length + '</b><span>สำเร็จวันนี้</span></div></div>' +
          '<label class="hsearch">' + icon('search') + '<input type="search" id="aq" placeholder="ค้นหาเลขคำสั่ง ชื่อ หรือสถานที่" autocomplete="off"></label>' +
          tabBar(ORDER_TABS.admin, t, all) +
          '<div id="err" class="error"></div>' +
          (shown.length ? '<div class="stack">' + shown.map(adminCard).join('') + '</div>' : '<p class="empty">ไม่มีคำสั่งในสถานะนี้</p>'), { brand: true });
        var q = $('aq'); q.value = Q;
        q.addEventListener('input', function () { Q = state.aq = q.value; load(); });
        if (focus) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
      }).catch(function (e) { if (!handleAuthError(e)) showError('err', e.message); });
    }
    function adminCard(j) {
      if (j.status === 'cancelled') return adminClosedCard(j);
      var next = { pending: ['confirm', 'ยืนยันคำสั่ง'], picked: ['start', 'เริ่มนำส่ง'] }[j.status];
      var waitCod = j.status === 'pending' && j.cod_status === 'waiting';
      var slow = j.status === 'pending' && j.mode === 'urgent' && j.waiting_min > CONFIG.LATE.PENDING_WARN_MIN && !waitCod;
      return '<div class="card job aord' + (slow ? ' slow' : '') + '">' + jobCardInner(j, 'จาก ' + esc(j.sender_name) + ' ถึง ' + esc(j.recipient_name)) +
        (waitCod ? '<div class="minib warn">' + icon('clock') + 'รอผู้รับยอมรับชำระ · ยังยืนยันคำสั่งไม่ได้</div>' : isCod(j) && j.status === 'pending' ? '<div class="minib info">' + icon('check') + 'ผู้รับยอมรับชำระ ' + baht(j.total) + ' แล้ว ' + fmtClock(j.cod_at) + '</div>' : '') +
        (slow ? '<div class="minib bad">' + icon('warn') + 'งานด่วนรอยืนยันมา ' + j.waiting_min + ' นาที</div>' : '') +
        '<div class="abtns"><button class="btn ghost small" data-job="' + esc(j.id) + '">รายละเอียด</button>' +
        (j.status === 'pending' ? '<button class="btn ghost small dangertext" data-job="' + esc(j.id) + '">ปฏิเสธ</button>' : '') +
        (next ? '<button class="btn small" data-qact="' + next[0] + '" data-id="' + esc(j.id) + '"' + (waitCod ? ' disabled' : '') + '>' + next[1] + '</button>' : '') + '</div></div>';
    }
    state.histAct = function (a, el) { if (a === 'otab') { state.atab = el.getAttribute('data-t'); load(); } };
    state.quickAct = function (el) {
      el.disabled = true;
      call('act', { id: el.getAttribute('data-id'), action: el.getAttribute('data-qact') }).then(load)
        .catch(function (e) { el.disabled = false; if (!handleAuthError(e)) showError('err', e.message); });
    };
    load();
    every(8000, function () { if (!typing()) load(); });
  }

  // ---------- แอดมิน: รีเซ็ตรหัสผ่านให้ผู้ใช้ที่ลืมรหัสผ่าน ----------
  // จัดการผู้ใช้: ค้นหา (ชื่อผู้ใช้ / เบอร์ / ชื่อ) → รีเซ็ตรหัสผ่าน · ระงับ / ยกเลิกระงับบัญชี
  function viewResetPw() {
    app.innerHTML = shell('จัดการผู้ใช้', '<div class="card"><p class="sub" style="margin:0 0 10px">ค้นหาผู้ใช้เพื่อรีเซ็ตรหัสผ่าน (ยืนยันตัวตนด้วยชื่อและเบอร์ก่อนทุกครั้ง) หรือระงับบัญชีที่ใช้งานไม่เหมาะสม</p>' +
      '<form id="rf" class="row gap"><input type="text" name="username" placeholder="ชื่อผู้ใช้ เบอร์ หรือชื่อ" autocapitalize="none" required>' +
      '<button class="btn small" style="width:auto">ค้นหา</button></form><div id="rerr2" class="error"></div><div id="rres"></div></div>', { back: true, nav: 'profile' });
    var rf = $('rf');
    function show(q) {
      showError('rerr2', ''); $('rres').innerHTML = '';
      call('admin_find_user', { username: q }).then(function (r) {
        var u = r.user, off = u.status === 'disabled';
        $('rres').innerHTML = '<dl class="info" style="margin-top:12px"><dt>ชื่อโปรไฟล์</dt><dd>' + esc(u.name) + '</dd>' +
          '<dt>ชื่อผู้ใช้</dt><dd>@' + esc(u.username) + '</dd><dt>เบอร์โทร</dt><dd>' + esc(fmtPhone(u.phone)) + '</dd>' +
          '<dt>คำสั่ง</dt><dd>สั่ง ' + r.sent + ' · รับ ' + r.received + (r.active ? ' · ยังไม่จบ ' + r.active : '') + '</dd>' +
          '<dt>ปฏิเสธรับของ</dt><dd' + (r.refusals ? ' class="badtext"' : '') + '>' + r.refusals + ' ครั้ง / ' + CONFIG.REFUSE.WINDOW_DAYS + ' วัน</dd>' +
          '<dt>สถานะ</dt><dd>' + (off ? '<span class="badtext">ถูกระงับ</span>' + (r.status_note ? ' · ' + esc(r.status_note) : '') : r.locked ? 'ถูกล็อกชั่วคราว (เหลือ ' + r.locked + ' นาที)' : 'ใช้งานได้') + '</dd></dl>' +
          '<button class="btn ghost" id="doreset" style="margin-top:12px">รีเซ็ตรหัสผ่าน</button>' +
          (off ? '<button class="btn" id="doenable" style="margin-top:8px">ยกเลิกการระงับ</button>'
            : '<details class="acancel" style="margin-top:8px"><summary class="btn danger">ระงับบัญชี</summary><form id="disf">' + (r.active_list && r.active_list.length ? '<div class="warnbox2"><b>ผู้ใช้นี้มีคำสั่งที่ยังไม่จบ ' + r.active_list.length + ' รายการ</b>' +
              r.active_list.map(function (x) { return '<a href="#" data-job="' + esc(x.id) + '">• ' + esc(x.id) + '</a> ' + (x.as === 'recipient' ? (x.cod_waiting ? 'รอเขายอมรับชำระปลายทาง: ระงับแล้วกดยอมรับไม่ได้' : x.status === 'delivering' ? 'กำลังนำส่งถึงเขา: ระงับแล้วเขาดูรหัสรับของไม่ได้ ไรเดอร์ปิดงานไม่ได้' : 'ส่งถึงเขา: ระงับแล้วเขาดูรหัสรับของไม่ได้เมื่อเริ่มนำส่ง') : 'เขาเป็นผู้สั่ง: ระงับแล้วติดตามหรือแชทเรื่องคำสั่งนี้ไม่ได้'); }).join('<br>') +
              '<br>ควรจบหรือยกเลิกคำสั่งเหล่านี้ก่อน</div>' : '<div class="minib bad">' + icon('warn') + '<span>เข้าสู่ระบบไม่ได้จนกว่าจะยกเลิกระงับ</span></div>') +
              '<label class="field"><span>เหตุผล<b class="req">*</b></span><input type="text" name="note" maxlength="200" required placeholder="เช่น สั่งแล้วไม่นำของมาฝากซ้ำหลายครั้ง"></label><button class="btn danger solid">' + (r.active_list && r.active_list.length ? 'ระงับทั้งที่มีคำสั่งค้าง' : 'ยืนยันระงับบัญชี') + '</button></form></details>');
        $('doreset').addEventListener('click', function () {
          var b = this;
          if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'กดอีกครั้งเพื่อยืนยันรีเซ็ต'; return; }
          b.disabled = true;
          call('admin_reset_password', { username: u.username }).then(function (x) {
            $('rres').innerHTML = '<div class="codecard" style="margin-top:12px"><strong>รหัสผ่านชั่วคราวของ @' + esc(x.username) + '</strong>' +
              '<div class="code">' + esc(x.temp) + '</div><p class="sub" style="text-align:center;margin:0">แจ้งรหัสนี้กับเจ้าของบัญชีโดยตรง รหัสจะแสดงครั้งเดียว ' +
              'และเจ้าของบัญชีต้องตั้งรหัสผ่านใหม่ทันทีหลังเข้าสู่ระบบ</p></div>';
            rf.reset();
          }).catch(function (err) { b.disabled = false; if (!handleAuthError(err)) showError('rerr2', err.message); });
        });
        var setSt = function (st, note, b) { b.disabled = true; call('admin_set_user_status', { username: u.username, status: st, note: note, confirm_active: !!(r.active_list && r.active_list.length) }).then(function () { show(u.username); })
          .catch(function (err) { b.disabled = false; if (!handleAuthError(err)) showError('rerr2', err.message); }); };
        if ($('doenable')) $('doenable').addEventListener('click', function () { setSt('active', '', this); });
        if ($('disf')) $('disf').addEventListener('submit', function (e) { e.preventDefault(); setSt('disabled', this.note.value.trim(), this.querySelector('.btn')); });
      }).catch(function (err) { if (!handleAuthError(err)) showError('rerr2', err.message); });
    }
    rf.addEventListener('submit', function (e) { e.preventDefault(); show(rf.username.value); });
  }
  // ราคาและ Point: แอดมินแก้ได้ · ราคามีผลกับคำสั่งใหม่ · Point มีผลกับงานที่สำเร็จหลังบันทึก
  function viewPricing() {
    app.innerHTML = shell('ราคาและ Point', '<p class="empty">กำลังโหลด…</p>', { back: true, nav: 'profile' });
    call('pricing').then(function (d) {
      var p = d.pricing;
      var f = function (name, label, val, hint) { return '<label class="setrow"><span>' + label + (hint ? '<small>' + hint + '</small>' : '') + '</span><input type="number" inputmode="numeric" min="0" step="1" name="' + name + '" value="' + esc(val) + '" required></label>'; };
      app.innerHTML = shell('ราคาและ Point', '<form id="prf"><div class="card"><strong>ค่าบริการ (บาท)</strong>' +
        f('normal', 'ส่งปกติ', p.normal) + f('urgent', 'ส่งด่วน', p.urgent) + f('d0', 'ระยะใกล้ (บวกเพิ่ม)', p.dist[0]) + f('d1', 'ระยะกลาง (บวกเพิ่ม)', p.dist[1]) + f('d2', 'ระยะไกล (บวกเพิ่ม)', p.dist[2]) +
        f('extra', 'อาหาร · กล่องใหญ่ · เปราะบาง', p.extra, 'บวกเพิ่มต่อคำสั่ง') + '</div>' +
        '<div class="card"><strong>Point</strong>' + f('pt_normal', 'ได้ต่อคำสั่งปกติ', p.pt_normal) + f('pt_urgent', 'ได้ต่อคำสั่งด่วน', p.pt_urgent) +
        f('per_baht', 'ใช้ลด: กี่ Point ต่อ ฿1', p.per_baht, 'ตอนนี้ ' + p.per_baht * 5 + ' Point = ฿5') + f('comp', 'ชดเชยส่งช้า', p.comp) + f('penalty', 'หักเมื่อปฏิเสธรับของ (ปลายทาง)', p.penalty) + '</div>' +
        '<div id="err" class="error"></div><button class="btn">บันทึก</button><p class="hint" style="margin-top:8px">ราคามีผลกับคำสั่งใหม่ คำสั่งเดิมใช้ราคาตอนสั่ง · Point มีผลกับคำสั่งที่สำเร็จหลังบันทึก</p></form>', { back: true, nav: 'profile' });
      $('prf').addEventListener('submit', function (e) {
        e.preventDefault(); var F = this, b = F.querySelector('.btn'); b.disabled = true; showError('err', '');
        var v = function (k) { return Number(F[k].value); };
        call('set_pricing', { normal: v('normal'), urgent: v('urgent'), dist: [v('d0'), v('d1'), v('d2')], extra: v('extra'), pt_normal: v('pt_normal'), pt_urgent: v('pt_urgent'), per_baht: v('per_baht'), comp: v('comp'), penalty: v('penalty') })
          .then(function (r) { applyPricingClient(r.pricing); b.disabled = false; b.textContent = 'บันทึกแล้ว'; setTimeout(function () { b.textContent = 'บันทึก'; }, 1800); })
          .catch(function (err) { b.disabled = false; if (!handleAuthError(err)) showError('err', err.message); });
      });
    }).catch(function (e) { handleAuthError(e); });
  }
  // ใช้ราคาที่แอดมินตั้งกับหน้าเว็บ (ตอนขึ้น Google Sheet หน้าเว็บกับเซิร์ฟเวอร์แยกกัน)
  function applyPricingClient(p) {
    if (!p) return;
    CONFIG.PRICE.BASE.normal = p.normal; CONFIG.PRICE.BASE.urgent = p.urgent; CONFIG.PRICE.DIST = p.dist.slice();
    for (var k in CONFIG.PRICE.ITEM_EXTRA) CONFIG.PRICE.ITEM_EXTRA[k] = p.extra;
    CONFIG.POINTS.BASE.normal = p.pt_normal; CONFIG.POINTS.BASE.urgent = p.pt_urgent; CONFIG.POINT_USE.PER_BAHT = p.per_baht;
    CONFIG.LATE.COMP_POINTS = p.comp; CONFIG.REFUSE.PENALTY = p.penalty;
  }
  function viewAdminHome() {
    var tab = state.homeTab = state.homeTab === 'bot' ? 'bot' : 'overview';
    var seg = '<div class="segtabs"><button type="button" data-htab="overview" class="' + (tab === 'overview' ? 'on' : '') + '">ภาพรวม</button><button type="button" data-htab="bot" class="' + (tab === 'bot' ? 'on' : '') + '">ผู้ช่วย AI (น้องถึง)</button></div>';
    function bindSeg() { app.querySelectorAll('[data-htab]').forEach(function (b) { b.addEventListener('click', function () { state.homeTab = b.getAttribute('data-htab'); viewAdminHome(); }); }); }
    if (tab === 'bot') { // แยกหน้าผู้ช่วย AI ออกจากภาพรวม
      app.innerHTML = shell('ภาพรวม', seg + '<div id="botstats"><p class="empty">กำลังโหลด…</p></div>');
      bindSeg(); loadBotStats(); return;
    }
    call('admin_overview').then(function (d) {
      me = d.me;
      function stat(n, label) { return '<div class="stat"><b>' + n + '</b><span>' + label + '</span></div>'; }
      var C = d.counts;
      app.innerHTML = shell('ภาพรวม',
        seg + mixChart(d.mix) + '<h2>วันนี้</h2><div class="stats">' + stat(d.today_orders, 'คำสั่งใหม่') + stat(d.today_done, 'ส่งสำเร็จ') + stat(baht(d.revenue_today), 'รายรับ (สำเร็จ)') + stat(d.overdue, 'เลยกำหนด') + '</div>' +
        '<h2>สถานะคำสั่ง</h2><div class="stats">' + stat(C.pending, 'รอยืนยัน') + stat(C.confirmed, 'รอรับของ') + stat(C.picked + C.delivering, 'กำลังส่ง') + stat(C.delivered, 'สำเร็จทั้งหมด') + '</div>' +
        cashBox(d.cash) +
        (d.pending_slow ? '<div class="card lateban red" style="margin-top:12px">' + icon('warn') + '<span><b>งานด่วนรอยืนยันเกิน ' + CONFIG.LATE.PENDING_WARN_MIN + ' นาที ' + d.pending_slow + ' รายการ</b>ไปที่หน้าคำสั่ง แท็บรอยืนยัน</span></div>' : '') +
        '<h2>คุณภาพการส่ง</h2><div class="stats">' + stat(d.ontime_pct === null ? '–' : d.ontime_pct + '%', 'ส่งทันกำหนด') + stat(d.late_count, 'ส่งช้าเกิน ' + CONFIG.LATE.GRACE_MIN + ' นาที') +
          stat(d.failed, 'ส่งไม่สำเร็จ') + stat(d.fail_by.recipient + ' / ' + d.fail_by.sender + ' / ' + d.fail_by.shop, 'สาเหตุ ผู้รับ / ผู้สั่ง / TheungMue') + '</div>' +
        '<h2>รายรับและ Point</h2><div class="stats">' + stat(baht(d.revenue_all), 'รายรับทั้งหมด') + stat(baht(d.sender_revenue) + ' / ' + baht(d.cod_revenue), 'จ่ายตอนฝาก / ปลายทาง') + stat(baht(d.discount_all), 'ส่วนลดจาก Point') + stat(d.points_issued + ' / ' + d.points_used, 'Point ที่ให้ / ที่ใช้') + '</div>' +
        '<h2>ลูกค้าและบริการ</h2><div class="stats">' + stat(d.users, 'ผู้ใช้') + stat(d.by_mode.normal + ' / ' + d.by_mode.urgent, 'คำสั่งปกติ / ด่วน') + '</div>' +
        '<div class="card dlcard"><strong>ดาวน์โหลดรายงาน (CSV)</strong><p class="sub">เปิดได้ใน Excel / Google Sheets</p><div class="btnrow"><button type="button" class="btn ghost small" id="csvjobs">คำสั่งทั้งหมด</button><button type="button" class="btn ghost small" id="csvdays">สรุปรายวัน</button></div></div>');
      bindSeg();
      $('csvjobs').addEventListener('click', function () { exportCsv('jobs'); });
      $('csvdays').addEventListener('click', function () { exportCsv('days'); });
      bindMix();
    }).catch(function (e) { handleAuthError(e); });
    // แผนภูมิวงกลม: คำสั่งวันนี้แยกตามผล (4 ส่วน) · แตะ/ชี้ส่วนไหน ขึ้นรายละเอียดใต้แผนภูมิ
    var MIX = [['done', 'สำเร็จ', 'ok'], ['active', 'กำลังดำเนินการ', 'go'], ['failed', 'ส่งไม่สำเร็จ', 'bad'], ['cancelled', 'ยกเลิก', 'off']];
    function mixChart(m) {
      var v = { done: m.done, active: m.pending + m.confirmed + m.moving, failed: m.failed, cancelled: m.cancelled };
      var tot = v.done + v.active + v.failed + v.cancelled, R = 46, C = 2 * Math.PI * R, off = 0, gap = tot > 1 ? 2 : 0;
      var arcs = tot ? MIX.filter(function (k) { return v[k[0]]; }).map(function (k) {
        var len = v[k[0]] / tot * C, seg = Math.max(0.5, len - gap);
        var d = '<circle class="arc ' + k[2] + '" data-mix="' + k[0] + '" cx="60" cy="60" r="' + R + '" stroke-dasharray="' + seg.toFixed(2) + ' ' + (C - seg).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '"><title>' + k[1] + ' ' + v[k[0]] + '</title></circle>';
        off += len; return d; }).join('') : '';
      var pct = function (n) { return tot ? Math.round(n * 100 / tot) + '%' : ''; };
      state.mixDetail = { done: 'ส่งถึงผู้รับแล้ว', active: 'รอยืนยัน ' + m.pending + ' · รอรับของ ' + m.confirmed + ' · กำลังส่ง ' + m.moving, failed: 'ส่งไม่ถึงผู้รับ ของกลับจุดรับฝาก', cancelled: 'ยกเลิกก่อนส่ง (ผู้สั่ง/แอดมิน/ปลายทางไม่ตอบรับ)' };
      state.mixVals = v; state.mixTot = tot;
      return '<div class="card mixcard"><strong>คำสั่งวันนี้แยกตามผล</strong><div class="mixin">' +
        '<svg class="mix" viewBox="0 0 120 120" role="img" aria-label="คำสั่งวันนี้ ' + tot + ' รายการ"><circle class="track" cx="60" cy="60" r="' + R + '"/><g transform="rotate(-90 60 60)">' + arcs + '</g>' +
        '<text x="60" y="62" class="mixn">' + tot + '</text><text x="60" y="78" class="mixl">คำสั่งวันนี้</text></svg>' +
        (tot ? '<div class="mixlg">' + MIX.map(function (k) { return '<button type="button" data-mix="' + k[0] + '"><i class="' + k[2] + '"></i><span>' + k[1] + '</span><b>' + v[k[0]] + '</b><em>' + pct(v[k[0]]) + '</em></button>'; }).join('') + '</div>'
          : '<p class="mixempty">ยังไม่มีคำสั่งวันนี้<br>แผนภูมิจะขึ้นเมื่อมีคำสั่งแรก</p>') +
        '</div>' + (tot ? '<p class="mixd" id="mixd">แตะแต่ละส่วนเพื่อดูรายละเอียด</p>' : '') + '</div>';
    }
    function bindMix() {
      var box = app.querySelector('.mixcard'); if (!box || !state.mixTot) return;
      function pick(k) {
        box.querySelectorAll('[data-mix]').forEach(function (e) { e.classList.toggle('on', e.getAttribute('data-mix') === k); e.classList.toggle('dim', e.getAttribute('data-mix') !== k); });
        var lab = MIX.filter(function (x) { return x[0] === k; })[0][1], n = state.mixVals[k];
        $('mixd').innerHTML = '<b>' + lab + ' ' + n + ' (' + Math.round(n * 100 / state.mixTot) + '%)</b> · ' + esc(state.mixDetail[k]);
      }
      box.querySelectorAll('[data-mix]').forEach(function (e) {
        e.addEventListener('click', function () { pick(e.getAttribute('data-mix')); });
        e.addEventListener('mouseenter', function () { pick(e.getAttribute('data-mix')); });
      });
    }
    function cashBox(c) {
      return '<h2>เงินสดวันนี้</h2><div class="cashgrid"><div><b>' + baht(c.collected) + '</b><span>เก็บแล้ว (ฝาก ' + baht(c.deposit) + ' · ปลายทาง ' + baht(c.cod) + ')</span></div>' +
        '<div><b>' + baht(c.refund_due) + '</b><span>ต้องคืนผู้สั่ง (ค้าง)</span></div><div><b>' + baht(c.refunded) + '</b><span>คืนแล้ววันนี้</span></div>' +
        '<div><b>' + baht(c.in_hand) + '</b><span>เงินสดที่ควรมีในมือ</span></div>' +
        (c.refund_due ? '<p class="sub">คืนเงินที่ค้างครบแล้วจะเหลือ ' + baht(c.in_hand - c.refund_due) + '</p>' : '') + '</div>';
    }
    function loadBotStats(s) {
      (s ? Promise.resolve(s) : call('bot_stats')).then(function (st) {
        var box = $('botstats');
        if (!box) return;
        box.innerHTML = botStatsHtml(st);
        box.querySelectorAll('[data-reteach]').forEach(function (b) {
          b.addEventListener('click', function () {
            var id = b.getAttribute('data-reteach'), sel = box.querySelector('[data-rsel="' + id + '"]');
            if (!sel.value) { sel.classList.add('invalid'); return; }
            b.disabled = true;
            call('bot_teach', { id: b.getAttribute('data-q'), intent: sel.value, fb: id }).then(function (r) { loadBotStats(r.stats); }).catch(function () { b.disabled = false; });
          });
        });
        box.querySelectorAll('[data-fbdone]').forEach(function (b) {
          b.addEventListener('click', function () { b.disabled = true; call('bot_fb_done', { id: b.getAttribute('data-fbdone') }).then(function (r) { loadBotStats(r.stats); }); });
        });
        box.querySelectorAll('[data-teach]').forEach(function (b) {
          b.addEventListener('click', function () {
            var id = b.getAttribute('data-teach'), sel = box.querySelector('[data-tsel="' + id + '"]');
            if (!sel.value) { sel.classList.add('invalid'); return; }
            b.disabled = true;
            call('bot_teach', { id: id, intent: sel.value }).then(function (r) { loadBotStats(r.stats); }).catch(function () { b.disabled = false; });
          });
        });
      }).catch(function () {});
    }
  }

  // ===================== รายละเอียดคำสั่ง (ผู้สั่ง / ผู้รับ / ร้าน) =====================
  function isCod(j) { return j.pay_method === 'cod'; }
  function priceTable(j) {
    var rows = [['ค่าบริการ' + ((CONFIG.MODES[j.mode] || {}).label ? 'ส่ง' + CONFIG.MODES[j.mode].label : ''), j.price_base]];
    if (Number(j.price_dist)) rows.push(['ตามระยะ', j.price_dist]);
    if (Number(j.price_item)) rows.push(['ประเภทของ (' + j.item_type + ')', j.price_item]);
    var cod = isCod(j), waiting = cod && j.cod_status === 'waiting';
    var payNote = j.paid_at ? icon('check') + 'ชำระแล้ว ' + fmtTime(j.paid_at) + (cod ? ' (เก็บจากผู้รับ)' : '')
      : j.status === 'cancelled' ? 'ไม่มีการเก็บเงิน'
      : cod ? 'ผู้รับชำระเงินสดตอนได้รับของ' : 'ชำระเงินสดตอนไรเดอร์รับของที่จุดรับฝาก';
    return '<div class="sum3">' + rows.map(function (r) { return '<div><span>' + esc(r[0]) + '</span>' + baht(r[1]) + '</div>'; }).join('') +
      (Number(j.discount) ? '<div><span>ส่วนลดจาก ' + j.points_used + ' Point' + (cod ? ' ของผู้รับ' : '') + '</span>−' + baht(j.discount) + '</div>'
        : waiting ? '<div><span>ส่วนลดจาก Point ของผู้รับ</span><span class="muted">รอผู้รับเลือก</span></div>' : '') +
      '<div class="tot"><span>' + (cod ? 'ผู้รับชำระ (เงินสด)' : 'ยอดชำระ (เงินสด)') + '</span><b>' + baht(j.total) + '</b></div>' +
      '<p class="paynote">' + payNote + '</p></div>';
  }
  function codTag(j) { return isCod(j) ? '<span class="codtag">เก็บเงินปลายทาง</span>' : ''; }
  function ban(cls, ic, title, text) { return '<div class="card lateban ' + cls + '">' + icon(ic) + '<span><b>' + title + '</b>' + text + '</span></div>'; }

  function viewJob() {
    var id = state.id, job = null, lastKey = '', photos = [], photosHidden = false;
    var proof = { pickup: [], delivery: [], fail: [] }, evidence = { pickup: [], delivery: [], fail: [] };
    var back = navRoot();
    function phoneLink(label, p) { return p ? '<a class="phone" href="tel:' + esc(p) + '">' + icon('phone') + '<span>' + esc(label) + ' ' + esc(fmtPhone(p)) + '</span></a>' : ''; }
    function main() {
      var isSender = me.id === job.sender_id, isRecipient = me.id === job.recipient_id, admin = me.role === 'admin';
      var m = CONFIG.MODES[job.mode] || {};
      var h = (job.status === 'delivering' ? '<div class="dlvban"><i class="tape"></i><b>' + (job.arrived_at ? 'ไรเดอร์ถึงจุดส่งแล้ว' : 'กำลังนำส่ง') + '</b><span>' +
          (job.arrived_at ? 'รอผู้รับมารับของที่ ' : 'ไรเดอร์กำลังเดินไปที่ ') + esc(zoneName(job.dropoff_zone, job.dropoff_detail)) + '</span></div>' : '') +
        '<div class="card"><div class="row between"><div class="row gap">' + modeTag(job.mode) + '<strong>' + esc(job.item_type) + '</strong></div>' + badge(job.status) + '</div>' +
        '<p style="margin:8px 0 12px">' + esc(job.item_detail) + '</p>' +
        (photos.length ? '<div class="photorow">' + photos.map(function (p, i) { return '<button type="button" class="ph" data-view="' + i + '"><img src="' + p + '" alt="รูปของ ' + (i + 1) + '"></button>'; }).join('') + '</div>' : '') +
        '<dl class="info">' +
        '<dt>จุดรับ</dt><dd>' + esc(CONFIG.DROP_POINT) + ' · ' + esc(CONFIG.DROP_POINT_PLACE) + '</dd>' +
        '<dt>ส่งถึง</dt><dd>' + esc(zoneFull(job.dropoff_zone, job.dropoff_detail)) + '</dd>' +
        '<dt>ต้องถึงภายใน</dt><dd>' + fmtTime(job.due_at) + (closed(job) ? '' : ' (' + timeLeft(job.due_at) + ')') + (job.overdue_min ? ' <span class="latepill">เลยกำหนด ' + job.overdue_min + ' นาที</span>' : '') + '</dd>' +
        '<dt>แบบการส่ง</dt><dd>' + esc(m.label) + ' — ' + esc(m.hint) + '</dd>' +
        '<dt>ผู้สั่ง</dt><dd>' + esc(job.sender_name) + '</dd>' +
        '<dt>ผู้รับ</dt><dd>' + esc(job.recipient_name) + '</dd>' +
        (job.note ? '<dt>หมายเหตุ</dt><dd>' + esc(job.note) + '</dd>' : '') + '</dl>' +
        (job.status === 'cancelled' ? '' : '<div class="jobroute">' + routeBox(job.dropoff_zone, { open: admin && (job.status === 'picked' || job.status === 'delivering'), nav: admin && (job.status === 'picked' || job.status === 'delivering') }) + '</div>') +
        (admin && (job.sender_phone || job.recipient_phone) ? '<div class="phones">' + phoneLink('ผู้สั่ง', job.sender_phone) + phoneLink('ผู้รับ', job.recipient_phone) + '</div>' : '') +
        '</div>';
      var cod = isCod(job), waitingCod = cod && job.status === 'pending' && job.cod_status === 'waiting';
      // ---- เก็บเงินปลายทาง: แจ้งแต่ละฝ่าย
      if (waitingCod && isSender) h += ban('warn', 'clock', 'รอ ' + esc(job.recipient_name) + ' ยอมรับชำระค่าส่ง', 'เมื่อผู้รับยอมรับ แอดมินจึงยืนยันคำสั่ง ยังไม่ต้องนำของมาฝาก');
      if (isSender && job.status === 'pending' && !waitingCod) h += '<div class="card nextcard"><strong>ขั้นต่อไป: รอแอดมินยืนยัน</strong><p>ยังไม่ต้องนำของมา เมื่อแอดมินยืนยันจะแจ้งให้นำของมาฝาก</p>' +
        '<ol><li>แอดมินยืนยันคำสั่ง</li><li>นำของมาฝากที่จุดรับฝาก' + (cod ? '' : ' + จ่ายเงินสด ' + baht(job.total)) + '</li><li>ไรเดอร์นำส่งถึงมือผู้รับ</li></ol></div>';
      if (isSender && job.status === 'confirmed') h += '<div class="card dropcard"><strong>นำของมาฝากที่จุดรับฝากได้เลย</strong><p>' + esc(CONFIG.DROP_POINT) + ' · ' + esc(CONFIG.DROP_POINT_PLACE) + '</p>' +
        '<p>เปิด ' + BOT.SHOP_HOURS.open + '–' + BOT.SHOP_HOURS.close + ' น. · ' + (cod ? 'ไม่ต้องจ่าย ผู้รับจ่ายตอนได้รับของ' : 'เตรียมเงินสด <b>' + baht(job.total) + '</b> จ่ายไรเดอร์ตอนฝาก') + '</p>' +
        '<p class="sub">ฝากก่อน ' + BOT.SHOP_HOURS.close + ' น. เพื่อให้ส่งทันกำหนด</p>' +
        '<div class="btnrow"><a class="btn ghost small" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=' + CONFIG.DROP_POINT_LL.join(',') + '">ดูเส้นทาง</a><a href="#" class="btn ghost small" data-chat="' + esc(job.id) + '" data-room="sender">แชทกับแอดมิน</a></div></div>';
      if (waitingCod && admin) h += ban('warn', 'clock', 'รอผู้รับยอมรับชำระปลายทาง', 'ยืนยันคำสั่งได้หลังผู้รับกดยอมรับ');
      if (waitingCod && isRecipient) {
        h += '<div class="card paycard" id="codcard"><span class="codtag">เก็บเงินปลายทาง</span><p>' + esc(job.sender_name) + ' ส่งของถึงคุณ และขอให้คุณชำระค่าส่ง</p>' +
          '<div class="amt" id="codamt">' + baht(job.subtotal) + '</div><p class="sub" style="margin:0">ชำระเงินสดกับไรเดอร์ตอนได้รับของ</p>' +
          '<p class="coddue">ตอบภายใน ' + codLeft(job) + ' ชม. ไม่งั้นคำสั่งจะถูกยกเลิกอัตโนมัติ</p>' +
          '<div class="sum3" style="text-align:left;margin-top:10px"><div><span>ค่าบริการ + ระยะ</span>' + baht(job.subtotal) + '</div>' +
          '<label class="ptuse" id="codpts"></label></div>' +
          '<button class="btn" id="codok">ยอมรับชำระ</button><button class="btn danger" data-do="cod_decline" data-confirm="กดอีกครั้งเพื่อยืนยันปฏิเสธ (คำสั่งจะถูกยกเลิก)">ปฏิเสธ ไม่ชำระ</button>' +
          '<p class="hint" style="margin:8px 0 0">ถ้าคำสั่งสำเร็จ คุณได้ Point เพราะคุณเป็นคนจ่าย · ปฏิเสธตอนนี้ไม่มีผลกับ Point ของคุณ</p></div>';
      }
      if (cod && isRecipient && job.cod_status === 'accepted' && !closed(job)) {
        h += '<div class="card payline">' + icon('coin') + '<span><b>ต้องชำระ ' + baht(job.total) + ' เงินสดเมื่อรับของ</b>' + (Number(job.points_used) ? 'ใช้ ' + job.points_used + ' Point ของคุณลดไป ' + baht(job.discount) : 'เก็บเงินปลายทาง') + '</span>' +
          ((job.status === 'pending' || job.status === 'confirmed') ? '<button class="linkbtn" data-do="cod_withdraw" data-confirm="กดอีกครั้งเพื่อถอนการยอมรับ (คำสั่งจะถูกยกเลิก)">ถอนการยอมรับ</button>' : '') + '</div>';
      }
      // ---- ส่งช้า
      if (job.status === 'delivered' && Number(job.late_min) > 0) {
        var payerMe = job.payer === me.id;
        h += job.late_excused ? ban('info', 'info', 'ส่งหลังกำหนด ' + job.late_min + ' นาที · ไม่นับว่าส่งช้า', 'ไรเดอร์ถึงจุดส่งก่อนกำหนดแล้ว (' + fmtClock(job.arrived_at) + ') แต่ผู้รับไม่อยู่')
          : Number(job.late_min) <= CONFIG.LATE.GRACE_MIN ? ban('warn', 'clock', 'ส่งช้า ' + job.late_min + ' นาที', 'ช้าไม่เกิน ' + CONFIG.LATE.GRACE_MIN + ' นาที ไม่มีการชดเชย')
          : ban('red', 'gift', 'ส่งช้า ' + job.late_min + ' นาที', payerMe ? 'ขออภัยที่ส่งช้า คุณได้รับ Point ชดเชย +' + job.comp_points + ' แล้ว' : 'ชดเชย ' + job.comp_points + ' Point ให้คนที่จ่ายแล้ว');
      }
      if (isSender || admin || (cod && isRecipient && !waitingCod)) h += '<div class="card"><strong>สรุปค่าบริการ</strong>' + priceTable(job) + '</div>';
      if (isRecipient && job.code && job.status === 'delivering') {
        h += '<div class="card codecard"><strong>รหัสรับของของคุณ</strong><div class="code">' + esc(job.code) +
          '</div><p class="sub" style="text-align:center;margin:0">บอกรหัสนี้กับไรเดอร์เมื่อได้รับของแล้วเท่านั้น</p></div>';
      }
      if (job.status === 'cancelled') {
        var why = { sender: 'ผู้สั่งยกเลิกคำสั่ง', rejected: 'แอดมินปฏิเสธคำสั่ง', admin: 'แอดมินยกเลิกคำสั่ง', cod_declined: 'ผู้รับปฏิเสธชำระปลายทาง', cod_withdrawn: 'ผู้รับถอนการยอมรับชำระ', cod_expired: 'ผู้รับไม่ตอบรับเก็บเงินปลายทางภายใน 24 ชม.',
          failed: 'ส่งไม่สำเร็จ' }[job.cancel_reason] || 'ยกเลิกแล้ว';
        if (job.cancel_reason === 'failed') {
          var FR = CONFIG.FAIL_REASONS[job.fail_reason] || {};
          h += '<div class="card failcard"><strong>' + (FR.by === 'recipient' ? 'ผู้รับไม่รับของ' : 'ส่งไม่สำเร็จ') + '</strong><dl class="info">' +
            '<dt>เหตุผล</dt><dd>' + esc(FR.label || job.fail_reason) + '</dd>' + (job.fail_note ? '<dt>รายละเอียด</dt><dd>' + esc(job.fail_note) + '</dd>' : '') +
            '<dt>สาเหตุจาก</dt><dd>' + esc(CONFIG.FAULT_LABEL[job.fail_fault] || '–') + '</dd>' +
            (job.penalty_user ? '<dt>บทลงโทษ</dt><dd>' + (job.appeal_result === 'revoked' ? 'ยกเลิกแล้ว (คืน Point)' : Number(job.penalty_points) ? 'หัก ' + job.penalty_points + ' Point ผู้รับ' : 'นับการปฏิเสธ 1 ครั้ง (ไม่มี Point ให้หัก)') + '</dd>' : '') + '</dl>' +
            (evidence.fail && evidence.fail.length ? '<div class="photorow small">' + evidence.fail.map(function (p, k) { return '<button type="button" class="ph" data-view="fail:' + k + '"><img src="' + p + '" alt="รูปหลักฐาน ' + (k + 1) + '"></button>'; }).join('') + '</div>' : '') + '</div>';
          if (me.id === job.penalty_user && job.fail_fault === 'recipient') {
            h += job.appeal_result ? ban(job.appeal_result === 'revoked' ? 'info' : 'warn', 'info', job.appeal_result === 'revoked' ? 'แอดมินยกเลิกบทลงโทษแล้ว' : 'แอดมินตรวจคำโต้แย้งแล้ว คงบทลงโทษเดิม', 'ตรวจเมื่อ ' + fmtTime(job.appeal_done_at))
              : job.appeal_at ? ban('info', 'clock', 'ยื่นโต้แย้งแล้ว รอแอดมินตรวจ', '"' + esc(job.appeal_text) + '"')
              : '<form class="card" id="appealf"><strong>ไม่เห็นด้วยกับเหตุผลนี้?</strong><p class="sub" style="margin:4px 0 8px">เขียนสิ่งที่เกิดขึ้นจริง แอดมินจะตรวจจากรูปและเวลาที่บันทึกไว้</p>' +
                '<label class="field"><span>เหตุผลที่โต้แย้ง<b class="req">*</b></span><textarea name="note" maxlength="500" required placeholder="เช่น ของที่มาไม่ใช่ชีทที่ตกลงไว้"></textarea></label><button class="btn ghost">ยื่นโต้แย้ง</button></form>';
          }
          if (admin && job.appeal_at && !job.appeal_result) {
            h += '<div class="card appealcard"><strong>คำโต้แย้งจาก ' + esc(job.recipient_name) + '</strong><p>"' + esc(job.appeal_text) + '"</p><p class="sub">ยื่นเมื่อ ' + fmtTime(job.appeal_at) + ' · ตรวจกับรูปและไทม์ไลน์ด้านล่าง</p>' +
              '<div class="btnrow"><button class="btn ghost" data-do="appeal_kept">คงบทลงโทษ</button><button class="btn" data-do="appeal_revoked" data-confirm="กดอีกครั้งเพื่อยกเลิกบทลงโทษ">ยกเลิกบทลงโทษ</button></div></div>';
          }
        }
        h += '<div class="card returncard' + (job.returned_at ? ' done' : '') + '"><strong>' + why + '</strong>' +
          (job.cancel_note ? '<p class="nfnote"><b>เหตุผล:</b> ' + esc(job.cancel_note) + '</p>' : '') +
          (Number(job.points_used) ? '<p>คืน ' + job.points_used + ' Point ให้' + (job.payer === job.recipient_id ? 'ผู้รับ' : 'ผู้สั่ง') + 'แล้ว</p>' : '') +
          (cod && isSender ? '<p>คุณไม่ต้องจ่ายค่าส่ง</p>' : '') +
          (admin && job.todo && job.todo.refund ? '<div class="refundbox"><b>คืนเงินค่าส่ง ' + baht(job.refund_amount) + ' ให้ผู้สั่ง</b><span>ยังไม่ได้คืน</span><button type="button" class="btn small" data-do="refunded" data-confirm="กดอีกครั้งเพื่อยืนยันว่าคืนเงินแล้ว">คืนเงิน ' + baht(job.refund_amount) + ' แล้ว</button></div>' :
          Number(job.refund_amount) && (isSender || admin) ? '<p class="refund"><b>' + (job.refunded_at ? 'คืนเงินค่าส่ง ' + baht(job.refund_amount) + ' แล้ว' : 'คืนเงินค่าส่ง ' + baht(job.refund_amount) + (job.disposed_at ? (isSender ? ' · ติดต่อแอดมินเพื่อรับเงินคืน' : '') : isSender ? ' ให้คุณตอนมารับของคืนที่จุดรับฝาก' : ' ให้ผู้สั่งตอนมารับของคืน')) + '</b>' +
            (job.refunded_at ? '' : '<span>' + (job.cancel_reason === 'failed' ? 'ส่งไม่สำเร็จเพราะ ' + esc(CONFIG.APP_NAME) : 'แอดมินยกเลิกหลังรับของและเก็บเงินแล้ว') + ' จึงคืนค่าส่งเต็มจำนวน</span>') + '</p>' : '') +
          (job.picked_at ? '<p>' + (job.disposed_at ? 'ไม่มีผู้มารับของคืนตามกำหนด แอดมินจัดการของแล้ว ' + fmtTime(job.disposed_at) + (Number(job.refund_amount) && !job.refunded_at && isSender ? ' · ติดต่อแอดมินเพื่อรับเงินคืน' : '') : job.returned_at ? 'ผู้สั่งรับของคืนแล้ว ' + fmtTime(job.returned_at)
              : (isSender ? 'กรุณามารับของคืนที่จุดรับฝาก' : 'ของอยู่ที่จุดรับฝาก รอผู้สั่งมารับคืน') + ' · เก็บไว้ถึง ' + fmtDate(job.keep_until || new Date(new Date(job.cancelled_at).getTime() + CONFIG.REFUSE.HOLD_DAYS * 86400000).toISOString())) + '</p>' +
            (admin && job.todo && job.todo.ret ? '<p class="' + (job.todo.overdue ? 'overdue' : 'sub') + '">' + (job.todo.overdue ? 'เกินกำหนดรับคืนแล้ว' : 'เหลือ ' + job.todo.days_left + ' วัน') + (job.remind_at ? ' · แจ้งผู้สั่งล่าสุด ' + fmtTime(job.remind_at) : '') + '</p>' +
              '<div class="btnrow"><button type="button" class="btn ghost small" data-do="remind_return">แจ้งผู้สั่งอีกครั้ง</button><button type="button" class="btn ghost small" data-do="extend_keep">ขยาย ' + CONFIG.REFUSE.HOLD_DAYS + ' วัน</button></div>' +
              '<details class="dispose"><summary>บันทึกว่าจัดการของแล้ว (ไม่มีคนมารับ)</summary><form id="dispf"><label class="field"><span>จัดการอย่างไร<b class="req">*</b></span><input type="text" name="note" maxlength="300" required placeholder="เช่น ส่งคืนสำนักงานคณะ / ทิ้งตามระเบียบ"></label><button class="btn danger">บันทึก</button></form></details>' : '') +
            (job.disposed_at && admin ? '<p class="sub">วิธีจัดการ: ' + esc(job.dispose_note) + '</p>' : '') +
            ((isSender || admin) && !job.returned_at && !job.disposed_at ? '<button class="btn" data-do="returned">' + (Number(job.refund_amount) ? (isSender ? 'ได้รับของและเงินคืนแล้ว' : 'คืนของและเงินให้ผู้สั่งแล้ว') : 'ยืนยันรับของคืนแล้ว') + '</button>' : '') : '') + '</div>';
      }
      if (job.status === 'delivered' && job.payer === me.id && Number(job.points_earned)) h += '<div class="pointhint got">' + icon('gift') + '<span>คำสั่งนี้สำเร็จ คุณได้รับ <b>' + job.points_earned + ' Point</b>' + (cod ? ' เพราะคุณเป็นคนจ่าย' : '') + '</span></div>';
      h += '<div id="err" class="error"></div><div class="stack" style="margin-top:12px">';
      // ---- ปุ่มของผู้สั่ง
      if (isSender && (job.status === 'pending' || job.status === 'confirmed')) h += '<button class="btn danger" data-do="cancel" data-confirm="กดอีกครั้งเพื่อยืนยันยกเลิกคำสั่ง">ยกเลิกคำสั่ง</button>';
      if (isRecipient && job.status === 'delivering') {
        var penaltyNote = cod && !job.free_refuse;
        h += '<a href="#" class="btn ghost" data-chat="' + esc(job.id) + '" data-room="recipient">ขอเลื่อนเวลา / เปลี่ยนจุดส่ง (แชทกับแอดมิน)</a>' +
          '<details class="refuse"><summary class="btn danger">ไม่รับของ</summary><form id="refusef"><b>ไม่รับของเพราะอะไร</b><p class="sub" style="margin:2px 0 6px">ไรเดอร์ออกนำส่งแล้ว' + (cod ? ' เหตุผลมีผลต่อ Point ของคุณ' : '') + '</p>' +
          Object.keys(CONFIG.FAIL_REASONS).filter(function (k) { var r = CONFIG.FAIL_REASONS[k]; return (r.by === 'recipient' || r.by === 'both') && (k !== 'cannot_pay' || cod) && (k !== 'late' || job.free_refuse || (!cod && job.overdue_min > CONFIG.LATE.COD_FREE_MIN)); }).map(function (k) {
            var r = CONFIG.FAIL_REASONS[k], bad = r.fault === 'recipient' && cod;
            return '<label class="rsn"><input type="radio" name="reason" value="' + k + '"><i></i><span>' + esc(r.label) + '</span><small class="' + (bad ? 'bad' : 'ok') + '">' + (bad ? 'หัก ' + CONFIG.REFUSE.PENALTY + ' Point' : 'ไม่หัก Point') + '</small></label>';
          }).join('') +
          (penaltyNote ? '<div class="minib warn">' + icon('warn') + 'ถ้าแค่ไม่อยู่ตอนนี้ ใช้ "ขอเลื่อนเวลา" แทน จะไม่ถูกหัก Point</div>' : '') +
          '<label class="field" style="margin-top:8px"><span>รายละเอียด <em>(ไม่บังคับ)</em></span><input type="text" name="note" maxlength="300"></label>' +
          '<button class="btn danger solid">ยืนยันไม่รับของ</button></form></details>';
      }
      // ---- ขั้นตอนของร้าน
      if (admin) {
        if (job.status === 'pending') {
          h += '<div class="card astep"><b>คำสั่งใหม่</b><p class="sub">ตรวจรายละเอียดและรูปของ แล้วยืนยันคำสั่ง ลูกค้าจะเห็นสถานะ "รอรับของ"</p><button class="btn" data-do="confirm"' + (waitingCod ? ' disabled' : '') + '>' + (waitingCod ? 'รอผู้รับยอมรับชำระก่อน' : 'ยืนยันคำสั่ง') + '</button>' +
            '<form id="rejf" class="rejf"><label class="field"><span>เหตุผลที่ปฏิเสธ<b class="req">*</b></span><input type="text" name="note" maxlength="300" required placeholder="เช่น ของมีขนาดใหญ่เกินกว่าที่รับส่งได้"></label><button class="btn danger">ปฏิเสธคำสั่ง</button></form></div>';
        }
        if (job.status === 'confirmed') {
          h += '<form class="card astep" id="pickupf"><b>รับของที่จุดรับฝาก</b><p class="sub">ตรวจของให้ตรงกับรูป' + (cod ? ' (ไม่ต้องเก็บเงินผู้สั่ง เก็บเงินปลายทาง ' + baht(job.total) + ')' : ' เก็บเงินสด ' + baht(job.total)) + ' แล้วถ่ายรูปของตอนรับ</p>' +
            proofField('pk', 'รูปตอนรับของ', 'อย่างน้อย ' + CONFIG.PROOF_MIN + ' รูป มากสุด ' + CONFIG.PROOF_MAX + ' รูป') +
            '<button class="btn">' + (cod ? 'รับของแล้ว (เก็บเงินปลายทาง ' + baht(job.total) + ')' : 'รับของและเก็บเงิน ' + baht(job.total) + ' แล้ว') + '</button></form>';
        }
        if (job.status === 'picked') h += '<div class="card astep"><b>ออกนำส่ง</b><p class="sub">กดเมื่อถือของออกจากจุดรับฝาก ลูกค้าจะเห็นสถานะ "กำลังนำส่ง"</p><button class="btn" data-do="start">เริ่มนำส่ง</button></div>';
        if (job.status === 'delivering') {
          var rf = job.recipient_refusals || {}, R = CONFIG.REFUSE, cl = job.contacts || [];
          if (rf.total) h += ban('warn', 'warn', 'ผู้รับคนนี้เคยปฏิเสธรับของ ' + rf.total + ' ครั้ง', 'แนะนำให้โทรยืนยันก่อนเดินไปส่ง');
          if (!job.arrived_at) h += '<div class="card astep"><b>ถึงจุดส่งแล้ว?</b><p class="sub">กดเมื่อไปถึงจุดส่ง ระบบใช้เวลานี้เป็นหลักฐาน (ถึงก่อนกำหนดแต่ผู้รับไม่อยู่ จะไม่นับว่าส่งช้า)</p><button class="btn ghost" data-do="arrive">ถึงจุดส่งแล้ว</button></div>';
          else {
            var calls = cl.filter(function (c) { return c.k === 'call'; }), chats = cl.filter(function (c) { return c.k === 'chat'; });
            var waited = Math.floor((Date.now() - new Date(job.arrived_at).getTime()) / 60000);
            var nextCall = calls.length ? new Date(new Date(calls[calls.length - 1].t).getTime() + R.CALL_GAP_MIN * 60000) : null;
            h += '<div class="card astep"><b>ถึงจุดส่ง ' + fmtClock(job.arrived_at) + ' · รอแล้ว ' + waited + ' นาที</b><p class="sub">ถ้าไม่พบผู้รับ บันทึกการติดต่อให้ครบก่อน: โทร ' + R.CALLS + ' ครั้ง (ห่างกัน ' + R.CALL_GAP_MIN + ' นาที) แชท 1 ครั้ง และรอ ' + R.WAIT_MIN + ' นาที</p>' +
              '<div class="clog">' + cl.map(function (c) { return '<div><span>' + (c.k === 'call' ? 'โทรหาผู้รับ ไม่รับสาย' : 'ส่งแชทแจ้งถึงจุดส่ง') + '</span><b>' + fmtClock(c.t) + '</b></div>'; }).join('') +
              (cl.length ? '' : '<div class="muted">ยังไม่มีการบันทึก</div>') + '</div>' +
              '<div class="btnrow"><button class="btn ghost small" data-do="contact_call"' + (nextCall && nextCall > new Date() ? ' disabled' : '') + '>' + (nextCall && nextCall > new Date() ? 'โทรได้อีกครั้ง ' + fmtClock(nextCall.toISOString()) : 'บันทึก: โทรแล้วไม่รับสาย') + '</button>' +
              '<button class="btn ghost small" data-do="contact_chat"' + (chats.length ? ' disabled' : '') + '>' + (chats.length ? 'ส่งแชทแล้ว' : 'ส่งแชทแจ้งถึงแล้ว') + '</button></div></div>';
          }
          var lockLeft = job.code_lock_until ? new Date(job.code_lock_until).getTime() - Date.now() : 0;
          h += '<form class="card astep" id="deliver"><b>ส่งถึงมือผู้รับ</b>' +
            proofField('dv', 'รูปตอนส่งถึงผู้รับ', 'ถ่ายให้เห็นของตอนส่งมอบ อย่างน้อย ' + CONFIG.PROOF_MIN + ' รูป') +
            (lockLeft > 0 ? '<div class="lockbox">' + icon('lock') + '<span><b>ล็อกการใส่รหัสอีกประมาณ ' + Math.ceil(lockLeft / 60000) + ' นาที</b>ใส่รหัสผิดครบ ' + CONFIG.CODE_MAX_TRIES + ' ครั้ง ติดต่อผู้รับเพื่อตรวจรหัสอีกครั้ง</span></div>'
              : '<label class="field" style="margin-bottom:10px"><span>รหัสรับของจากผู้รับ<b class="req" aria-hidden="true">*</b></span><input class="code-input" id="code" inputmode="numeric" minlength="4" maxlength="4" placeholder="0000" required autocomplete="off">' +
                (Number(job.code_fails) > 0 ? '<small class="codeleft">ใส่ผิดแล้ว ' + job.code_fails + ' ครั้ง · เหลืออีก ' + (CONFIG.CODE_MAX_TRIES - Number(job.code_fails)) + ' ครั้ง</small>' : '') + '</label>') +
            (cod ? '<label class="codchk"><input type="checkbox" id="codcol"><span>เก็บเงินสด <b>' + baht(job.total) + '</b> จากผู้รับแล้ว</span></label>' : '') +
            '<button class="btn"' + (lockLeft > 0 ? ' disabled' : '') + '>ยืนยันส่งถึงมือผู้รับ</button></form>';
          // ---- ส่งไม่สำเร็จ
          h += '<details class="acancel failbox"><summary>ส่งไม่สำเร็จ</summary><form id="failf"><b>ส่งไม่สำเร็จเพราะอะไร</b>' +
            ['recipient', 'item', 'sender', 'shop'].map(function (g) {
              var keys = Object.keys(CONFIG.FAIL_REASONS).filter(function (k) { var r = CONFIG.FAIL_REASONS[k]; return r.by !== 'recipient' && (g === 'item' ? r.verdict : r.fault === g && !r.verdict); });
              var head = { recipient: ['ผู้รับ', cod ? 'หัก Point ผู้รับ' : 'บันทึกที่ผู้รับ', 'bad'], item: ['ของมีปัญหา', 'เทียบรูป 3 ช่วง', 'ok'], sender: ['ผู้สั่ง', 'บันทึกที่ผู้สั่ง', 'snd'], shop: ['TheungMue', 'ไม่หักใคร', 'shop'] }[g];
              return '<div class="grp">' + head[0] + ' <em class="g-' + head[2] + '">' + head[1] + '</em></div>' + keys.map(function (k) {
                return '<label class="rsn"><input type="radio" name="reason" value="' + k + '"><i></i><span>' + esc(CONFIG.FAIL_REASONS[k].label) + '</span>' + (k === 'not_found' ? '<small>ต้องติดต่อครบก่อน</small>' : '') + '</label>';
              }).join('');
            }).join('') +
            '<div id="verdict" hidden><div class="cmp3">' + [['ผู้สั่งแนบ', photos[0]], ['ไรเดอร์รับของ', (evidence.pickup || [])[0]], ['ตอนนี้', null]].map(function (c) {
              return '<div>' + (c[1] ? '<img src="' + c[1] + '" alt="">' : '<span class="ph0">ถ่ายด้านล่าง</span>') + '<small>' + c[0] + '</small></div>'; }).join('') + '</div>' +
            '<p class="sub" style="margin:6px 0">ไม่ตรงตั้งแต่ตอนไรเดอร์รับ = ผู้สั่ง · ตอนรับยังดีแต่เสียหายตอนส่ง = TheungMue · รูปตรงกันทุกช่วง = ผู้รับ</p>' +
            '<div class="verdict">' + ['sender', 'shop', 'recipient'].map(function (f) { return '<label><input type="radio" name="verdict" value="' + f + '"><span>' + CONFIG.FAULT_LABEL[f] + '</span></label>'; }).join('') + '</div></div>' +
            '<label class="field" style="margin-top:8px"><span>รายละเอียด</span><input type="text" name="note" maxlength="300" placeholder="สิ่งที่เกิดขึ้น"></label>' +
            proofField('fl', 'รูปหลักฐาน', 'ถ่ายของหรือจุดส่งตอนนี้ อย่างน้อย 1 รูป') +
            '<button class="btn danger solid">บันทึกส่งไม่สำเร็จ และนำของกลับจุดรับฝาก</button></form></details>';
        }
        if (!closed(job) && job.status !== 'pending' && job.status !== 'delivering') {
          var paidNow = job.picked_at && !cod && Number(job.total) > 0;
          h += '<details class="acancel"><summary>ยกเลิกคำสั่งนี้</summary><form id="acf">' +
            (job.picked_at ? '<div class="minib bad">' + icon('warn') + '<span>ไรเดอร์รับของ' + (paidNow ? 'และเก็บเงินแล้ว' : 'แล้ว') + ' ยกเลิกตอนนี้ระบบจะ' + (paidNow ? 'คืนเงิน ' + baht(job.total) + ' ให้ผู้สั่งตอนมารับของคืน · ' : '') + 'คืน Point ที่ใช้ไป · แจ้งผู้สั่งให้มารับของคืน</span></div>' : '<div class="minib info">' + icon('info') + '<span>ระบบจะแจ้งผู้สั่งพร้อมเหตุผล</span></div>') +
            '<label class="field"><span>เหตุผล<b class="req">*</b></span><input type="text" name="note" maxlength="300" required placeholder="เช่น ลูกค้าขอยกเลิกทางแชท (ผู้สั่งเห็น)"></label>' +
            '<button class="btn danger">' + (paidNow ? 'ยืนยันยกเลิกและคืนเงิน' : 'ยืนยันยกเลิกคำสั่ง') + '</button></form></details>';
        }
      }
      h += '</div>';
      // ---- ไทม์ไลน์
      var steps = [[cod ? 'สั่งบริการ · เก็บเงินปลายทาง' : 'สั่งบริการ · ' + baht(job.total) + (Number(job.points_used) ? ' (ใช้ ' + job.points_used + ' Point)' : ''), job.created_at]];
      if (cod && (job.cod_status === 'accepted' || job.status !== 'cancelled')) steps.push(['ผู้รับยอมรับชำระ' + (job.cod_status === 'accepted' ? ' ' + baht(job.total) : ''), job.cod_status === 'accepted' ? job.cod_at : '']);
      if (job.status === 'cancelled') {
        if (job.confirmed_at) steps.push(['แอดมินยืนยันคำสั่ง', job.confirmed_at]);
        if (job.picked_at) steps.push(['ไรเดอร์รับของที่จุดรับฝาก', job.picked_at, 'pickup']);
        if (job.delivering_at) steps.push(['กำลังนำส่ง', job.delivering_at]);
        if (job.arrived_at) steps.push(['ถึงจุดส่ง', job.arrived_at]);
        steps.push([{ rejected: 'แอดมินปฏิเสธคำสั่ง', admin: 'แอดมินยกเลิกคำสั่ง', cod_declined: 'ผู้รับปฏิเสธชำระ', cod_withdrawn: 'ผู้รับถอนการยอมรับ', cod_expired: 'ยกเลิกอัตโนมัติ: ผู้รับไม่ตอบรับใน 24 ชม.', failed: 'ส่งไม่สำเร็จ' }[job.cancel_reason] || 'ยกเลิกคำสั่ง', job.cancelled_at]);
      } else {
        steps = steps.concat([['แอดมินยืนยันคำสั่ง', job.confirmed_at], [cod ? 'ไรเดอร์รับของที่จุดรับฝาก' : 'ไรเดอร์รับของที่จุดรับฝาก · ชำระเงินแล้ว', job.picked_at, 'pickup'], ['กำลังนำส่ง', job.delivering_at]]
          .concat(job.arrived_at ? [['ถึงจุดส่ง', job.arrived_at]] : []).concat([[cod ? 'ส่งถึงมือ · เก็บเงิน ' + baht(job.total) : 'ส่งถึงมือผู้รับ', job.delivered_at, 'delivery']]));
      }
      var cur = steps.filter(function (s) { return s[1]; }).length - 1;
      h += '<h2>สถานะคำสั่ง</h2><ol class="tl">' + steps.map(function (s, i) {
        var ev = s[2] ? evidence[s[2]] : [];
        return '<li class="' + (i === cur && !closed(job) ? 'on' : s[1] ? 'done' : '') + '"><b>' + esc(s[0]) + '</b>' + (s[1] ? '<small>' + fmtTime(s[1]) + '</small>' : '<small>รอดำเนินการ</small>') +
          (ev.length ? '<div class="photorow small">' + ev.map(function (p, k) { return '<button type="button" class="ph" data-view="' + s[2] + ':' + k + '"><img src="' + p + '" alt="รูปหลักฐาน ' + (k + 1) + '"></button>'; }).join('') + '</div>' : '') + '</li>';
      }).join('') + '</ol>';
      $('main').innerHTML = h;
      mountMaps();
      if ($('pickupf')) {
        bindPicker($('pkgrid'), $('pkin'), proof.pickup, CONFIG.PROOF_MAX, 'ถ่ายรูปของ');
        $('pickupf').addEventListener('submit', function (e) { e.preventDefault(); doAct('pickup', null, proof.pickup); });
      }
      if ($('deliver')) {
        bindPicker($('dvgrid'), $('dvin'), proof.delivery, CONFIG.PROOF_MAX, 'ถ่ายรูปตอนส่ง');
        $('deliver').addEventListener('submit', function (e) { e.preventDefault(); doAct('deliver', $('code') ? $('code').value.replace(/\D/g, '') : '', proof.delivery, $('codcol') && $('codcol').checked ? 'cod_collected' : ''); });
      }
      if ($('rejf')) $('rejf').addEventListener('submit', function (e) { e.preventDefault(); doAct('reject', null, null, this.note.value.trim()); });
      if ($('codcard')) {
        var cUse = true, cTot = 0;
        var cDraw = function () {
          var sub = Number(job.subtotal), U = CONFIG.POINT_USE, maxD = Math.max(0, Math.min(Math.floor(myBal / U.PER_BAHT), Math.floor(sub * U.MAX_RATIO))), disc = cUse ? maxD : 0;
          cTot = sub - disc;
          $('codpts').className = 'ptuse' + (maxD ? '' : ' off');
          $('codpts').innerHTML = '<span>' + (maxD ? 'ใช้ ' + maxD * U.PER_BAHT + ' Point ของคุณ ลด ' + baht(maxD) : 'Point ของคุณ ' + myBal + (myBal ? ' ยังไม่พอใช้ลด' : '')) + '<small>คุณมี ' + myBal + ' Point · ลดได้ไม่เกินครึ่งหนึ่ง</small></span>' +
            '<input type="checkbox" id="codusepts"' + (cUse && maxD ? ' checked' : '') + (maxD ? '' : ' disabled') + '><i class="tog"></i>';
          $('codamt').textContent = baht(cTot); $('codok').textContent = 'ยอมรับชำระ ' + baht(cTot);
        };
        var myBal = 0; cDraw();
        call('points').then(function (pd) { myBal = pd.balance; cDraw(); }).catch(function () {});
        $('codcard').addEventListener('change', function (e) { if (e.target.id === 'codusepts') { cUse = e.target.checked; cDraw(); } });
        $('codok').addEventListener('click', function () { doAct('cod_accept', cTot, null, cUse ? 'use_points' : ''); });
      }
      if ($('refusef')) $('refusef').addEventListener('submit', function (e) {
        e.preventDefault(); var r = this.reason.value; if (!r) return showError('err', 'เลือกเหตุผลที่ไม่รับของ');
        var b = this.querySelector('.btn'); if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'กดอีกครั้งเพื่อยืนยัน' + (CONFIG.FAIL_REASONS[r].fault === 'recipient' && isCod(job) ? ' (หัก ' + CONFIG.REFUSE.PENALTY + ' Point)' : ''); return; }
        doAct('refuse', r, null, this.note.value.trim());
      });
      if ($('appealf')) $('appealf').addEventListener('submit', function (e) { e.preventDefault(); doAct('appeal', null, null, this.note.value.trim()); });
      if ($('failf')) {
        bindPicker($('flgrid'), $('flin'), proof.fail, CONFIG.PROOF_MAX, 'ถ่ายรูปหลักฐาน');
        $('failf').addEventListener('change', function (e) { if (e.target.name === 'reason') $('verdict').hidden = !CONFIG.FAIL_REASONS[e.target.value].verdict; });
        $('failf').addEventListener('submit', function (e) {
          e.preventDefault(); var f = this, r = f.reason.value;
          if (!r) return showError('err', 'เลือกเหตุผลที่ส่งไม่สำเร็จ');
          doAct('fail', r, { list: proof.fail.slice(), verdict: f.verdict ? f.verdict.value : '' }, f.note.value.trim());
        });
      }
      if ($('acf')) $('acf').addEventListener('submit', function (e) { e.preventDefault(); doAct('cancel', null, null, this.note.value.trim()); });
      if ($('dispf')) $('dispf').addEventListener('submit', function (e) { e.preventDefault(); doAct('dispose', null, null, this.note.value.trim()); });
      loadChatButtons();
    }
    function lockKey(j) { var l = j.code_lock_until ? new Date(j.code_lock_until).getTime() - Date.now() : 0; return l > 0 ? '|L' + Math.ceil(l / 60000) : '|U'; }
    function doAct(action, code, pics, note) {
      if (action === 'contact_call' || action === 'contact_chat') { code = action.slice(8); action = 'contact'; }
      if (action === 'appeal_kept' || action === 'appeal_revoked') { code = action.slice(7); action = 'appeal_decide'; }
      showError('err', '');
      var btns = document.querySelectorAll('#main .btn');
      Array.prototype.forEach.call(btns, function (b) { b.disabled = true; });
      call('act', { id: id, action: action, code: code, photos: pics || [], note: note || '' }).then(function (r) {
        job = r.job; lastKey = ''; main(); window.scrollTo(0, 0);
        if (Array.isArray(pics)) pics.length = 0;
        if (action === 'fail') proof.fail.length = 0;
        if (action === 'deliver' || action === 'refuse' || action === 'fail' || action === 'appeal_decide') checkRewards();
        loadPhotos();
      }).catch(function (e) {
        Array.prototype.forEach.call(btns, function (b) { b.disabled = false; });
        if (action === 'deliver') {
          return call('job', { id: id }).then(function (d) { job = d.job; lastKey = JSON.stringify(job) + lockKey(job); main(); showError('err', e.message); })
            .catch(function () { showError('err', e.message); });
        }
        showError('err', e.message);
      });
    }
    state.doAct = doAct;
    function loadPhotos() {
      call('photos', { id: id }).then(function (r) {
        photos = r.photos; photosHidden = !!r.hidden;
        evidence = { pickup: r.pickup || [], delivery: r.delivery || [], fail: r.fail || [] };
        if (job) main();
      }).catch(function () {});
    }
    function load(first) {
      return call('job', { id: id }).then(function (d) {
        me = d.me; job = d.job;
        var key = JSON.stringify(job) + lockKey(job) + (job.status === 'delivering' && job.arrived_at ? '|' + Math.floor(Date.now() / 60000) : '');
        if (first) {
          app.innerHTML = shell(job.id, '<div id="main"></div><div id="chatwrap"></div>', { back: back, nav: back });
          loadPhotos();
          $('main').addEventListener('click', function (e) {
            var vv = e.target.closest('[data-view]');
            if (!vv) return;
            var k = vv.getAttribute('data-view').split(':');
            if (k.length === 2) openViewer(evidence[k[0]], Number(k[1])); else openViewer(photos, Number(k[0]));
          });
        }
        var busy = (typing() && /^(code|note)$/.test(document.activeElement.id || document.activeElement.name)) || !!document.querySelector('#main details[open]') || (document.activeElement && document.activeElement.type === 'radio');
        if (key !== lastKey && !busy) { lastKey = key; main(); }
      }).catch(function (e) {
        if (handleAuthError(e)) return;
        if (first) app.innerHTML = shell('ไม่พบคำสั่ง', '<div class="error" style="display:block">' + esc(e.message) + '</div>', { back: back, nav: back });
      });
    }
    function loadChatButtons() {
      call('chat_inbox').then(function (d) {
        var el = $('chatwrap');
        if (!el || !job) return;
        var rooms = d.rooms.filter(function (r) { return r.job_id === job.id; });
        if (me.role === 'admin') {
          var have = rooms.map(function (r) { return r.channel; });
          ['sender', 'recipient'].forEach(function (c) { if (have.indexOf(c) < 0) rooms.push({ job_id: job.id, channel: c, with_name: c === 'sender' ? job.sender_name : job.recipient_name, with_role: c === 'sender' ? 'ผู้สั่ง' : 'ผู้รับ', as: 'admin', last_text: '', unread: 0 }); });
        } else if (!rooms.length) rooms.push({ job_id: job.id, channel: me.id === job.sender_id ? 'sender' : 'recipient', with_name: 'แอดมิน ' + CONFIG.APP_NAME, as: 'user', last_text: '', unread: 0 });
        el.innerHTML = '<h2>แชท</h2>' + rooms.map(function (r) {
          return '<a href="#" class="chatbtn" data-chat="' + esc(r.job_id) + '" data-room="' + r.channel + '"><span class="chatico">' + icon('chat') + '</span>' +
            '<span class="cbt"><b>' + (r.as === 'admin' ? 'คุยกับ' + r.with_role + ' · ' + esc(r.with_name) : 'แชทกับแอดมิน') + '</b>' +
            '<small>' + (r.last_text ? (r.last_mine ? 'คุณ: ' : '') + esc(r.last_text) : 'ยังไม่มีข้อความ') + '</small></span>' +
            (r.unread ? '<span class="newpill">ใหม่ ' + r.unread + '</span>' : icon('next')) + '</a>';
        }).join('');
      }).catch(function () {});
    }
    load(true);
    every(8000, function () { load(false); });
  }

  function dayLabel(iso) {
    var d = new Date(iso), key = function (x) { return x.toLocaleDateString('en-CA', { timeZone: TZ }); };
    var y = new Date(Date.now() - 86400000), date = d.toLocaleDateString('th-TH', { timeZone: TZ, day: 'numeric', month: 'short' });
    if (key(d) === key(new Date())) return 'วันนี้';
    if (key(d) === key(y)) return 'เมื่อวาน · ' + date;
    return d.toLocaleDateString('th-TH', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
  }
  // รวมรายการซ้ำที่ติดกัน (เช่น ล็อกอินไม่สำเร็จ 3 ครั้ง) และตัดข้อความแชทออก
  function groupLogs(logs) {
    var grouped = [];
    logs.filter(function (l) { return l.action !== 'chat_send'; }).forEach(function (l) {
      var last = grouped[grouped.length - 1];
      if (last && last.action === l.action && last.target === l.target && last.label === l.label && dayKeyTz(last.at) === dayKeyTz(l.at)) last.n++;
      else grouped.push({ action: l.action, target: l.target, detail: l.detail, label: l.label, at: l.at, n: 1 });
    });
    return grouped;
  }
  function dayKeyTz(iso) { return new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ }); }
  function logListHtml(items, withCount) {
    var html = '', curDay = null, open = false, counts = {};
    items.forEach(function (l) { var k = dayKeyTz(l.at); counts[k] = (counts[k] || 0) + l.n; });
    items.forEach(function (l, i) {
      var day = dayLabel(l.at), hide = false;
      if (day !== curDay) {
        if (open) html += '</div>';
        html += '<div class="logday">' + esc(day) + (withCount ? '<span>' + counts[dayKeyTz(l.at)] + ' รายการ</span>' : '') + '</div><div class="loglist2">';
        curDay = day; open = true;
      }
      var k = LOG_KIND[l.action] || ['info', ''], isJob = l.target && l.target.charAt(0) === 'J';
      var sub = isJob ? l.target + (l.action === 'job_rate' && l.detail ? ' · ' + l.detail : '') : '';
      html += '<' + (isJob ? 'a href="#" data-job="' + esc(l.target) + '"' : 'div') + ' class="logrow' + (hide ? ' more' : '') + '"' + (hide ? ' hidden' : '') + '>' +
        '<span class="logic ' + k[1] + '">' + icon(k[0]) + '</span>' +
        '<span class="logt"><b>' + esc(l.label || LOG_LABEL[l.action] || l.action) + (l.n > 1 ? '<em class="pill' + (k[1] === 'warn' ? '' : ' muted') + '">' + l.n + ' ครั้ง</em>' : '') + '</b>' +
        (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span>' +
        '<time>' + fmtClock(l.at).replace(/^.*\s(\d{1,2}:\d{2})$/, '$1') + '</time></' + (isJob ? 'a' : 'div') + '>';
    });
    return open ? html + '</div>' : html;
  }
  // ---------- โปรไฟล์: ข้อมูลของฉัน / Point หรือเครดิต + สถิติ + การใช้งานวันนี้ / ตั้งค่าบัญชี ----------
  function viewProfile() {
    call('profile').then(function (d) {
      me = d.me;
      var st = d.stats || {}, isU = me.role === 'user', isC = false;
      var stats = isU ? '<div class="stat"><b>' + st.sent + '</b><span>คำสั่งทั้งหมด</span></div><div class="stat"><b>' + st.received + '</b><span>ของที่ได้รับแล้ว</span></div>'
        : '<div class="stat"><b>' + st.active + '</b><span>คำสั่งที่ค้างอยู่</span></div><div class="stat"><b>' + st.delivered + '</b><span>สำเร็จทั้งหมด</span></div>';
      var money = isU ? '<a href="#" class="card creditcard" data-page="points"><span class="cic">' + icon('gift') + '</span><span><b>' + st.points + '</b> Point คงเหลือ<small>ได้เมื่อคำสั่งสำเร็จ ใช้ลดค่าบริการได้</small></span>' + icon('next') + '</a>' : '';
      // การใช้งาน: เฉพาะของวันนี้ ไม่เกิน 5 รายการ ที่เหลือดูที่ "ดูทั้งหมด"
      var grouped = groupLogs(d.logs);
      var todayKey = dayKeyTz(new Date().toISOString());
      var todays = grouped.filter(function (l) { return dayKeyTz(l.at) === todayKey; });
      var logs = todays.length ? logListHtml(todays.slice(0, 5)) +
          (todays.length > 5 ? '<p class="morenote">วันนี้มีอีก ' + (todays.length - 5) + ' รายการ ดูได้ที่ "ดูทั้งหมด"</p>' : '')
        : '<p class="empty">' + (grouped.length ? 'วันนี้ยังไม่มีการใช้งาน' : 'ยังไม่มีประวัติ') + '</p>';
      var item = function (attr, ic, label, red) { return '<button type="button" class="mrow' + (red ? ' red' : '') + '" ' + attr + '>' + icon(ic) + '<span>' + label + '</span>' + (/data-page/.test(attr) || /contact/.test(attr) ? icon('next') : '') + '</button>'; };
      var adminTools = isU ? '' : '<div class="psec">เครื่องมือแอดมิน</div><div class="menu">' + item('data-page="resetpw"', 'user', 'จัดการผู้ใช้ (รีเซ็ตรหัสผ่าน · ระงับบัญชี)') + item('data-page="pricing"', 'coin', 'ราคาและ Point') + '</div>' +
        '<label class="card svcov"><input type="checkbox" id="svcov"' + (d.service && d.service.override ? ' checked' : '') + '><span class="tog"></span><span><b>รับคำสั่งนอกเวลา (โหมดทดสอบ)</b><small>ปกติสั่งได้เฉพาะ ' + (d.service ? d.service.hours.open + '–' + d.service.hours.close : '') + ' น. เปิดไว้เฉพาะตอนทดสอบหรือนำเสนอ แล้วปิดเมื่อเสร็จ</small></span></label>';
      app.innerHTML = shell('โปรไฟล์',
        '<div class="psec">ข้อมูลของฉัน</div>' +
        '<div class="card"><div class="profile"><div class="avatar">' + esc(me.name.slice(0, 1)) + '</div><div>' +
        '<strong>' + esc(me.name) + '</strong><div class="sub" style="margin:0">@' + esc(me.username) + ' · ' + CONFIG.ROLES[me.role] + '</div></div>' +
        '<button type="button" class="pedit" data-page="editprofile">' + icon('edit') + 'แก้ไข</button></div>' +
        '<dl class="info pinfo"><dt>เบอร์โทร</dt><dd>' + esc(fmtPhone(me.phone)) + '</dd><dt>สมัครเมื่อ</dt><dd>' + fmtDate(me.created_at) + '</dd></dl></div>' +
        (money || stats ? '<div class="psec">' + (isU ? 'Point และสถิติ' : 'สรุปคำสั่ง') + '</div>' + money + (stats ? '<div class="stats" style="margin-top:10px">' + stats + '</div>' : '') : '') +
        '<h2>การใช้งานวันนี้' + (grouped.length ? '<button class="h2link" data-page="activity">ดูทั้งหมด</button>' : '') + '</h2><div class="plogs">' + logs + '</div>' +
        adminTools + '<div class="psec">ตั้งค่าบัญชี</div><div id="pwnote"></div><div class="menu">' +
        item('data-page="editprofile"', 'edit', 'แก้ไขข้อมูลส่วนตัว') + item('data-page="changepw"', 'lock', 'เปลี่ยนรหัสผ่าน') +
        (isU ? item('data-act="contact"', 'help', 'ติดต่อแอดมิน') : '') + item('data-act="logout"', 'out', 'ออกจากระบบ') +
        (isU ? item('data-page="deleteacc"', 'trash', 'ลบบัญชี', true) : '') + '</div>' +
        '');
      if ($('svcov')) $('svcov').addEventListener('change', function () { var c = this; call('set_service_override', { on: c.checked }).catch(function () { c.checked = !c.checked; }); });
      if (state.flash) { $('pwnote').innerHTML = '<div class="formnote">' + icon('check') + '<span>' + esc(state.flash) + '</span></div>'; state.flash = ''; }
    }).catch(function (e) { handleAuthError(e); });
  }
  // แก้ไขข้อมูลส่วนตัว: ชื่อ + เบอร์ (ชื่อผู้ใช้แก้ไม่ได้) ยืนยันด้วยรหัสผ่าน
  function viewEditProfile() {
    app.innerHTML = shell('แก้ไขข้อมูลส่วนตัว',
      '<form id="epf">' +
      '<label class="field"><span>ชื่อผู้ใช้</span><div class="lockinp"><span>' + esc(me.username) + '</span>' + icon('lock') + '</div><small class="fhint">ใช้เข้าสู่ระบบ แก้ไขไม่ได้</small></label>' +
      '<label class="field"><span>ชื่อโปรไฟล์<b class="req" aria-hidden="true">*</b></span><input type="text" name="name" required minlength="2" maxlength="30" value="' + esc(me.name) + '"></label>' +
      '<label class="field"><span>เบอร์โทรศัพท์<b class="req" aria-hidden="true">*</b></span><input type="tel" name="phone" inputmode="numeric" required maxlength="10" data-phone value="' + esc(me.phone) + '"><small class="fhint">ไรเดอร์จะใช้เบอร์นี้โทรหาคุณ</small></label>' +
      '<label class="field"><span>รหัสผ่านเพื่อยืนยัน<b class="req" aria-hidden="true">*</b></span><input type="password" name="password" required autocomplete="current-password"></label>' +
      '<div id="err" class="error"></div><button class="btn">บันทึกการแก้ไข</button><button type="button" class="btn ghost" data-act="nav-back" style="margin-top:8px">ยกเลิก</button></form>',
      { back: true, nav: 'profile' });
    var f = $('epf');
    guardEnglish([f.name, f.password]);
    f.phone.addEventListener('input', function () { f.phone.value = f.phone.value.replace(/\D/g, '').slice(0, 10); });
    var timer = null;
    [['phone', 'check_phone', 'มีเบอร์โทรศัพท์นี้อยู่แล้วในระบบ', function (v) { return /^0[689]\d{8}$/.test(v) && v !== me.phone; }],
     ['name', 'check_name', 'มีชื่อโปรไฟล์นี้อยู่แล้วในระบบ', function (v) { return v.length >= 2 && v.toLowerCase() !== String(me.name).toLowerCase(); }]].forEach(function (c) {
      var inp = f[c[0]];
      inp.addEventListener('input', function () {
        clearTimeout(timer);
        var v = inp.value.trim();
        if (!c[3](v)) return;
        timer = setTimeout(function () {
          var q = {}; q[c[0]] = v;
          call(c[1], q).then(function (r) { if (inp.value.trim() === v) setTimeout(function () { fieldError(inp, r.available ? '' : c[2]); }, 0); });
        }, 350);
      });
    });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      call('update_profile', { name: f.name.value, phone: f.phone.value, password: f.password.value }).then(function (r) {
        me = r.me; state.flash = 'บันทึกข้อมูลส่วนตัวแล้ว'; navBack();
      }).catch(function (err) { if (!handleAuthError(err)) showError('err', err.message); });
    });
  }
  function viewChangePw() {
    app.innerHTML = shell('เปลี่ยนรหัสผ่าน', pwFormHtml('cpf', 'รหัสผ่านปัจจุบัน', 'บันทึกรหัสผ่านใหม่') +
      '<p class="morenote center">ลืมรหัสผ่านปัจจุบัน? <button type="button" class="inlink" data-act="contact">ติดต่อแอดมินเพื่อรีเซ็ต</button></p>', { back: true, nav: 'profile' });
    bindPwForm($('cpf'), function () { state.flash = 'เปลี่ยนรหัสผ่านแล้ว อุปกรณ์อื่นที่เข้าสู่ระบบค้างไว้จะต้องเข้าสู่ระบบใหม่'; navBack(); });
  }
  function viewDeleteAcc() {
    app.innerHTML = shell('ลบบัญชี', '<div id="main"><p class="empty">กำลังโหลด…</p></div>', { back: true, nav: 'profile' });
    call('profile').then(function (d) {
      var st = d.stats;
      $('main').innerHTML =
        '<div class="warnbox"><b>' + icon('warn') + 'ก่อนลบบัญชี โปรดตรวจสอบ</b><ul>' +
        (st.points ? '<li><b>' + st.points + ' Point</b> ที่สะสมไว้จะหายไปทั้งหมด และแลกไม่ได้อีก</li>' : '') +
        (st.torate ? '<li>มี <b>' + st.torate + ' งาน</b> ที่ยังรอให้คะแนน (รับได้อีก ' + st.torate_points + ' Point)</li>' : '') +
        '<li>เข้าสู่ระบบด้วยบัญชีนี้ไม่ได้อีก</li><li>ประวัติงานที่ผ่านมายังเก็บไว้ในระบบเป็นหลักฐาน</li></ul></div>' +
        (st.busy ? '<div class="error" style="display:block">ยังมีงานที่กำลังส่งหรือรอคนรับ ลบบัญชีได้เมื่องานทั้งหมดจบแล้ว</div>' : st.owed ? '<div class="error" style="display:block">ยังมีของหรือเงินคืนที่ต้องรับที่จุดรับฝาก รับให้เรียบร้อยก่อนลบบัญชี</div>' : '') +
        '<form id="delf"' + (st.busy || st.owed ? ' class="off"' : '') + '><fieldset' + (st.busy || st.owed ? ' disabled' : '') + ' style="border:0;padding:0;margin:0"><label class="field"><span>รหัสผ่านเพื่อยืนยัน<b class="req" aria-hidden="true">*</b></span><input type="password" name="password" required autocomplete="current-password"></label>' +
        '<label class="field"><span>พิมพ์คำว่า "ลบบัญชี" เพื่อยืนยัน<b class="req" aria-hidden="true">*</b></span><input type="text" name="confirm" required placeholder="ลบบัญชี" autocomplete="off"></label>' +
        '</fieldset><div id="derr" class="error"></div><button class="btn danger"' + (st.busy || st.owed ? ' disabled' : '') + '>ยืนยันลบบัญชีถาวร</button><button type="button" class="btn ghost" data-act="nav-back" style="margin-top:8px">ยกเลิก</button></form>';
      $('delf').addEventListener('submit', function (e) {
        e.preventDefault();
        if (this.confirm.value.trim() !== 'ลบบัญชี') return fieldError(this.confirm, 'พิมพ์คำว่า "ลบบัญชี" ให้ตรงเพื่อยืนยัน');
        call('delete_account', { password: this.password.value, confirm: this.confirm.value.trim() }).then(function () { setToken(null); me = null; go('auth'); })
          .catch(function (err) { if (!handleAuthError(err)) showError('derr', err.message); });
      });
    }).catch(function (e) { handleAuthError(e); });
  }
  // ติดต่อแอดมิน: แผ่นเลื่อนขึ้นจากด้านล่าง
  function openContact() {
    var lineId = (String(CONFIG.ADMIN_CONTACT).match(/LINE ID:\s*(\S+)/) || [])[1] || '';
    var el = document.createElement('div');
    el.className = 'sheetwrap';
    el.innerHTML = '<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div><strong>ติดต่อแอดมิน TheungMue</strong>' +
      '<p class="sub" style="margin:4px 0 0">เรื่องงานส่งของ ปัญหาบัญชี หรือข้อมูลที่แก้เองไม่ได้</p>' +
      '<div class="lineid"><div><small>LINE ID</small><b>' + esc(lineId) + '</b></div><button type="button" data-copy>คัดลอก</button></div>' +
      '<p class="sub" style="margin:0">กรุณาแจ้ง <b>ชื่อผู้ใช้ (@' + esc(me ? me.username : '') + ')</b> และ <b>เบอร์โทรศัพท์</b> ทุกครั้ง</p>' +
      '<button type="button" class="btn ghost" data-close style="margin-top:14px">ปิด</button></div>';
    document.body.appendChild(el);
    el.addEventListener('click', function (e) {
      if (e.target.closest('[data-copy]')) {
        var b = e.target.closest('[data-copy]'), done = function () { b.textContent = 'คัดลอกแล้ว'; };
        try { navigator.clipboard.writeText(lineId).then(done, done); } catch (x) { done(); }
        return;
      }
      if (e.target === el || e.target.closest('[data-close]')) el.remove();
    });
  }

  // ---------- รายละเอียดงาน ----------
  // ดูรูปเต็มจอ (แตะพื้นหลังหรือปุ่มปิดเพื่อออก)
  function openViewer(list, i) {
    var v = document.createElement('div');
    v.className = 'viewer';
    function draw() {
      v.innerHTML = '<img src="' + list[i] + '" alt="รูปของ ' + (i + 1) + '">' +
        '<div class="vbar"><span>' + (i + 1) + ' / ' + list.length + '</span><button type="button" data-close aria-label="ปิด">' + icon('x') + '</button></div>' +
        (list.length > 1 ? '<button type="button" class="vnav prev" data-step="-1" aria-label="รูปก่อนหน้า">' + icon('back') + '</button>' +
          '<button type="button" class="vnav next" data-step="1" aria-label="รูปถัดไป">' + icon('back') + '</button>' : '');
    }
    draw();
    v.addEventListener('click', function (e) {
      var st = e.target.closest('[data-step]');
      if (st) { i = (i + Number(st.getAttribute('data-step')) + list.length) % list.length; draw(); return; }
      if (e.target === v || e.target.closest('[data-close]')) v.remove();
    });
    document.body.appendChild(v);
  }





  // ---------- แชท: หน้ารวม + หน้าแชทเต็มจอ ----------
  var chatUnread = 0;
  function refreshChatBadge() {
    if (!me || me.role === 'admin' || me.must_change) return;
    checkRewards();
    call('chat_inbox').then(function (d) {
      chatUnread = d.unread;
      var b = $('cbadge');
      if (b) { b.textContent = chatUnread > 99 ? '99+' : chatUnread; b.hidden = !chatUnread; }
    }).catch(function () {});
  }
  setInterval(refreshChatBadge, 8000);
  function initials(name) {
    var p = String(name || '?').trim().split(/\s+/), a = p[0].charAt(0), z = p[p.length - 1];
    return (a + (p.length > 1 && /\d$/.test(z) ? z.slice(-1) : '')).toUpperCase();
  }
  // ---------- ประวัติทั้งหมด: ค้นหา · กรอง · แบ่งเดือน · ซ่อน/เลิกซ่อน ----------
  var HIST_KIND = {
    sent: { title: 'ประวัติคำสั่ง', pick: function (d) { return d.sent.filter(closed); }, extra: function (j) { return 'ถึง ' + esc(j.recipient_name); }, who: function (j) { return j.recipient_name; } },
    incoming: { title: 'ประวัติการรับ', pick: function (d) { return d.incoming.filter(closed); }, extra: function (j) { return 'จาก ' + esc(j.sender_name); }, who: function (j) { return j.sender_name; } },
  };
  function monthKey(iso) { return new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ }).slice(0, 7); }
  function monthLabel(iso) { return new Date(iso).toLocaleDateString('th-TH', { timeZone: TZ, month: 'long', year: 'numeric' }); }
  function viewHistory() {
    var kind = HIST_KIND[state.id] ? state.id : 'sent';
    var K = HIST_KIND[kind];
    var H = state.hist && state.hist.kind === kind ? state.hist : (state.hist = { kind: kind, q: '', f: 'all', showHidden: false });
    var items = [], toastTimer = null;
    app.innerHTML = shell(K.title, '<div id="err" class="error"></div><div id="histbody"><p class="empty">กำลังโหลด…</p></div>', { back: true, nav: navRoot() });
    call('jobs').then(function (d) {
      me = d.me; items = K.pick(d).sort(byClosedDesc);
      $('histbody').innerHTML =
        '<label class="hsearch">' + icon('search') + '<input type="search" id="hq" placeholder="ค้นหารหัสงาน สิ่งของ สถานที่ หรือชื่อ" autocomplete="off"></label>' +
        '<div class="hchips" id="hchips"></div><div id="hlist"></div>';
      var q = $('hq'); q.value = H.q;
      q.addEventListener('input', function () { H.q = q.value; draw(); });
      draw();
    }).catch(function (e) { if (!handleAuthError(e)) showError('err', e.message); });

    function matches(j) {
      var t = H.q.trim().toLowerCase();
      if (!t) return true;
      return [j.id, j.item_type, j.item_detail, zoneName(j.dropoff_zone, j.dropoff_detail), K.who(j)].join(' ').toLowerCase().indexOf(t) >= 0;
    }
    function draw() {
      var base = items.filter(function (j) { return (H.showHidden || !j.hidden) && matches(j); });
      var nHid = items.filter(function (j) { return j.hidden; }).length;
      if ($('hchips')) {
        var cnt = { all: base.length, delivered: 0, cancelled: 0 };
        base.forEach(function (j) { cnt[j.status]++; });
        $('hchips').innerHTML = [['all', 'ทั้งหมด'], ['delivered', 'สำเร็จ'], ['cancelled', 'ยกเลิก']].map(function (c) {
          return '<button data-act="histf" data-f="' + c[0] + '" class="' + (H.f === c[0] ? 'on' : '') + '">' + c[1] + ' ' + cnt[c[0]] + '</button>';
        }).join('');
      }
      var shown = base.filter(function (j) { return H.f === 'all' || j.status === H.f; });
      var html = nHid ? '<div class="hidbar"><span>' + (H.showHidden ? 'กำลังแสดงรายการที่ซ่อนด้วย' : 'ซ่อนอยู่ ' + nHid + ' รายการ') + '</span>' +
        '<button data-act="histshow">' + (H.showHidden ? 'ซ่อนอีกครั้ง' : 'แสดง') + '</button></div>' : '';
      if (!shown.length) html += '<p class="empty">' + (items.length ? 'ไม่พบรายการที่ตรงกับเงื่อนไข' : 'ยังไม่มีประวัติ') + '</p>';
      var cur = null;
      shown.forEach(function (j) {
        var mk = monthKey(closedAt(j));
        if (mk !== cur) {
          if (cur) html += '</div>';
          cur = mk;
          var n = shown.filter(function (x) { return monthKey(closedAt(x)) === mk; }).length;
          html += '<div class="hmonth"><span>' + esc(monthLabel(closedAt(j))) + '</span><span>' + n + ' รายการ</span></div><div class="stack">';
        }
        html += '<div class="hitem' + (j.hidden ? ' ishid' : '') + '">' + (kind === 'sent' ? ordCard(j) : jobCard(j, K.extra && K.extra(j))) +
          '<button class="hidebtn" data-act="hide" data-id="' + esc(j.id) + '" data-on="' + (j.hidden ? '0' : '1') + '">' +
          icon(j.hidden ? 'eye' : 'eyeoff') + (j.hidden ? 'เลิกซ่อน' : 'ซ่อน') + '</button></div>';
      });
      if (cur) html += '</div>';
      if (nHid && H.showHidden) html += '<div class="infobox hnote">' + icon('info') + '<div><span>รายการที่ซ่อนจะไม่แสดงในหน้าของคุณ แต่ข้อมูลยังเก็บไว้ในระบบเป็นหลักฐาน และอีกฝ่ายในงานยังเห็นตามปกติ</span></div></div>';
      $('hlist').innerHTML = html;
    }
    function setHidden(id, on, withToast) {
      var j = items.filter(function (x) { return x.id === id; })[0];
      if (!j) return;
      var prev = j.hidden;
      j.hidden = on ? '1' : ''; draw();
      if (withToast) toast(on ? 'ซ่อน ' + id + ' แล้ว' : 'เลิกซ่อน ' + id + ' แล้ว', id, !on);
      call('hide', { id: id, on: on }).catch(function (e) {
        j.hidden = prev; draw();
        if (!handleAuthError(e)) showError('err', e.message);
      });
    }
    function toast(text, id, undoOn) {
      var old = $('htoast'); if (old) old.remove();
      clearTimeout(toastTimer);
      app.insertAdjacentHTML('beforeend', '<div class="toast" id="htoast"><span>' + esc(text) + '</span><button data-act="histundo" data-id="' + esc(id) + '" data-on="' + (undoOn ? '1' : '0') + '">เลิกทำ</button></div>');
      toastTimer = setTimeout(function () { var t = $('htoast'); if (t) t.remove(); }, 5000);
    }
    state.histAct = function (a, t) {
      if (a === 'histf') { H.f = t.getAttribute('data-f'); draw(); }
      if (a === 'histshow') { H.showHidden = !H.showHidden; draw(); }
      if (a === 'hide') setHidden(t.getAttribute('data-id'), t.getAttribute('data-on') === '1', true);
      if (a === 'histundo') { var tt = $('htoast'); if (tt) tt.remove(); setHidden(t.getAttribute('data-id'), t.getAttribute('data-on') === '1', false); }
    };
  }

  // ---------- การใช้งานทั้งหมด: แบ่งตามวัน บอกจำนวนรายการของแต่ละวัน ----------
  function viewActivity() {
    app.innerHTML = shell('การใช้งานทั้งหมด', '<div id="err" class="error"></div><div id="actbody"><p class="empty">กำลังโหลด…</p></div>', { back: true, nav: 'profile' });
    call('profile', { all: true }).then(function (d) {
      me = d.me;
      var g = groupLogs(d.logs);
      var days = {}; g.forEach(function (l) { days[dayKeyTz(l.at)] = 1; });
      $('actbody').innerHTML = g.length
        ? '<p class="sub">ทั้งหมด ' + Object.keys(days).length + ' วันที่มีการใช้งาน · กดรายการที่มีรหัสงานเพื่อดูรายละเอียดงาน</p>' + logListHtml(g, true)
        : '<p class="empty">ยังไม่มีประวัติ</p>';
    }).catch(function (e) { if (!handleAuthError(e)) showError('err', e.message); });
  }

  function viewChats() {
    if (me.role !== 'admin' && !/^(active|closed)$/.test(state.chatTab || '')) state.chatTab = 'active';
    function load() {
      return call('chat_inbox').then(function (d) {
        chatUnread = d.unread;
        function roomsHtml(closedOnly) {
          var rooms = d.rooms.filter(function (r) { return (closedOnly ? r.closed : !r.closed) && (me.role === 'admin' || r.last_text); }) // ผู้ใช้เห็นเฉพาะห้องที่มีข้อความ
            .sort(function (a, b) { return String(b.last_at).localeCompare(String(a.last_at)); });
          return rooms.length ? '<div class="convlist">' + rooms.map(function (r) {
          return '<a href="#" class="conv' + (r.closed ? ' closed' : '') + '" data-chat="' + esc(r.job_id) + '" data-room="' + r.channel + '">' +
            '<span class="cav">' + (r.as === 'admin' ? esc(initials(r.with_name)) : icon('chat')) + '</span><span class="cvb">' +
            '<span class="cva"><b>' + esc(r.job_id) + (r.as === 'admin' ? ' · ' + r.with_role : '') + '</b>' + modeTag(r.mode) + '<time>' + (r.last_at ? fmtClock(r.last_at) : '') + '</time></span>' +
            '<span class="cvs">' + (r.as === 'admin' ? esc(r.with_name) + ' · ส่งถึง' : (r.as === 'recipient' ? 'ของที่จะได้รับ ·' : 'ส่งถึง')) + ' ' + esc(r.dropoff) + '</span>' +
            '<span class="cvl' + (r.unread ? ' unread' : '') + '"><span>' + (r.last_text ? (r.last_mine ? 'คุณ: ' : '') + esc(r.last_text) : 'ยังไม่มีข้อความ') + '</span>' +
            (r.unread ? '<em>' + r.unread + '</em>' : '') + '</span></span></a>';
        }).join('') + '</div>'
          : '<p class="empty">' + (closedOnly ? 'ยังไม่มีแชทของคำสั่งที่ปิดแล้ว' : me.role === 'admin' ? 'ยังไม่มีลูกค้าทักในหน้าคำสั่ง' : 'ยังไม่มีแชท อยากคุยเรื่องคำสั่งไหน เปิดคำสั่งนั้นแล้วกด "แชทกับแอดมิน"') + '</p>';
        }
        if (me.role === 'admin') return adminChatTabs(roomsHtml, d.rooms.filter(function (r) { return !r.closed; }).reduce(function (t, r) { return t + r.unread; }, 0), d.rooms.filter(function (r) { return r.closed; }).reduce(function (t, r) { return t + r.unread; }, 0)).then(function (h) { if (state.view === 'chats') app.innerHTML = shell('แชท', h, { nav: 'chats' }); refreshBotBadge(); });
        var list = roomsHtml(state.chatTab === 'closed');
        app.innerHTML = shell('แชท', '<div class="segtabs"><button data-act="chattab" data-tab="active" class="' + (state.chatTab === 'active' ? 'on' : '') + '">กำลังดำเนินการ</button>' +
          '<button data-act="chattab" data-tab="closed" class="' + (state.chatTab === 'closed' ? 'on' : '') + '">ปิดแล้ว</button></div>' + list, { nav: me.role === 'admin' ? 'chats' : '' });
      }).catch(function (e) { handleAuthError(e); });
    }
    load();
    every(6000, load);
  }
  function viewChat() {
    var id = state.id, channel = state.room, job = null, isCourier = false, count = '', lastDay = ''; // isCourier = ร้าน (แอดมิน) ที่คุยได้สองห้อง
    function title() {
      return isCourier ? esc(job.id) + ' <small>· ส่งถึง ' + esc(zoneName(job.dropoff_zone, job.dropoff_detail)) + '</small>'
        : 'แอดมิน ' + esc(CONFIG.APP_NAME) + ' <small>· ' + esc(job.id) + '</small>';
    }
    function closedText() { return job.status === 'cancelled' ? 'คำสั่งนี้ถูกยกเลิกแล้ว ส่งข้อความเพิ่มไม่ได้' : 'คำสั่งนี้สำเร็จแล้ว ส่งข้อความเพิ่มไม่ได้'; }
    function drawShell() {
      app.innerHTML = '<div class="chatscreen"><header class="chathead"><div class="row gap"><button class="iconbtn" data-act="chat-back" aria-label="กลับ">' + icon('back') + '</button>' +
        '<span class="chtitle">' + title() + '</span></div>' +
        '<div class="jobstrip">' + (closed(job) ? badge(job.status) : modeTag(job.mode)) + '<span>' + esc(job.id) + ' · ส่งถึง ' + esc(zoneName(job.dropoff_zone, job.dropoff_detail)) + '</span>' +
        '<a href="#" data-job="' + esc(job.id) + '">ดูคำสั่ง</a></div>' +
        (isCourier ? '<div class="chattabs" id="chattabs"><button type="button" data-ch="sender" class="' + (channel === 'sender' ? 'on' : '') + '">คุยกับผู้สั่ง<small>' + esc(job.sender_name) + '</small><i></i></button>' +
          '<button type="button" data-ch="recipient" class="' + (channel === 'recipient' ? 'on' : '') + '">คุยกับผู้รับ<small>' + esc(job.recipient_name) + '</small><i></i></button></div>' : '') +
        '</header><div class="chat chatfull" id="chat"></div>' +
        '<div class="composer" id="chatform"' + (closed(job) ? ' hidden' : '') + '><div class="presets" id="presets"></div>' +
        '<form class="send" id="sendf"><input type="text" id="msg" maxlength="300" placeholder="พิมพ์ข้อความ" autocomplete="off"><button class="btn small">ส่ง</button></form><div id="cerr" class="error"></div></div>' +
        '<div class="composer closedbar" id="chatclosed"' + (closed(job) ? '' : ' hidden') + '>' + closedText() + '</div></div>';
      drawPresets();
      bind();
    }
    function drawPresets() {
      var key = isCourier ? 'shop' : channel;
      $('presets').innerHTML = CONFIG.CHAT_PRESETS[key].map(function (p) { return '<button type="button" data-preset="' + esc(p) + '">' + esc(p) + '</button>'; }).join('');
    }
    var seen = null;
    function loadMsgs() {
      var ch = channel;
      call('messages', { id: id, channel: ch, seen: document.visibilityState === 'visible' }).then(function (d) {
        if (ch !== channel || !$('chat')) return;
        if (d.counts) {
          if (!seen) seen = { sender: d.counts.sender, recipient: d.counts.recipient };
          seen[channel] = d.counts[channel];
          ['sender', 'recipient'].forEach(function (c) {
            var dot = document.querySelector('#chattabs [data-ch="' + c + '"] i');
            if (dot) dot.className = d.counts[c] > seen[c] ? 'new' : '';
          });
        }
        var key = d.messages.length + ':' + d.messages.filter(function (m) { return m.read_at; }).length;
        if (key === count) return;
        var atBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 80 || count === '';
        count = key; lastDay = '';
        $('chat').innerHTML = d.messages.length ? d.messages.map(function (m) {
          var mine = isCourier ? !!m.shop : m.sender_id === me.id;
          var day = fmtTime(m.created_at).replace(/\s*\d{1,2}:\d{2}.*$/, '');
          var sep = day !== lastDay ? '<div class="daysep"><span>' + esc(day) + '</span></div>' : '';
          lastDay = day;
          var stat = !mine ? '' : m.read_at
            ? '<span class="rd read">' + icon('ticks') + 'อ่านแล้ว ' + fmtClock(m.read_at) + '</span>'
            : '<span class="rd">' + icon('tick') + 'ส่งแล้ว</span>';
          var meta = '<div class="mmeta">' + stat + '<time>' + fmtClock(m.created_at) + '</time></div>';
          return sep + '<div class="mrow' + (mine ? ' me' : '') + '">' + (mine ? meta : '') +
            '<div class="msg' + (mine ? ' me' : '') + '">' + (mine ? '' : '<b>' + esc(m.sender_name) + '</b>') + '<div>' + esc(m.text) + '</div></div>' +
            (mine ? '' : meta) + '</div>';
        }).join('') : '<p class="empty" style="margin-top:40px">ยังไม่มีข้อความ เริ่มคุยได้เลย</p>';
        if (atBottom) window.scrollTo(0, document.body.scrollHeight);
        refreshChatBadge();
      }).catch(function (e) { handleAuthError(e); });
    }
    function send(text, preset) {
      showError('cerr', '');
      call('send', { id: id, text: text, preset: preset, channel: channel }).then(function () {
        if (!preset) $('msg').value = '';
        count = ''; loadMsgs();
      }).catch(function (e) { showError('cerr', e.message); });
    }
    function bind() {
      app.querySelector('.chatscreen').addEventListener('click', function (e) {
        var p = e.target.closest('[data-preset]');
        if (p) return send(p.getAttribute('data-preset'), true);
        var t = e.target.closest('[data-ch]');
        if (t && t.getAttribute('data-ch') !== channel) {
          channel = state.room = t.getAttribute('data-ch'); count = '';
          Array.prototype.forEach.call(app.querySelectorAll('[data-ch]'), function (b) { b.classList.toggle('on', b === t); });
          $('chat').innerHTML = ''; showError('cerr', ''); drawPresets(); loadMsgs();
        }
      });
      $('sendf').addEventListener('submit', function (e) {
        e.preventDefault();
        var v = $('msg').value.trim();
        if (v) send(v, false);
      });
    }
    call('job', { id: id }).then(function (d) {
      me = d.me; job = d.job; isCourier = me.role === 'admin';
      if (!isCourier) channel = me.id === job.sender_id ? 'sender' : 'recipient';
      else if (channel !== 'recipient') channel = 'sender';
      state.room = channel;
      drawShell(); loadMsgs();
      every(4000, loadMsgs);
      every(8000, function () { // งานปิดระหว่างคุย → ปิดช่องพิมพ์
        call('job', { id: id }).then(function (x) {
          job = x.job;
          if (closed(job) && $('chatform') && !$('chatform').hidden) { $('chatform').hidden = true; $('chatclosed').hidden = false; $('chatclosed').textContent = closedText(); }
        }).catch(function () {});
      });
    }).catch(function (e) { if (!handleAuthError(e)) app.innerHTML = '<div class="error" style="display:block">' + esc(e.message) + '</div>'; });
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && state.view === 'chat' && state.id === id) loadMsgs(); });
  }

  // ===================== ผู้ช่วย AI (น้องถึง) =====================
  // มาสคอตน้องถึง: นกเพนกวินใส่หมวกไรเดอร์ ถือกล่องพัสดุ (v2.27 แบบ ก)
  var BIRD = '<svg viewBox="0 0 100 100" aria-hidden="true" class="bird">' +
    '<ellipse cx="41.5" cy="88" rx="6" ry="2.8" fill="#f5a623"/><ellipse cx="58.8" cy="88.2" rx="5.8" ry="2.7" fill="#f5a623"/>' +
    '<path d="M24.5 54 Q14 64 18.5 74.5 Q25.5 71 27.5 62Z" fill="#1f2b45"/>' +
    '<path d="M50 19 C31 19 23 37 23.5 57 C24 76 35 88 50 88 C65.5 88 76.5 76 76.5 56.5 C76.5 37 69 19 50 19Z" fill="#1f2b45"/>' +
    '<path d="M50 40.5 C44.5 32 32 34 32.5 47 C33 66 40.5 81 50 81 C59.5 81 67.5 66 67.8 47 C68 34 55.5 32 50 40.5Z" fill="#fbf6ea"/>' +
    '<circle cx="42" cy="50" r="3.6" fill="#1f2b45"/><circle cx="58" cy="50.3" r="3.5" fill="#1f2b45"/><circle cx="43.2" cy="48.8" r="1.1" fill="#fff"/><circle cx="59.2" cy="49.4" r="1" fill="#fff"/>' +
    '<path d="M45.5 56 Q50 54.4 54.6 56 Q51.6 61.2 50 61.2 Q48.4 61.2 45.5 56Z" fill="#f5a623"/>' +
    '<ellipse cx="37" cy="58" rx="3.2" ry="2" fill="#f3a79c" opacity=".85"/><ellipse cx="63.2" cy="58.4" rx="3" ry="1.9" fill="#f3a79c" opacity=".85"/>' +
    '<path d="M31 29 Q31.5 11.5 50 11.5 Q68.5 11.5 69 29Z" fill="#ffcd2e"/><path d="M50 11.5 V28" stroke="#e9ad12" stroke-width="1.6"/><path d="M28.5 27.5 Q52 31.5 78 25.8 L78.6 30.2 Q52 36 28 31.6Z" fill="#e9ad12"/>' +
    '<rect x="58" y="62" width="21" height="16" rx="2" fill="#d7a462" transform="rotate(-4 68 70)"/><path d="M68.2 61.4 L69.3 77.4" stroke="#b98444" stroke-width="2.6"/>' +
    '<path d="M75.5 55 Q83 60 79 68 Q73.5 67 71 62Z" fill="#1f2b45"/></svg>';
  var BOT_NAME = 'น้องถึง';
  var FEATHER = '<svg viewBox="0 0 40 40" aria-hidden="true" class="fea"><path d="M30 6 C18 7 9 16 9 28 L9 33 L13 31 C14 26 17 21 22 17 C18 22 15 27 14 31 C25 30 33 20 30 6 Z" fill="#f0a63a"/><path d="M9 33 L22 17" stroke="#d88f25" stroke-width="1.6" fill="none"/></svg>';
  var THUMB = '<path d="M7 11v9H4v-9zM7 11l4-7c1.5 0 2.5 1 2.2 2.6L12.6 10H19a1.5 1.5 0 0 1 1.5 1.8l-1.4 6.6A2 2 0 0 1 17.2 20H7"/>';
  function thumb(down) { return '<svg viewBox="0 0 24 24" aria-hidden="true"' + (down ? ' style="transform:rotate(180deg)"' : '') + '>' + THUMB + '</svg>'; }
  var FB_REASONS = { wrong: 'ไม่ตรงคำถาม', data: 'ข้อมูลไม่ถูก', confusing: 'อ่านแล้วงง', admin: 'อยากคุยกับแอดมิน' };
  // ตอบตรงไหม (ใต้คำตอบของน้องถึง) — ผู้ใช้กดได้ ไม่บังคับ / แอดมินเห็นผล
  function fbHtml(m, admin) {
    if (!m.rate) return '';
    if (admin) return m.fb ? '<div class="bfbad ' + m.fb + '">' + thumb(m.fb === 'down') + (m.fb === 'up' ? 'ผู้ใช้: ตรงใจ' : 'ผู้ใช้: ยังไม่ตรง' + (m.fb_reason_label ? ' · ' + esc(m.fb_reason_label) : '')) + '</div>' : '';
    var h = '<div class="bfb"><span>ตอบตรงไหม</span><button type="button" class="' + (m.fb === 'up' ? 'on' : '') + '" data-fb="' + esc(m.id) + '" data-v="up">' + thumb(false) + 'ตรงใจ</button>' +
      '<button type="button" class="no' + (m.fb === 'down' ? ' on' : '') + '" data-fb="' + esc(m.id) + '" data-v="down">' + thumb(true) + 'ยังไม่ตรง</button></div>';
    if (m.fb === 'down') h += '<div class="bwhy"><p>ไม่ตรงตรงไหน <small>(เลือกได้ ไม่บังคับ)</small></p><div>' + Object.keys(FB_REASONS).map(function (k) {
      return '<button type="button" class="' + (m.fb_reason === k ? 'on' : '') + '" data-fbr="' + esc(m.id) + '" data-r="' + k + '">' + FB_REASONS[k] + '</button>'; }).join('') + '</div></div>' +
      '<div class="bthx warn">' + icon('tick') + 'ขอบคุณที่ช่วยสอน แอดมินจะนำไปปรับให้' + BOT_NAME + 'เข้าใจขึ้น</div>';
    else if (m.fb === 'up') h += '<div class="bthx">' + icon('tick') + 'ขอบคุณครับ ' + BOT_NAME + 'จำไว้แล้ว</div>';
    return h;
  }
  function featherRow(n, attr) {
    var h = '';
    for (var i = 1; i <= 5; i++) h += '<button type="button" class="' + (i <= n ? 'on' : '') + '"' + (attr ? ' ' + attr + '="' + i + '"' : ' disabled') + ' aria-label="' + i + ' ขนนก">' + FEATHER + '</button>';
    return '<div class="feas">' + h + '</div>';
  }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  // ---- ปุ่มมาสคอตลอย: แตะ = เปิดผู้ช่วย · ลาก = ย้าย ปล่อยแล้วชิดขอบ · ไม่ได้แตะ 3 วินาทีจางลง ----
  var fab = null, fabTip = null, fabIdleT = null, fabUnread = 0;
  function fabBounds() {
    var top = 64, nav = document.querySelector('.tabbar'), bottom = (nav ? nav.offsetHeight : 64) + 10;
    var edge = Math.max(0, (window.innerWidth - 560) / 2); // จอใหญ่: ให้ปุ่มอยู่ในแนวเนื้อหา (กว้าง 560) ไม่ไปชิดขอบจอ
    return { minY: top, maxY: Math.max(top, window.innerHeight - bottom - 58), minX: edge + 8, maxX: window.innerWidth - edge - 58 - 8 };
  }
  function fabPlace(animate) {
    var p = { side: 'right', y: 1 }; // เริ่มต้นมุมขวาล่าง เหนือเมนูล่าง
    try { var s = JSON.parse(lsGet('tm-fab-pos') || 'null'); if (s && (s.side === 'left' || s.side === 'right')) p = s; } catch (e) {}
    var b = fabBounds();
    fab.classList.toggle('anim', !!animate);
    fab.style.left = (p.side === 'left' ? b.minX : b.maxX) + 'px';
    fab.style.top = Math.round(b.minY + (b.maxY - b.minY) * Math.max(0, Math.min(1, p.y))) + 'px';
    fab.classList.toggle('left', p.side === 'left');
  }
  function fabWake() {
    if (!fab) return;
    fab.classList.remove('idle');
    clearTimeout(fabIdleT);
    fabIdleT = setTimeout(function () { if (fab) fab.classList.add('idle'); }, 3000);
  }
  function fabHideTip() { if (fabTip) { fabTip.remove(); fabTip = null; lsSet('tm-fab-tip', '1'); } }
  function makeFab() {
    fab = document.createElement('button');
    fab.type = 'button'; fab.id = 'botfab'; fab.className = 'botfab'; fab.setAttribute('aria-label', 'ถามผู้ช่วย ' + BOT_NAME);
    fab.innerHTML = BIRD + '<span class="fabdot" hidden></span>';
    document.body.appendChild(fab);
    var start = null, moved = false;
    fab.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse') e.preventDefault(); // กันเบราว์เซอร์เริ่มลากลิงก์/ข้อความใต้ปุ่ม ซึ่งจะยกเลิกการลากปุ่ม
      start = { x: e.clientX, y: e.clientY, l: fab.offsetLeft, t: fab.offsetTop }; moved = false;
      fab.setPointerCapture(e.pointerId); fab.classList.remove('anim'); fabWake();
    });
    fab.addEventListener('pointermove', function (e) {
      if (!start) return;
      var dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 6) return;
      if (!moved) { moved = true; fab.classList.add('drag'); fabHideTip(); }
      var b = fabBounds();
      fab.style.left = Math.max(b.minX, Math.min(b.maxX, start.l + dx)) + 'px';
      fab.style.top = Math.max(b.minY, Math.min(b.maxY, start.t + dy)) + 'px';
    });
    function end() {
      if (!start) return;
      start = null; fab.classList.remove('drag');
      if (!moved) { fabHideTip(); navOpen('bot'); return; }
      var b = fabBounds(), cx = fab.offsetLeft + 29;
      lsSet('tm-fab-pos', JSON.stringify({ side: cx < window.innerWidth / 2 ? 'left' : 'right', y: (fab.offsetTop - b.minY) / Math.max(1, b.maxY - b.minY) }));
      fabPlace(true); fabWake();
    }
    fab.addEventListener('pointerup', end);
    fab.addEventListener('pointercancel', end);
    window.addEventListener('resize', function () { if (fab && !fab.hidden) fabPlace(false); });
    // แป้นพิมพ์ขึ้น (กำลังพิมพ์) ซ่อนปุ่มไว้ก่อน
    document.addEventListener('focusin', function (e) { if (fab && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) fab.classList.add('typing'); });
    document.addEventListener('focusout', function () { if (fab) fab.classList.remove('typing'); });
  }
  function updateFab() {
    var show = !!(me && me.role === 'user' && !me.must_change && state.view !== 'auth' && state.view !== 'bot' && state.view !== 'bot-history' && state.view !== 'bot-day' && state.view !== 'chat' && state.view !== 'force-pw');
    document.body.classList.toggle('hasfab', show);
    if (!show) { if (fab) fab.hidden = true; fabHideTipSoft(); return; }
    if (!fab) makeFab();
    fab.hidden = false; fabPlace(false); fabWake(); setFabDot(fabUnread);
    if (!lsGet('tm-fab-tip') && !fabTip) {
      fabTip = document.createElement('div'); fabTip.className = 'fabtip';
      fabTip.innerHTML = '<b>' + BOT_NAME + ' ผู้ช่วยของ TheungMue</b>แตะเพื่อถามคำถาม · กดค้างแล้วลากเพื่อย้ายได้';
      document.body.appendChild(fabTip); placeTip();
      setTimeout(fabHideTip, 7000);
    } else placeTip();
  }
  function fabHideTipSoft() { if (fabTip) { fabTip.remove(); fabTip = null; } }
  function placeTip() {
    if (!fabTip || !fab) return;
    var left = fab.classList.contains('left');
    fabTip.classList.toggle('left', left);
    fabTip.style.top = (fab.offsetTop + 4) + 'px';
    fabTip.style.left = left ? (fab.offsetLeft + 66) + 'px' : '';
    fabTip.style.right = left ? '' : (window.innerWidth - fab.offsetLeft + 8) + 'px';
  }
  function setFabDot(n) { fabUnread = n; if (fab) fab.querySelector('.fabdot').hidden = !n; }
  var adminBadges = null;
  function navBadge(go, n) {
    var b = document.querySelector('.tabbar [data-go="' + go + '"]'); if (!b) return;
    var e = b.querySelector('.navbadge'); if (!e) { e = document.createElement('em'); e.className = 'navbadge'; b.appendChild(e); }
    e.textContent = n > 99 ? '99+' : n; e.hidden = !n;
  }
  function refreshBotBadge() {
    if (!me || me.must_change) return;
    call('bot_unread').then(function (d) {
      if (me.role === 'user') setFabDot(d.unread);
    }).catch(function () {});
    if (me.role === 'admin') call('admin_badges').then(function (d) {
      navBadge('chats', d.bot + d.order_unread); navBadge('a-orders', d.pending); adminBadges = d;
      var ct = document.querySelector('.otabs [data-t="cancelled"]'); // แท็บยกเลิก: จำนวนที่ยังต้องจัดการ
      if (ct) { var e = ct.querySelector('em'); if (d.todo) { if (!e) { e = document.createElement('em'); ct.appendChild(e); } e.textContent = d.todo; } else if (e) e.remove(); }
    }).catch(function () {});
  }
  setInterval(function () { if (!document.hidden) refreshBotBadge(); }, REMOTE ? 20000 : 8000);

  // ---- ข้อความในห้องผู้ช่วย (ใช้ทั้งฝั่งผู้ใช้และแอดมิน) ----
  function botCard(c) {
    if (!c || c.type !== 'order') return '';
    return '<div class="bcard"><div class="bch"><b>' + esc(c.id) + '</b><span class="badge st-' + esc(c.st) + '">' + esc(c.status) + '</span></div>' +
      '<ul>' + c.rows.map(function (r, i) { return '<li class="' + (i === c.rows.length - 1 && /^ต้องถึง/.test(r[0]) ? 'next' : '') + '"><i></i><span>' + esc(r[0]) + '</span><b>' + esc(r[1]) + '</b></li>'; }).join('') + '</ul>' +
      '<a href="#" data-job="' + esc(c.id) + '">เปิดคำสั่งนี้</a></div>';
  }
  function botMsgHtml(m, admin, lastBotId) {
    if (m.role === 'system') return '<div class="bsys">' + esc(m.text) + '</div>';
    var mine = admin ? m.role === 'admin' : m.role === 'user';
    var who = m.role === 'admin' ? (admin ? '' : '<b class="bwho adm">แอดมิน</b>') : m.role === 'bot' ? (admin ? '<b class="bwho">' + BOT_NAME + ' (ผู้ช่วย)</b>' : '') : (admin ? '' : '');
    var opts = m.options ? '<div class="bopts">' + m.options.map(function (o, i) {
      return '<button type="button" class="' + (o.kind === 'admin' ? 'toadm' : '') + '" data-bpick="' + (i + 1) + '" data-ref="' + esc(m.id) + '"' + (admin || m.used || m.id !== lastBotId ? ' disabled' : '') + '>' + esc(o.label) + '</button>';
    }).join('') + '</div>' : '';
    var meta = admin && m.intent ? '<div class="bmeta' + (m.low ? ' low' : '') + '"><span>เข้าใจว่า: ' + esc(m.intent_label) + (m.intent === 'pick' ? '' : ' · มั่นใจ ' + Math.round(m.conf * 100) + '%') +
      (m.low ? (m.route === 'sensitive' ? ' · ก้ำกึ่งเรื่องที่ต้องให้แอดมินดูแล จึงส่งต่อทันที' : ' · ต่ำกว่าเกณฑ์ จึงถามกลับ') : '') + (m.taught ? ' · สอนแล้ว' : '') + '</span></div>' : '';
    return '<div class="brow ' + (mine ? 'me' : m.role) + '"><div class="bmsg ' + m.role + (mine ? ' me' : '') + '">' + who + '<div>' + esc(m.text) + '</div>' + botCard(m.card) + opts + '</div>' +
      '<time>' + fmtClock(m.created_at) + '</time></div>' + meta + fbHtml(m, admin);
  }
  function lastBotMsgId(ms) { for (var i = ms.length - 1; i >= 0; i--) if (ms[i].role !== 'system') return ms[i].role === 'bot' ? ms[i].id : ''; return ''; }

  // ---- ผู้ใช้: ห้องผู้ช่วย ----
  function viewBot() {
    var key = '', mode = '', stars = 0, rated = 0, lastD = null, showRate = false;
    function head(t, d) {
      var rd = rated || d.rated;
      var hand = t.mode === 'handoff';
      return '<header class="chathead bhead"><div class="row gap"><button class="iconbtn" data-act="nav-back" aria-label="กลับ">' + icon('back') + '</button>' +
        '<span class="bav">' + BIRD + '</span><span class="chtitle">' + BOT_NAME + ' <small>· ผู้ช่วย ' + esc(CONFIG.APP_NAME) + '</small></span>' +
        '<span class="btag' + (hand ? ' hand' : '') + '">' + (hand ? 'แอดมินดูแลอยู่' : 'ตอบอัตโนมัติ') + '</span></div>' +
        '<p class="bsub">' + (hand ? 'ผู้ช่วยหยุดตอบจนกว่าแอดมินจะปิดเรื่อง' : 'ตอบได้ตลอด 24 ชม. · เรื่องที่ตอบไม่ได้จะส่งต่อแอดมิน') + '</p>' +
        '<div class="btools"><button type="button" class="ib" data-bhist="1">' + CLOCK + 'แชทย้อนหลัง</button>' +
        (rd ? '<button type="button" class="ib done" disabled>' + FEATHER + 'ให้แล้ว ' + rd + ' ขนนก</button>' : '<button type="button" class="ib fe" data-rate-open="1">' + FEATHER + 'ให้ขนนก</button>') + '</div></header>';
    }
    function draw(d) {
      var t = d.thread, ms = d.messages, hand = t.mode === 'handoff';
      var greet = { role: 'bot', id: '_g', text: 'สวัสดีครับ ผม' + BOT_NAME + ' ผู้ช่วยของ TheungMue ถามเรื่องคำสั่งของคุณ ค่าบริการ Point หรือกติกาได้เลย ใส่เลขคำสั่งมาด้วยจะตอบได้ตรงขึ้น', created_at: (ms.filter(function (m) { return dayKeyTz(m.created_at) === d.today; })[0] || { created_at: new Date().toISOString() }).created_at };
      var lb = lastBotMsgId(ms), body = '', cur = null;
      if (d.carry) body += '<div class="bcarry"><b>เรื่องที่ยังไม่ปิดจากวันก่อน</b>' + (d.carry.text ? '"' + esc(d.carry.text) + '" · ' : '') + 'ส่งต่อแอดมินเมื่อ ' + esc(fmtTime(d.carry.at)) + '</div>';
      ms.forEach(function (m) {
        var k = dayKeyTz(m.created_at);
        if (k !== cur) { cur = k; body += '<span class="bday">' + botDayLabel(k, d.today) + '</span>'; if (k === d.today && !hand) body += botMsgHtml(greet, false, ''); }
        body += botMsgHtml(m, false, lb);
      });
      if (cur !== d.today) body += '<span class="bday">' + botDayLabel(d.today, d.today) + '</span>' + (hand ? '' : botMsgHtml(greet, false, ''));
      var FL = d.feather_label || [];
      if (rated) body += '<div class="bthx rated">' + featherRow(rated) + 'ขอบคุณสำหรับ ' + rated + ' ขนนก ' + BOT_NAME + 'จะตั้งใจขึ้นอีก</div>';
      else if ((d.rate_prompt || showRate) && !d.rated) body += '<div class="rcard" id="rcard"><div class="rtt"><span class="bav sm">' + BIRD + '</span>ให้ขนนก' + BOT_NAME + 'หน่อยนะ</div>' +
        '<small>วันนี้' + BOT_NAME + 'ช่วยได้แค่ไหน ไม่ให้ก็ได้</small>' + featherRow(stars, 'data-star') +
        '<div class="rlv">' + (stars ? stars + ' ขนนก · ' + esc(FL[stars] || '') : 'แตะขนนกเพื่อให้คะแนน') + '</div>' +
        '<input type="text" id="rcomment" maxlength="200" placeholder="อยากบอกอะไร' + BOT_NAME + 'เพิ่มไหม (ไม่บังคับ)">' +
        '<div class="rbtn"><button type="button" class="btn ghost small" data-rate="later">ไว้ทีหลัง</button><button type="button" class="btn small" data-rate="send"' + (stars ? '' : ' disabled') + '>ส่งขนนก</button></div>' +
        '<p class="rnote">คะแนนนี้แอดมินเห็น ใช้พัฒนา' + BOT_NAME + 'เท่านั้น ไม่มีผลกับ Point</p><div id="rerr" class="error"></div></div>';
      var hk = t.mode + ':' + (rated || d.rated);
      if (!$('bchat') || mode !== hk) {
        mode = hk;
        app.innerHTML = '<div class="chatscreen botscreen">' + head(t, d) + '<div class="bchat" id="bchat"></div>' +
          '<div class="composer bcomp">' + (hand ? '' : '<div class="presets" id="bquick">' + d.quick.map(function (q) { return '<button type="button" data-bq="' + esc(q) + '">' + esc(q) + '</button>'; }).join('') + '</div>' +
            '<button type="button" class="toadmin" data-act="bot-handoff">' + icon('user') + 'ติดต่อแอดมิน</button>') +
          '<form class="send" id="bsend"><input type="text" id="bmsg" maxlength="300" placeholder="' + (hand ? 'พิมพ์ถึงแอดมิน' : 'พิมพ์คำถาม เช่น ของฉันถึงไหนแล้ว') + '" autocomplete="off"><button class="btn small">ส่ง</button></form>' +
          '<div id="berr" class="error"></div></div></div>';
        bind();
      }
      var cm = $('rcomment') ? $('rcomment').value : '';
      $('bchat').innerHTML = body;
      if ($('rcomment')) $('rcomment').value = cm;
      if (!keepScroll) window.scrollTo(0, document.body.scrollHeight);
      keepScroll = false;
    }
    var keepScroll = false;
    function load(force) {
      if (!force && document.activeElement && document.activeElement.id === 'rcomment') return;
      return call('bot_thread', { seen: document.visibilityState === 'visible' }).then(function (d) {
        lastD = d;
        var k = d.thread.mode + ':' + d.messages.length + ':' + d.messages.filter(function (m) { return m.used; }).length + ':' + d.messages.map(function (m) { return (m.fb || '') + (m.fb_reason || ''); }).join('') + ':' + d.rate_prompt + ':' + d.rated;
        if (k !== key || force) { key = k; draw(d); }
        setFabDot(0);
      }).catch(function (e) { if (!handleAuthError(e)) showError('berr', e.message); });
    }
    function send(args) {
      showError('berr', '');
      return call('bot_send', args).then(function () { if ($('bmsg') && args.text) $('bmsg').value = ''; return load(true); })
        .catch(function (e) { showError('berr', e.message); });
    }
    function bind() {
      app.querySelector('.botscreen').addEventListener('click', function (e) {
        var q = e.target.closest('[data-bq]');
        if (q) return send({ text: q.getAttribute('data-bq') });
        var f = e.target.closest('[data-fb]');
        if (f) { keepScroll = true; return call('bot_feedback', { id: f.getAttribute('data-fb'), value: f.classList.contains('on') ? '' : f.getAttribute('data-v') }).then(function () { load(true); }).catch(function (er) { showError('berr', er.message); }); }
        var fr = e.target.closest('[data-fbr]');
        if (fr) { keepScroll = true; return call('bot_feedback', { id: fr.getAttribute('data-fbr'), value: 'down', reason: fr.classList.contains('on') ? '' : fr.getAttribute('data-r') }).then(function () { return load(true); }).catch(function (er) { showError('berr', er.message); }); }
        var st = e.target.closest('[data-star]');
        if (st) { stars = Number(st.getAttribute('data-star')); keepScroll = true; return draw(lastD); }
        var rb = e.target.closest('[data-rate]');
        if (e.target.closest('[data-bhist]')) return navOpen('bot-history');
        if (e.target.closest('[data-rate-open]')) { showRate = true; return draw(lastD); }
        if (rb) {
          if (rb.getAttribute('data-rate') === 'later') { showRate = false; return call('bot_rate_later').then(function () { load(true); }); }
          return call('bot_rate', { stars: stars, comment: $('rcomment') ? $('rcomment').value : '' }).then(function () { rated = stars; load(true); }).catch(function (er) { showError('rerr', er.message); });
        }
        var p = e.target.closest('[data-bpick]');
        if (p && !p.disabled) { p.disabled = true; return send({ pick: p.getAttribute('data-bpick'), ref: p.getAttribute('data-ref') }); }
        if (e.target.closest('[data-act="bot-handoff"]')) { call('bot_handoff').then(function () { load(true); }).catch(function (er) { showError('berr', er.message); }); }
      });
      $('bsend').addEventListener('submit', function (e) {
        e.preventDefault();
        var v = $('bmsg').value.trim();
        if (v) send({ text: v });
      });
    }
    load(true);
    every(4000, load);
  }

  var CLOCK = '<svg viewBox="0 0 24 24" aria-hidden="true" class="clk"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>';
  var TH_DAY = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  function botDayLabel(k, todayKey) {
    var d = new Date(k + 'T12:00:00+07:00'), date = d.toLocaleDateString('th-TH', { timeZone: TZ, day: 'numeric', month: 'short' });
    return k === todayKey ? 'วันนี้ · ' + date : TH_DAY[d.getUTCDay()] + ' ' + date;
  }
  // ---- ผู้ใช้: แชทย้อนหลัง (รายการวัน) ----
  function viewBotHistory() {
    call('bot_history').then(function (d) {
      var list = d.days.map(function (x) {
        var dt = new Date(x.day + 'T12:00:00+07:00');
        return '<a href="#" class="card bdl" data-bday="' + esc(x.day) + '"><span class="dd"><b>' + dt.getUTCDate() + '</b><small>' + dt.toLocaleDateString('th-TH', { timeZone: TZ, month: 'short' }) + '</small></span>' +
          '<span class="dt"><b>' + (x.day === d.today ? 'วันนี้' : TH_DAY[dt.getUTCDay()]) + '</b><span class="fq">' + esc(x.first || '–') + '</span><span class="tg3"><em>' + x.count + ' ข้อความ</em>' +
          (x.admin ? '<em class="a">คุยกับแอดมิน</em>' : '') + (x.stars ? '<em class="f">ให้ ' + x.stars + ' ขนนก</em>' : '') + '</span></span><span class="ar">›</span></a>';
      }).join('');
      app.innerHTML = shell('แชทย้อนหลัง', '<p class="sub">กับ' + BOT_NAME + ' · แสดงเฉพาะวันที่มีการคุย' + (d.purge ? ' · เก็บไว้ ' + d.keep_days + ' วัน' : '') + '</p>' +
        (list || '<p class="empty">ยังไม่มีแชทกับ' + BOT_NAME + '</p>'), { back: true });
      app.querySelectorAll('[data-bday]').forEach(function (a) {
        a.addEventListener('click', function (e) { e.preventDefault(); var k = a.getAttribute('data-bday'); if (k === d.today) navOpen('bot'); else navOpen('bot-day', k); });
      });
    }).catch(function (e) { handleAuthError(e); });
  }
  // ---- ผู้ใช้: แชทวันเก่า (อ่านอย่างเดียว) ----
  function viewBotDay() {
    var day = state.id;
    call('bot_thread', { day: day }).then(function (d) {
      app.innerHTML = '<div class="chatscreen botscreen ro"><header class="chathead"><div class="row gap"><button class="iconbtn" data-act="nav-back" aria-label="กลับ">' + icon('back') + '</button>' +
        '<span class="chtitle">' + botDayLabel(day, '') + ' <small>· แชทย้อนหลัง</small></span>' + (d.rated ? '<span class="btag">ให้ ' + d.rated + ' ขนนก</span>' : '') + '</div></header>' +
        '<div class="bchat">' + d.messages.map(function (m) { return botMsgHtml(m, false, ''); }).join('') + '</div>' +
        '<div class="composer bcomp bro"><p>ดูย้อนหลังได้อย่างเดียว พิมพ์ต่อหรือให้คะแนนไม่ได้</p><button type="button" class="btn ghost" data-today="1">กลับไปแชทวันนี้</button></div></div>';
      app.querySelector('[data-today]').addEventListener('click', function () { navOpen('bot'); });
    }).catch(function (e) { if (!handleAuthError(e)) app.innerHTML = shell('แชทย้อนหลัง', '<p class="empty">' + esc(e.message) + '</p>', { back: true }); });
  }

  // ---- แอดมิน: แชทผู้ช่วยของผู้ใช้หนึ่งคน ----
  function viewAdminBot() {
    var uid = state.id, key = '', flt = 'all';
    function draw(d) {
      var t = d.thread, hand = t.mode === 'handoff';
      var lb = lastBotMsgId(d.messages);
      app.innerHTML = '<div class="chatscreen botscreen adm"><header class="chathead"><div class="row gap"><button class="iconbtn" data-act="nav-back" aria-label="กลับ">' + icon('back') + '</button>' +
        '<span class="chtitle">' + esc(t.name) + ' <small>· แชทผู้ช่วย</small></span><span class="btag' + (hand ? ' hand' : '') + '">' + (hand ? (t.waiting ? 'รอแอดมิน' : 'แอดมินดูแล') : 'ผู้ช่วยดูแล') + '</span></div>' +
        (t.summary && hand ? '<div class="bsum"><em>สรุปจากผู้ช่วย</em>' + esc(t.summary) + '</div>' : '') +
        (d.orders.length ? '<div class="borders">' + d.orders.map(function (o) { return '<a href="#" data-job="' + esc(o.id) + '">' + esc(o.id) + ' · ' + esc(o.status) + '</a>'; }).join('') + '</div>' : '') +
        '<div class="bflt">' + [['all', 'ทั้งหมด'], ['7d', '7 วันล่าสุด'], ['admin', 'วันที่มีแอดมินคุย']].map(function (f) { return '<button type="button" data-flt="' + f[0] + '" class="' + (flt === f[0] ? 'on' : '') + '">' + f[1] + '</button>'; }).join('') + '</div>' +
        '</header><div class="bchat">' + adminDays(d.messages, lb) + '</div>' +
        '<div class="composer bcomp">' + (hand ? '<button type="button" class="btn ghost small closebtn" data-act="bot-close" data-confirm="กดอีกครั้งเพื่อปิดเรื่อง">ปิดเรื่อง ให้ผู้ช่วยกลับมาตอบ</button>' : '<p class="bnote">ผู้ช่วยกำลังตอบอยู่ ถ้าแอดมินพิมพ์ตอบ ผู้ช่วยจะหยุดตอบห้องนี้จนกว่าจะปิดเรื่อง</p>') +
        '<form class="send" id="asend"><input type="text" id="amsg" maxlength="300" placeholder="พิมพ์ตอบ ' + esc(t.name) + '" autocomplete="off"><button class="btn small">ส่ง</button></form><div id="aerr" class="error"></div></div></div>';
      $('asend').addEventListener('submit', function (e) {
        e.preventDefault();
        var v = $('amsg').value.trim();
        if (!v) return;
        call('bot_reply', { user_id: uid, text: v }).then(function () { load(true); }).catch(function (er) { showError('aerr', er.message); });
      });
      app.querySelectorAll('[data-flt]').forEach(function (b) { b.addEventListener('click', function () { flt = b.getAttribute('data-flt'); draw(d); }); });
      var cb = app.querySelector('[data-act="bot-close"]');
      if (cb) cb.addEventListener('click', function () {
        if (!cb.dataset.armed) { cb.dataset.armed = '1'; cb.textContent = cb.getAttribute('data-confirm'); return; }
        call('bot_close', { user_id: uid }).then(function () { load(true); }).catch(function (er) { showError('aerr', er.message); });
      });
      window.scrollTo(0, document.body.scrollHeight);
    }
    function adminDays(ms, lb) {
      var tk = dayKeyTz(new Date().toISOString()), from7 = dayKeyTz(new Date(Date.now() - 6 * 864e5).toISOString()), adm = {}, h = '', cur = null;
      ms.forEach(function (m) { if (m.role === 'admin') adm[dayKeyTz(m.created_at)] = 1; });
      ms.filter(function (m) { var k = dayKeyTz(m.created_at); return flt === 'all' || (flt === '7d' ? k >= from7 : adm[k]); }).forEach(function (m) {
        var k = dayKeyTz(m.created_at);
        if (k !== cur) { cur = k; h += '<span class="bday">' + botDayLabel(k, tk) + '</span>'; }
        h += botMsgHtml(m, true, lb);
      });
      return h || '<p class="empty">ไม่มีแชทในช่วงนี้</p>';
    }
    function load(force) {
      if (typing() && !force) return;
      return call('bot_admin_thread', { user_id: uid }).then(function (d) {
        var k = d.thread.mode + ':' + d.messages.length;
        if (k !== key || force) { key = k; draw(d); }
      }).catch(function (e) { if (!handleAuthError(e)) app.innerHTML = '<div class="error" style="display:block">' + esc(e.message) + '</div>'; });
    }
    load(true);
    every(4000, load);
  }

  // ---- แอดมิน: คิวแชท (รอแอดมิน / ผู้ช่วยดูแล / ในคำสั่ง / ปิดแล้ว) ----
  function botThreadRow(t) {
    return '<a href="#" class="conv" data-bthread="' + esc(t.user_id) + '"><span class="cav bird-av">' + BIRD + '</span><span class="cvb">' +
      '<span class="cva"><b>' + esc(t.name) + '</b>' + (t.reason_label && t.mode === 'handoff' ? '<span class="rtag">' + esc(t.reason_label) + '</span>' : '') + '<time>' + (t.last ? fmtClock(t.last.at) : '') + '</time></span>' +
      '<span class="cvl' + (t.unread ? ' unread' : '') + '"><span>' + (t.last ? (t.last.role === 'admin' ? 'คุณ: ' : t.last.role === 'bot' ? BOT_NAME + ': ' : '') + esc(t.last.text) : '') + '</span>' + (t.unread ? '<em>' + t.unread + '</em>' : '') + '</span></span></a>';
  }
  function waitCard(t) {
    var rc = /เสียหาย|เงิน|โต้แย้ง/.test(t.reason_label) ? 'red' : 'amb';
    return '<div class="card bq"><div class="bqh"><b>' + esc(t.name) + '</b><span class="rtag ' + rc + '">' + esc(t.reason_label) + '</span><small>' + (t.wait_min ? 'รอ ' + t.wait_min + ' นาที' : 'เพิ่งส่งต่อ') + '</small></div>' +
      '<div class="bsum"><em>สรุปจากผู้ช่วย</em>' + esc(t.summary) + '</div>' +
      '<div class="bqb"><button type="button" class="btn small" data-bthread="' + esc(t.user_id) + '">เปิดแชท</button>' +
      (t.last_order ? '<button type="button" class="btn ghost small" data-job="' + esc(t.last_order) + '">เปิดคำสั่ง ' + esc(t.last_order) + '</button>' : '') + '</div></div>';
  }
  function adminChatTabs(roomsHtml, orderUnread, closedUnread) {
    var tab = state.chatTab = /^(wait|bot|order|closed)$/.test(state.chatTab) ? state.chatTab : 'wait';
    return call('bot_queue').then(function (q) {
      var tabs = [['wait', 'รอแอดมิน', q.waiting.length], ['bot', 'ผู้ช่วยดูแล', 0], ['order', 'ในคำสั่ง', orderUnread || 0], ['closed', 'ปิดแล้ว', closedUnread || 0]];
      var h = '<div class="segtabs scroll">' + tabs.map(function (x) { return '<button data-act="chattab" data-tab="' + x[0] + '" class="' + (tab === x[0] ? 'on' : '') + '">' + x[1] + (x[2] ? ' <em>' + x[2] + '</em>' : '') + '</button>'; }).join('') + '</div>';
      if (tab === 'wait') {
        h += q.waiting.length ? q.waiting.map(waitCard).join('') : '<p class="empty">ไม่มีเรื่องที่รอแอดมิน</p>';
        if (q.talking.length) h += '<h2>กำลังคุยอยู่ <span class="count">' + q.talking.length + '</span></h2><div class="convlist">' + q.talking.map(botThreadRow).join('') + '</div>';
        h += '<p class="bnote">ส่งต่ออัตโนมัติเมื่อ: เรื่องเงินหรือคืนเงิน · ของเสียหาย · โต้แย้งโทษ · เปลี่ยนจุดส่ง · ผู้ใช้กดติดต่อแอดมิน · ผู้ช่วยถามกลับแล้วยังไม่ใช่</p>';
      } else if (tab === 'bot') {
        h += q.bot.length ? '<div class="convlist">' + q.bot.map(botThreadRow).join('') + '</div>' : '<p class="empty">ยังไม่มีผู้ใช้คุยกับผู้ช่วย</p>';
      } else if (tab === 'order') {
        h += roomsHtml(false);
      } else {
        h += (q.closed.length ? '<h2>แชทผู้ช่วย (ปิดเรื่องแล้ว)</h2><div class="convlist">' + q.closed.map(botThreadRow).join('') + '</div>' : '') + '<h2>แชทในคำสั่งที่ปิดแล้ว</h2>' + roomsHtml(true);
      }
      return h;
    });
  }

  // ---- แอดมิน: ภาพรวมผู้ช่วย AI ----
  function botStatsHtml(s) {
    var A = s.accuracy, max = Math.max.apply(null, s.by_intent.map(function (x) { return x.n; }).concat([1]));
    function stat(n, label) { return '<div class="stat"><b>' + n + '</b><span>' + label + '</span></div>'; }
    var opts = '<option value="">เลือกประเภทที่ถูก</option>' + s.intents.map(function (i) { return '<option value="' + i.key + '">' + esc(i.label) + '</option>'; }).join('');
    var R = s.report;
    var rep = '<div class="report"><div class="rhero"><span class="bav lg">' + BIRD + '</span><div><b>สมุดพก' + BOT_NAME + '</b><small>' + (R.ratings ? 'ให้ขนนก ' + R.ratings + ' ครั้ง จากผู้ใช้ ' + R.raters + ' คน' : 'ยังไม่มีผู้ใช้ให้ขนนก') + '</small></div>' +
      '<div class="grade"><b>' + (R.avg === null ? '–' : R.avg.toFixed(1)) + '</b><small>ขนนกเฉลี่ย</small></div></div>' +
      '<div class="stats three">' + stat(R.up_pct === null ? '–' : R.up_pct + '%', 'ตอบตรงใจ') + stat(R.fb, 'กดตอบตรงไหม') + stat(R.down, 'ยังไม่ตรง') + '</div>' +
      (R.by_intent.length ? '<div class="card bbars"><div class="bt">ตรงใจแยกตามเรื่อง <small>ต่ำสุดขึ้นก่อน</small></div>' + R.by_intent.map(function (x) {
        var w = x.pct < 70; return '<div class="br"><span>' + esc(x.label) + '</span><i><b class="' + (w ? 'w' : '') + '" style="width:' + Math.max(4, x.pct) + '%"></b></i><em class="' + (w ? 'w' : '') + '">' + x.pct + '%</em></div>'; }).join('') + '</div>' : '') +
      '<div class="card bteach"><div class="bt">คำตอบที่ผู้ใช้บอกว่ายังไม่ตรง <small>สอนใหม่ได้</small></div>' + (R.bad.length ? R.bad.map(function (x) {
        return '<div class="tq"><p>"' + esc(x.q_text || '–') + '" <span class="rtag red">' + esc(x.reason_label) + '</span><small>' + esc(x.user) + ' · ' + BOT_NAME + 'ตอบเรื่อง ' + esc(x.answered) + (x.q_label ? ' · เข้าใจว่า ' + esc(x.q_label) + ' ' + Math.round(x.q_conf * 100) + '%' : '') + '</small><small class="ans">คำตอบ: ' + esc(x.answer) + '</small></p>' +
          '<div class="row gap">' + (x.q_id && (x.reason === 'wrong' || !x.reason) ? '<select data-rsel="' + esc(x.id) + '">' + opts.replace('value="' + x.answered_key + '"', 'value="' + x.answered_key + '" selected') + '</select><button type="button" class="btn small" data-reteach="' + esc(x.id) + '" data-q="' + esc(x.q_id) + '">สอนใหม่</button>' : '') +
          '<button type="button" class="btn ghost small" data-fbdone="' + esc(x.id) + '">' + (x.reason === 'wrong' || !x.reason ? 'ข้าม' : x.reason === 'admin' ? 'รับทราบ (คุยในแชทแล้ว)' : 'รับทราบ ปรับคำตอบแล้ว') + '</button></div></div>';
      }).join('') : '<p class="muted">ยังไม่มีคำตอบที่ถูกบอกว่าไม่ตรง</p>') + '</div>' +
      (R.comments.length ? '<div class="card bteach"><div class="bt">คำชมและคำแนะนำล่าสุด</div>' + R.comments.map(function (c) {
        return '<div class="cmt">' + featherRow(c.stars) + '<div><p>' + esc(c.comment) + '</p><small>' + esc(c.user) + ' · ' + fmtTime(c.at) + '</small></div></div>'; }).join('') + '</div>' : '') + '</div>';
    return '<h2>ผู้ช่วย AI (' + BOT_NAME + ') <span class="count">7 วันล่าสุด</span></h2>' + rep +
      '<div class="stats">' + stat(s.questions, 'คำถามถึงผู้ช่วย') + stat(s.solved_pct === null ? '–' : s.solved_pct + '%', 'ผู้ช่วยตอบจบเอง' + (s.questions ? ' (' + s.solved + ' ครั้ง)' : '')) +
        stat(s.handoffs, 'ส่งต่อแอดมิน') + stat(s.admin_wait_min === null ? '–' : s.admin_wait_min + ' <small>นาที</small>', 'แอดมินตอบเฉลี่ย · ผู้ช่วยตอบทันที') + '</div>' +
      (s.by_intent.length ? '<div class="card bbars"><div class="bt">ประเภทคำถาม <small>AI จำแนก</small></div>' + s.by_intent.map(function (x) {
        return '<div class="br"><span>' + esc(x.label) + '</span><i><b class="' + (x.key === 'unsure' ? 'g' : '') + '" style="width:' + Math.round(x.n / max * 100) + '%"></b></i><em>' + x.n + '</em></div>'; }).join('') + '</div>' : '') +
      '<div class="card bteach"><div class="bt">คำถามที่ผู้ช่วยไม่เข้าใจ <small>สอนเพิ่มได้ · มั่นใจต่ำกว่า ' + Math.round(s.threshold * 100) + '%</small></div>' +
        (s.low.length ? s.low.map(function (q) {
          return '<div class="tq"><p>"' + esc(q.text) + '" <small>' + esc(q.user) + ' · เดาว่า ' + esc(q.guess_label) + ' ' + Math.round(q.conf * 100) + '%</small></p>' +
            '<div class="row gap"><select data-tsel="' + esc(q.id) + '">' + opts.replace('value="' + q.guess + '"', 'value="' + q.guess + '" selected') + '</select><button type="button" class="btn small" data-teach="' + esc(q.id) + '">เพิ่มเป็นตัวอย่าง</button></div></div>';
        }).join('') : '<p class="muted">ยังไม่มีคำถามที่ผู้ช่วยไม่เข้าใจ</p>') + '</div>' +
      '<div class="card bacc">' + icon('check') + '<div><b>ชุดทดสอบความแม่นยำ ' + A.total + ' ประโยค · จำแนกถูก ' + A.correct + ' (' + Math.round(A.correct / A.total * 100) + '%)</b>' +
        '<span>ตอบได้ทันที ' + A.direct + ' · ถามกลับก่อน ' + (A.total - A.direct) + ' · ประโยคที่ใช้สอน ' + A.train + (s.taught ? ' (แอดมินสอนเพิ่ม ' + s.taught + ')' : '') + '</span>' +
        '<details><summary>ดูผลทีละประโยค</summary><ol>' + A.rows.map(function (r) { return '<li class="' + (r.ok ? '' : 'bad') + '">' + esc(r.text) + ' <small>→ ' + esc(r.got_label) + ' ' + Math.round(r.conf * 100) + '%' + (r.ok ? '' : ' (ควรเป็น ' + esc(r.want_label) + ')') + '</small></li>'; }).join('') + '</ol></details></div></div>';
  }

  // ---------- ตรวจฟอร์มเอง (แทนกล่องเตือนของเบราว์เซอร์ ให้ข้อความเป็นภาษาไทยเหมือนกันทุกเครื่อง) ----------
  function fieldLabel(el) {
    var wrap = el.closest('.field');
    var span = wrap && wrap.querySelector('span, .lbl');
    if (!span) return 'ข้อมูล';
    return (span.childNodes[0] ? span.childNodes[0].textContent : span.textContent).trim();
  }
  function fieldError(el, msg) {
    var anchor = el.closest('.choice') || el.closest('.pwwrap') || el;
    var box = anchor.parentNode.querySelector(':scope > .fielderr');
    if (!box) {
      box = document.createElement('small');
      box.className = 'fielderr';
      anchor.insertAdjacentElement('afterend', box);
    }
    box.textContent = msg || '';
    box.style.display = msg ? 'block' : 'none';
    if (!el.closest('.choice')) el.classList.toggle('invalid', !!msg);
  }
  function validateForm(form) {
    var first = null;
    Array.prototype.forEach.call(form.querySelectorAll('input, select, textarea, [data-need]'), function (el) {
      if (el.hasAttribute('data-need')) { // กล่องแนบรูป: นับจำนวนรูปที่แนบ
        var need = Number(el.getAttribute('data-need')), got = el.querySelectorAll('img').length;
        var pm = got < need ? (el.getAttribute('data-need-msg') || 'กรุณาแนบรูปของอย่างน้อย ' + need + ' รูป') : '';
        fieldError(el, pm);
        if (pm && !first) first = el;
        return;
      }
      if (el.type === 'radio' || el.type === 'hidden' || el.type === 'file' || el.disabled) return;
      var v = el.value.trim(), msg = '';
      var label = fieldLabel(el);
      var min = el.getAttribute('minlength');
      if (el.required && !v) msg = (el.tagName === 'SELECT' ? 'กรุณาเลือก' : 'กรุณากรอก') + label;
      else if (v && el.hasAttribute('data-phone') && !/^0[689]\d{8}$/.test(v)) msg = 'เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 06, 08 หรือ 09';
      else if (v && min && v.length < Number(min)) msg = label + 'ต้องมีอย่างน้อย ' + min + ' ตัว';
      fieldError(el, msg);
      if (msg && !first) first = el;
    });
    if (first) { if (first.hasAttribute('data-need')) first.scrollIntoView({ block: 'center' }); else first.focus(); }
    return !first;
  }
  // ปิดกล่องเตือนของเบราว์เซอร์ในทุกฟอร์มที่สร้างขึ้น
  new MutationObserver(function () {
    Array.prototype.forEach.call(app.querySelectorAll('form:not([novalidate])'), function (f) { f.setAttribute('novalidate', ''); });
    Array.prototype.forEach.call(app.querySelectorAll('input[type=password]:not([data-eye])'), function (inp) {
      inp.setAttribute('data-eye', '');
      var wrap = document.createElement('span');
      wrap.className = 'pwwrap';
      inp.parentNode.insertBefore(wrap, inp);
      wrap.appendChild(inp);
      wrap.insertAdjacentHTML('beforeend', '<button type="button" class="eye" aria-label="แสดงรหัสผ่าน">' + icon('eye') + '</button>');
    });
  }).observe(app, { childList: true, subtree: true });
  // ตรวจก่อนส่งทุกฟอร์ม (ทำงานก่อนตัวจัดการของแต่ละหน้า)
  app.addEventListener('submit', function (e) {
    if (!validateForm(e.target)) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  app.addEventListener('input', function (e) {
    if (e.target.classList && e.target.classList.contains('invalid')) fieldError(e.target, '');
    // แก้ข้อมูลแล้ว ข้อความผิดพลาดของครั้งก่อนหายไป (ยกเว้นตอนบัญชีถูกล็อกอยู่)
    var form = e.target.closest && e.target.closest('form');
    var box = form && form.querySelector('.error');
    if (box && box.style.display === 'block' && !form.dataset.locked) showError(box.id, '');
  });
  app.addEventListener('input', function (e) {
    var el = e.target;
    if (!el.hasAttribute || !el.hasAttribute('data-phone')) return;
    var clean = el.value.replace(/\D/g, '').slice(0, 10);
    if (clean !== el.value) {
      el.value = clean;
      fieldError(el, 'กรอกได้เฉพาะตัวเลข');
      setTimeout(function () { if (el.isConnected) fieldError(el, ''); }, 2500);
    }
  });
  app.addEventListener('change', function (e) {
    if (e.target.tagName === 'SELECT') fieldError(e.target, '');
  });

  // ---------- เส้นทาง ----------
  var VIEWS = {
    'u-home': viewUserHome, 'u-new': viewNew, 'u-orders': viewOrders, 'u-incoming': viewUserIncoming,
    'a-orders': viewAdminOrders, 'a-home': viewAdminHome, resetpw: viewResetPw, pricing: viewPricing,
    profile: viewProfile, job: viewJob, history: viewHistory, activity: viewActivity, points: viewPoints, 'points-all': viewPointsAll,
    editprofile: viewEditProfile, changepw: viewChangePw, deleteacc: viewDeleteAcc, 'force-pw': viewForcePw, chats: viewChats, chat: viewChat, bot: viewBot, 'a-bot': viewAdminBot, 'bot-history': viewBotHistory, 'bot-day': viewBotDay,
  };
  var ALLOWED = {
    user: ['u-home', 'u-new', 'u-orders', 'u-incoming', 'profile', 'job', 'chats', 'chat', 'history', 'activity', 'points', 'points-all', 'editprofile', 'changepw', 'deleteacc', 'bot', 'bot-history', 'bot-day'],
    admin: ['a-orders', 'a-home', 'profile', 'job', 'chats', 'chat', 'activity', 'editprofile', 'changepw', 'resetpw', 'pricing', 'a-bot'],
  };
  function render(authMode) {
    clearTimers();
    state.doAct = null; state.histAct = null;
    if (!me || state.view === 'auth') { if (fab) fab.hidden = true; fabHideTipSoft(); return viewAuth(authMode); }
    if (me.must_change) state.view = 'force-pw';
    else if (ALLOWED[me.role].indexOf(state.view) < 0) state.view = home();
    document.body.className = 'role-' + me.role;
    VIEWS[state.view]();
    if (me.role === 'admin' && !adminBadges) setTimeout(refreshBotBadge, 300); // ตัวเลขเมนูล่างครั้งแรกหลังเข้าสู่ระบบ
    if (state.view !== "chats") refreshChatBadge();
    updateFab(); refreshBotBadge();
  }

  app.addEventListener('click', function (e) {
    var eye = e.target.closest('.eye');
    if (eye) {
      var inp = eye.parentNode.querySelector('input');
      var show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      eye.innerHTML = icon(show ? 'eyeoff' : 'eye');
      eye.setAttribute('aria-label', show ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน');
      return;
    }
    var t = e.target.closest('[data-go],[data-chat],[data-job],[data-auth],[data-act],[data-do],[data-hist],[data-page],[data-svc],[data-qact],[data-bthread]');
    if (!t) return;
    if (t.tagName === 'A' || t.tagName === 'BUTTON') e.preventDefault();
    if (t.hasAttribute('data-go')) return go(t.getAttribute('data-go'));
    if (t.hasAttribute('data-bthread')) return navOpen('a-bot', t.getAttribute('data-bthread'));
    if (t.hasAttribute('data-chat')) return navOpen('chat', t.getAttribute('data-chat'), t.getAttribute('data-room') || 'sender');
    if (t.hasAttribute('data-job')) return navOpen('job', t.getAttribute('data-job'));
    if (t.hasAttribute('data-hist')) return navOpen('history', t.getAttribute('data-hist'));
    if (t.hasAttribute('data-page')) return navOpen(t.getAttribute('data-page'));
    if (t.hasAttribute('data-svc')) { state.service = t.getAttribute('data-svc'); return navOpen('u-new'); }
    if (t.hasAttribute('data-qact')) return state.quickAct && state.quickAct(t);
    if (t.hasAttribute('data-auth')) { state.view = 'auth'; return render(t.getAttribute('data-auth')); }
    if (t.hasAttribute('data-do') && state.doAct) {
      if (t.hasAttribute('data-confirm') && !t.dataset.armed) { // กดครั้งแรก = เตือน กดครั้งที่สอง = ทำจริง
        t.dataset.armed = '1'; t.dataset.label = t.innerHTML; t.textContent = t.getAttribute('data-confirm');
        setTimeout(function () { if (t.isConnected && t.dataset.armed) { delete t.dataset.armed; t.innerHTML = t.dataset.label; } }, 5000);
        return;
      }
      return state.doAct(t.getAttribute('data-do'));
    }
    var a = t.getAttribute('data-act');
    if (state.histAct && /^(histf|histshow|hide|histundo|otab|ohid|ohide)$/.test(a)) return state.histAct(a, t);
    if (a === 'maptoggle') {
      var box = t.closest('.routebox'), w = box.querySelector('.mapwrap'), open = w.hidden;
      w.hidden = !open; box.classList.toggle('open', open);
      t.innerHTML = '<span>' + (open ? 'ซ่อน' : 'ดูเส้นทาง') + '</span>' + icon(open ? 'up' : 'down');
      if (open) mountMaps();
      return;
    }
    if (a === 'logout') { call('logout').finally(function () { setToken(null); me = null; go('auth'); }); }
    if (a === 'chat-back' || a === 'nav-back') return navBack();
    if (a === 'chattab') { state.chatTab = t.getAttribute('data-tab'); render(); return; }
    if (a === 'more-logs') { app.querySelectorAll('.logday.more, .loglist2.more, .logrow.more').forEach(function (el) { el.hidden = false; }); t.remove(); }
    if (a === 'contact') return openContact();
    if (a === 'show-pw') { $('pwbox').style.display = 'block'; t.style.display = 'none'; $('pwnote').innerHTML = ''; $('cpf').old_password.focus(); }
    if (a === 'show-delete') { $('delf').style.display = 'block'; t.style.display = 'none'; }
    if (a === 'reset' && local && confirmReset(t)) { createLocalStore().reset(); setToken(null); me = null; go('auth'); }
  });

  // ยืนยันล้างข้อมูลด้วยการกดปุ่มซ้ำ (ไม่ใช้กล่อง confirm ของเบราว์เซอร์)
  function confirmReset(btn) {
    if (btn.dataset.armed) return true;
    btn.dataset.armed = '1';
    btn.textContent = 'กดอีกครั้งเพื่อยืนยันล้างข้อมูล';
    setTimeout(function () { if (btn.isConnected) { delete btn.dataset.armed; btn.textContent = 'ล้างข้อมูลทดสอบทั้งหมด (โหมดไฟล์ HTML)'; } }, 4000);
    return false;
  }

  // ---------- ออกจากระบบอัตโนมัติเมื่อไม่มีการใช้งาน ----------
  var IDLE_MS = CONFIG.IDLE_LOGOUT_MINUTES * 60000, lastActive = Date.now(), lastSaved = 0;
  function markActive() {
    lastActive = Date.now();
    if (lastActive - lastSaved > 15000) { lastSaved = lastActive; try { box() && box().setItem('songtor-active', String(lastActive)); } catch (e) {} }
  }
  ['pointerdown', 'keydown', 'touchstart', 'wheel'].forEach(function (ev) { document.addEventListener(ev, markActive, { passive: true }); });
  function idleLogout() {
    var tok = getToken();
    setToken(null); me = null;
    if (tok) call('logout').catch(function () {});
    state.authNotice = { text: 'ออกจากระบบอัตโนมัติ เนื่องจากไม่มีการใช้งานเกิน ' + CONFIG.IDLE_LOGOUT_MINUTES + ' นาที', kind: 'bad' };
    state.view = 'auth'; render('login');
  }
  setInterval(function () {
    if (!me) return;
    var shared = 0; try { shared = Number(box() && box().getItem('songtor-active')) || 0; } catch (e) {}
    if (Date.now() - Math.max(lastActive, shared) >= IDLE_MS) idleLogout(); // ใช้งานแท็บอื่นอยู่ก็ยังไม่ออก
  }, 5000);
  // ปิดแท็บไปนานแล้วกลับมาเปิดใหม่ (เวอร์ชัน Google จำการเข้าสู่ระบบไว้)
  try {
    var savedActive = Number(box() && box().getItem('songtor-active'));
    if (getToken() && savedActive && Date.now() - savedActive >= IDLE_MS) { var oldTok = getToken(); setToken(null); memToken = oldTok; call('logout').catch(function () {}); memToken = null;
      state.authNotice = { text: 'ออกจากระบบอัตโนมัติ เนื่องจากไม่มีการใช้งานเกิน ' + CONFIG.IDLE_LOGOUT_MINUTES + ' นาที', kind: 'bad' }; }
  } catch (e) {}
  markActive();

  // เริ่มต้น: ถ้ามี token อยู่แล้ว เข้าหน้าหลักของบทบาทเลย
  if (getToken()) {
    call('session').then(function (s) { me = s.me; state.view = home(); render(); })
      .catch(function (e) { if (!handleAuthError(e)) { setToken(null); render(); } });
  } else {
    render();
  }
})();
