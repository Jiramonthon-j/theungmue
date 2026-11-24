// ===================== ค่าตั้งต้นของระบบ =====================
// แก้ชื่อจุดรับ-ส่งให้ตรงกับสถานที่จริงในมหาวิทยาลัยได้ที่นี่
var CONFIG = {
  APP_NAME: 'TheungMue',
  APP_NAME_TH: 'ถึงมือ',
  TAGLINE: 'ส่งของถึงมือ ในรั้วมหาวิทยาลัย',
  // จุดรับฝากของประจำ: ผู้ใช้นำของมาวางที่นี่ ไรเดอร์รับของที่นี่ทุกคำสั่ง (ผู้ใช้ไม่ต้องเลือกจุดรับ)
  DROP_POINT: 'จุดรับฝากของ TheungMue',
  DROP_POINT_NOTE: 'นำของมาฝากที่จุดนี้ ชำระค่าบริการเป็นเงินสดตอนไรเดอร์รับของ',
  DROP_POINT_PLACE: 'หน้าคณะวิศวกรรมศาสตร์ (ใกล้ป้อมยาม)',
  DROP_POINT_LL: [13.7790615, 100.5612098], // พิกัดคณะวิศวกรรมศาสตร์จาก Google Maps (เดิม: หน้าอาคาร 24 ตึกเรือใบ [13.7788455, 100.5602821])
  // พิกัดสถานที่ส่ง + ระยะเดินจากจุดรับฝาก (เมตร)
  // ระยะ (m) คำนวณอัตโนมัติจาก DROP_POINT_LL ตอนโหลด = ระยะเส้นตรง × 1.3 (ประมาณระยะเดิน) ปัดหลักสิบ ขั้นต่ำ 30 ม. — ย้ายจุดรับฝากแก้แค่ DROP_POINT_LL
  // เวอร์ชัน Google จะแทนด้วยระยะเดินจริงจาก Apps Script
  // ห้องสมุด: ใช้ตามหน้า UTCC Spaces (อาคาร 24 ชั้น 5–6) แม้ Google Maps จะปักไว้ใกล้ศูนย์อาหาร
  PLACES: {
    'อาคาร 1': { ll: [13.7792192, 100.5599488], m: 70 },
    'อาคาร 3': { ll: [13.7792272, 100.5605539], m: 70 },
    'อาคาร 5 (บัณฑิตวิทยาลัย)': { ll: [13.7808328, 100.5605981], m: 290 },
    'อาคาร 9 (คณะนิเทศศาสตร์)': { ll: [13.7795542, 100.5602957], m: 100 },
    'อาคาร 21 (ISM วิทยาลัยนานาชาติ)': { ll: [13.7803902, 100.5609722], m: 240 },
    'อาคาร 22': { ll: [13.7799344, 100.5611439], m: 200 },
    'อาคาร 23 (คณะนิติศาสตร์)': { ll: [13.7798017, 100.5611454], m: 180 },
    'อาคาร 24 (อาคารสัญลักษณ์)': { ll: [13.7788455, 100.5602821], m: 30 },
    'คณะบัญชี': { ll: [13.7788258, 100.5598112], m: 70 },
    'คณะเศรษฐศาสตร์': { ll: [13.7803928, 100.5604658], m: 230 },
    'คณะวิศวกรรมศาสตร์': { ll: [13.7790615, 100.5612098], m: 130 },
    'สำนักทะเบียนและประมวลผล': { ll: [13.7790238, 100.5599591], m: 50 },
    'หอประชุม': { ll: [13.7799984, 100.55994], m: 170 },
    'ห้องสมุด (อาคาร 24 ชั้น 5–6)': { ll: [13.7788455, 100.5602821], m: 30 },
    'ศูนย์อาหาร (อาคาร 8 ชั้น 1)': { ll: [13.7804024, 100.5601014], m: 230 },
    'ฟิตเนส UTCC': { ll: [13.7782264, 100.5603973], m: 90 },
  },
  WALK_M_PER_MIN: 75, // ความเร็วเดินโดยประมาณ (เมตร/นาที) ใช้บอกเวลาเดินในหน้าสั่งบริการ
  // ระดับระยะจากจุดรับฝาก
  TIERS: [{ max: 100, label: 'ระยะใกล้' }, { max: 200, label: 'ระยะกลาง' }, { max: 1e9, label: 'ระยะไกล' }],
  // ค่าบริการ (บาท) = ตามแบบการส่ง + ตามระยะ + ประเภทของที่ต้องดูแลเพิ่ม · จ่ายเงินสดตอนไรเดอร์รับของที่จุดรับฝาก
  PRICE: {
    BASE: { normal: 10, urgent: 20 },
    DIST: [0, 3, 5], // ใกล้ / กลาง / ไกล
    ITEM_EXTRA: { 'อาหาร / เครื่องดื่ม': 5, 'พัสดุกล่องใหญ่': 5, 'ของเปราะบาง': 5 },
  },
  // ใช้ Point ลดค่าบริการ: 2 Point = 1 บาท (10 Point = ฿5) ลดได้ไม่เกินครึ่งหนึ่งของค่าบริการ · ยกเลิกคำสั่งแล้วคืน Point
  POINT_USE: { PER_BAHT: 2, MAX_RATIO: 0.5 },
  // Point ที่ได้เมื่อคำสั่งสำเร็จ (ได้อัตโนมัติ) = ตามแบบการส่ง + ตามระยะ
  POINTS: { BASE: { normal: 2, urgent: 3 }, DIST: [0, 1, 2] },
  // วิธีชำระ: จ่ายตอนฝากของ (ผู้สั่งจ่าย) / เก็บเงินปลายทาง (ผู้รับจ่าย) — คนที่จ่ายเป็นคนใช้และได้ Point
  PAY_METHODS: {
    sender: { label: 'จ่ายตอนฝากของ', hint: 'ผู้สั่งจ่ายเงินสดเมื่อไรเดอร์รับของที่จุดรับฝาก' },
    cod: { label: 'เก็บเงินปลายทาง', hint: 'ผู้รับจ่ายเงินสดตอนได้รับของ · ผู้รับต้องกดยอมรับก่อนแอดมินยืนยันคำสั่ง' },
  },
  // ปฏิเสธรับของแบบเก็บเงินปลายทาง (หลังไรเดอร์ออกนำส่ง) ที่เป็นความผิดของผู้รับ
  REFUSE: { PENALTY: 5, LIMIT: 2, WINDOW_DAYS: 30, BAN_DAYS: 30, WAIT_MIN: 10, CALLS: 2, CALL_GAP_MIN: 5, HOLD_DAYS: 3 },
  // ส่งช้า: ไม่เกิน GRACE_MIN บันทึกอย่างเดียว / เกิน ชดเชย Point ให้คนที่จ่าย / เกิน COD_FREE_MIN ผู้รับปลายทางปฏิเสธได้โดยไม่ถูกหัก
  LATE: { GRACE_MIN: 10, COMP_POINTS: 2, COD_FREE_MIN: 30, PENDING_WARN_MIN: 10, NEAR_DUE_MIN: 15 },
  // เหตุผลส่งไม่สำเร็จ: fault = คนที่ผิด (recipient / sender / shop) · verdict = แอดมินเลือกคนผิดเองหลังเทียบรูป 3 ช่วง
  FAIL_REASONS: {
    no_pay: { label: 'เจอผู้รับ แต่ไม่จ่าย / เปลี่ยนใจ / ไม่มีเงิน', fault: 'recipient', by: 'admin' },
    not_found: { label: 'ไม่พบผู้รับ ติดต่อไม่ได้', fault: 'recipient', by: 'admin' },
    item_mismatch: { label: 'ผู้รับตรวจแล้ว ของไม่ตรง / ไม่ครบ', verdict: true, by: 'admin' },
    item_damaged: { label: 'ของเสียหาย', verdict: true, by: 'admin' },
    wrong_person: { label: 'ผู้สั่งส่งผิดคน / ไม่ใช่ของผู้รับ', fault: 'sender', by: 'both' },
    shop_late: { label: 'ส่งไม่ทันกำหนด', fault: 'shop', by: 'admin' },
    changed_mind: { label: 'เปลี่ยนใจ ไม่ต้องการแล้ว', fault: 'recipient', by: 'recipient' },
    cannot_pay: { label: 'ไม่สะดวกจ่ายเงิน', fault: 'recipient', by: 'recipient' },
    late: { label: 'ส่งช้าเกินกำหนด', fault: 'shop', by: 'recipient' },
  },
  FAULT_LABEL: { recipient: 'ผู้รับ', sender: 'ผู้สั่ง', shop: 'TheungMue' },
  MAX_PENDING: 5, // คำสั่งที่ยังรอยืนยันได้สูงสุดต่อคน (กันสั่งรัว)
  COD_WAIT_HOURS: 24, // เก็บเงินปลายทาง: ผู้รับต้องตอบรับภายในกี่ชั่วโมง ไม่งั้นยกเลิกอัตโนมัติ
  CODE_MAX_TRIES: 5, // ใส่รหัสรับของผิดได้กี่ครั้ง
  CODE_LOCK_MIN: 10, // ผิดครบแล้วล็อกการใส่รหัสกี่นาที
  // บริการบนหน้าแรก (กดแล้วเลือกแบบการส่ง/ประเภทของให้ล่วงหน้า)
  SERVICES: [
    { key: 'normal', label: 'ส่งปกติ', hint: 'ภายใน 1 วัน ตามคิว', mode: 'normal', item: '', icon: 'box' },
    { key: 'urgent', label: 'ส่งด่วน', hint: 'ภายใน 1–2 ชม. เลือกเวลาได้', mode: 'urgent', item: '', icon: 'clock' },
    { key: 'doc', label: 'ส่งเอกสาร / ชีท', hint: 'ซองเอกสาร งานพิมพ์', mode: 'normal', item: 'เอกสาร / ชีท', icon: 'doc' },
    { key: 'food', label: 'ส่งอาหาร / เครื่องดื่ม', hint: 'ของกินชิ้นเล็ก ถือไปได้', mode: 'normal', item: 'อาหาร / เครื่องดื่ม', icon: 'bag' },
  ],
  // จุดส่งของในมหาวิทยาลัยหอการค้าไทย (ชื่ออาคาร/พื้นที่อ้างอิงจากหน้า UTCC Spaces ของมหาวิทยาลัย)
  // จุดส่ง: เฉพาะสถานที่สำคัญที่มีพิกัดยืนยันจาก Google Maps (ไม่มี "อื่นๆ" เพื่อให้คิดระยะ/เครดิตได้ทุกงาน)
  ZONE_GROUPS: [
    { label: 'อาคารเรียนและคณะ', items: ['อาคาร 1', 'อาคาร 3', 'อาคาร 5 (บัณฑิตวิทยาลัย)', 'อาคาร 9 (คณะนิเทศศาสตร์)', 'อาคาร 21 (ISM วิทยาลัยนานาชาติ)', 'อาคาร 22', 'อาคาร 23 (คณะนิติศาสตร์)', 'อาคาร 24 (อาคารสัญลักษณ์)', 'คณะบัญชี', 'คณะเศรษฐศาสตร์', 'คณะวิศวกรรมศาสตร์'] },
    { label: 'สำนักงานและบริการ', items: ['สำนักทะเบียนและประมวลผล', 'หอประชุม', 'ห้องสมุด (อาคาร 24 ชั้น 5–6)'] },
    { label: 'อาหารและกีฬา', items: ['ศูนย์อาหาร (อาคาร 8 ชั้น 1)', 'ฟิตเนส UTCC'] },
  ],
  ZONE_OTHER: 'อื่นๆ (ระบุสถานที่)', // เลิกใช้แล้ว เก็บไว้แสดงงานเก่าเท่านั้น
  ITEM_TYPES: ['เอกสาร / ชีท', 'พัสดุกล่องเล็ก', 'พัสดุกล่องใหญ่', 'อาหาร / เครื่องดื่ม', 'ของเปราะบาง', 'อื่นๆ'],
  MODES: {
    urgent: { label: 'ด่วน', hint: 'ส่งภายใน 1–2 ชม. กำหนดเวลาที่ต้องถึงได้', hours: 2 },
    normal: { label: 'ปกติ', hint: 'ส่งภายใน 1 วัน เรียงตามคิว', hours: 24 },
  },
  ROLES: { user: 'ผู้ใช้', admin: 'แอดมิน' },
  URGENT_LEAD_MINUTES: 30, // งานด่วน: เวลาที่เลือกต้องห่างจากตอนแจ้งอย่างน้อยกี่นาที (เผื่อคนส่งกดรับ ไปรับของ และไปส่ง)
  PHOTO_MIN: 1, // ต้องแนบรูปของอย่างน้อยกี่รูป
  PHOTO_MAX: 5, // แนบได้มากสุดกี่รูป
  PROOF_MIN: 1, // ร้านต้องถ่ายรูปหลักฐานตอนรับของ/ตอนส่งถึงอย่างน้อยกี่รูป
  PROOF_MAX: 3, // และมากสุดกี่รูป
  SESSION_DAYS: 7, // อยู่ในระบบได้กี่วันก่อนต้องล็อกอินใหม่
  MAX_PASSWORD_FAILS: 5, // ใส่รหัสผ่านผิดครบกี่ครั้งจึงล็อกบัญชีชั่วคราว
  LOCK_MINUTES: 10, // ล็อกบัญชีกี่นาที
  IDLE_LOGOUT_MINUTES: 10, // ไม่มีการใช้งานกี่นาทีจึงออกจากระบบอัตโนมัติ
  // ข้อความในหน้า "ลืมรหัสผ่าน" — แก้เป็นช่องทางติดต่อจริงได้ (เช่น LINE หรือเบอร์โทรแอดมิน)
  ADMIN_CONTACT: 'ติดต่อแอดมิน TheungMue ได้ที่ LINE ID: nice1162 พร้อมแจ้งชื่อผู้ใช้ และเบอร์โทรศัพท์',
  TIMEZONE: 'Asia/Bangkok',
  // สถานะคำสั่ง: รอแอดมินยืนยัน → ยืนยันแล้ว รอรับของ → รับของแล้ว → กำลังนำส่ง → สำเร็จ (หรือยกเลิก)
  STATUS: {
    pending: 'รอยืนยัน',
    confirmed: 'รอรับของ',
    picked: 'รับของแล้ว',
    delivering: 'กำลังนำส่ง',
    delivered: 'สำเร็จ',
    cancelled: 'ยกเลิก',
  },
  // ข้อความด่วนในแชท
  CHAT_PRESETS: {
    sender: ['วางของที่จุดรับฝากแล้ว', 'ของถึงหรือยัง', 'ขอเปลี่ยนจุดส่ง', 'ขอยกเลิกคำสั่ง'],
    recipient: ['ของถึงหรือยัง', 'ถึงจุดส่งแล้ว รออยู่', 'ขอเลื่อนประมาณ 10 นาที', 'ขอเลื่อนประมาณ 30 นาที', 'ขอเปลี่ยนจุดส่ง'],
    shop: ['ได้รับคำสั่งแล้ว', 'รับของที่จุดรับฝากแล้ว', 'กำลังนำส่ง', 'ถึงจุดส่งแล้ว รบกวนเตรียมรหัสรับของ', 'ยังไม่พบของที่จุดรับฝาก', 'ตกลง เลื่อนเวลาให้ได้'],
  },
  // บัญชีทดลอง (ไม่ใช้ข้อมูลจริง) — รหัสผ่านทุกบัญชี: demo1234
  // v2: ไม่มีบัญชีคนส่ง ร้าน (แอดมิน) รับคำสั่ง รับของ และนำส่งเอง
  DEMO_PASSWORD: 'demo1234',
  SEED_USERS: [
  // points = Point ตั้งต้นสำหรับทดสอบการใช้ส่วนลด (เฉพาะโหมดทดลอง · u04 ไม่มี Point ไว้ทดสอบกรณีใช้ส่วนลดไม่ได้)
    { id: 'U01', username: 'u01', name: 'User U01', phone: '0800000001', role: 'user', points: 20 },
    { id: 'U02', username: 'u02', name: 'User U02', phone: '0800000002', role: 'user', points: 20 },
    { id: 'U03', username: 'u03', name: 'User U03', phone: '0800000003', role: 'user', points: 10 },
    { id: 'U04', username: 'u04', name: 'User U04', phone: '0800000004', role: 'user', points: 0 },
    { id: 'A01', username: 'admin', name: 'Admin', phone: '0800000099', role: 'admin' },
  ],
};

CONFIG.ZONES = CONFIG.ZONE_GROUPS.reduce(function (a, g) { return a.concat(g.items); }, []);

var SCHEMA = {
  Users: ['id', 'username', 'name', 'phone', 'role', 'pass_hash', 'salt', 'status', 'created_at', 'failed_count', 'locked_until', 'must_change', 'bonus_points', 'status_note'],
  Sessions: ['token', 'user_id', 'created_at', 'expires_at', 'revoked'],
  Jobs: ['id', 'created_at', 'sender_id', 'recipient_id', 'service', 'item_type', 'item_detail', 'pickup_zone', 'pickup_detail',
    'dropoff_zone', 'dropoff_detail', 'mode', 'due_at', 'note', 'status', 'confirmed_at', 'picked_at', 'paid_at', 'delivering_at',
    'delivered_at', 'cancelled_at', 'cancel_reason', 'cancel_note', 'returned_at', 'code', 'code_fails', 'code_lock_until',
    'photo_count', 'pickup_photo_count', 'delivery_photo_count',
    'price_base', 'price_dist', 'price_item', 'subtotal', 'points_used', 'discount', 'total', 'points_earned',
    'hidden_sender', 'hidden_recipient', // ซ่อนจากประวัติของแต่ละฝ่าย (ไม่ลบข้อมูลจริง)
    'pay_method', 'payer_id', 'cod_status', 'cod_at', 'arrived_at', 'contact_log', 'late_min', 'late_excused', 'comp_points',
    'fail_reason', 'fail_fault', 'fail_note', 'fail_photo_count', 'penalty_points', 'penalty_user', 'appeal_text', 'appeal_at', 'appeal_result', 'appeal_done_at',
    'refund_amount', 'refunded_at', 'keep_until', 'disposed_at', 'dispose_note', 'remind_at'], // ส่งไม่สำเร็จเพราะ TheungMue: คืนเงินสดให้ผู้สั่งตอนมารับของคืน
  // รูปของคำสั่ง: stage = item (ผู้สั่งแนบ) / pickup (ร้านถ่ายตอนรับของ) / delivery (ร้านถ่ายตอนส่งถึง)
  Photos: ['id', 'job_id', 'idx', 'data', 'created_at', 'stage'],
  // channel: sender = ห้องร้าน↔ผู้สั่ง / recipient = ห้องร้าน↔ผู้รับ
  Messages: ['id', 'job_id', 'sender_id', 'text', 'preset', 'created_at', 'channel', 'read_at'],
  Logs: ['id', 'at', 'user_id', 'role', 'action', 'target', 'detail'],
  // Point ที่ได้รับ (ใช้เด้ง popup แจ้งผู้ได้รับ)
  Rewards: ['id', 'user_id', 'kind', 'amount', 'job_id', 'detail', 'created_at', 'seen_at'],
  // ผู้ช่วย AI: ห้องแชทผู้ช่วยของผู้ใช้แต่ละคน (mode = bot / handoff) · ข้อความ · ประโยคที่แอดมินสอนเพิ่ม
  BotThreads: ['id', 'user_id', 'mode', 'reason', 'summary', 'last_order', 'handoff_at', 'closed_at', 'updated_at', 'rate_skip', 'last_order_at'],
  BotMessages: ['id', 'thread_id', 'user_id', 'role', 'text', 'intent', 'conf', 'card', 'options', 'created_at', 'read_at', 'admin_read', 'taught', 'used', 'picked', 'seq', 'route',
    'rate', 'q_id', 'fb', 'fb_reason', 'fb_at', 'fb_done'], // rate = คำตอบที่ให้คะแนนได้ · fb = up/down จากผู้ใช้
  BotExamples: ['id', 'text', 'intent', 'by', 'at'],
  Settings: ['id', 'value', 'updated_at', 'by'], // service_override = รับคำสั่งนอกเวลา (ทดสอบ/นำเสนอ)
  BotRatings: ['id', 'user_id', 'stars', 'comment', 'created_at'], // ให้ขนนกน้องถึง 1–5
};

// ===================== SHA-256 (ใช้เข้ารหัสผ่านแบบทางเดียว) =====================
function sha256Hex(ascii) {
  function rr(v, n) { return (v >>> n) | (v << (32 - n)); }
  var maxWord = Math.pow(2, 32), result = '', words = [], i, j;
  ascii = unescape(encodeURIComponent(ascii));
  var bitLen = ascii.length * 8, hash = [], k = [], count = 0, composite = {};
  for (var c = 2; count < 64; c++) {
    if (!composite[c]) {
      for (i = 0; i < 313; i += c) composite[i] = c;
      hash[count] = (Math.pow(c, .5) * maxWord) | 0;
      k[count++] = (Math.pow(c, 1 / 3) * maxWord) | 0;
    }
  }
  hash = hash.slice(0, 8);
  ascii += '\x80';
  while (ascii.length % 64 - 56) ascii += '\x00';
  for (i = 0; i < ascii.length; i++) words[i >> 2] |= ascii.charCodeAt(i) << ((3 - i) % 4) * 8;
  words[words.length] = (bitLen / maxWord) | 0;
  words[words.length] = bitLen;
  for (j = 0; j < words.length;) {
    var w = words.slice(j, j += 16), old = hash;
    hash = hash.slice(0, 8);
    for (i = 0; i < 64; i++) {
      var w15 = w[i - 15], w2 = w[i - 2], a = hash[0], e = hash[4];
      var t1 = hash[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & hash[5]) ^ ((~e) & hash[6])) + k[i] +
        (w[i] = (i < 16) ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
      var t2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash = [(t1 + t2) | 0].concat(hash);
      hash[4] = (hash[4] + t1) | 0;
    }
    for (i = 0; i < 8; i++) hash[i] = (hash[i] + old[i]) | 0;
  }
  for (i = 0; i < 8; i++) for (j = 3; j + 1; j--) { var b = (hash[i] >> (j * 8)) & 255; result += (b < 16 ? '0' : '') + b.toString(16); }
  return result;
}
function hashPassword(password, salt) {
  var h = salt + ':' + password;
  for (var i = 0; i < 300; i++) h = sha256Hex(salt + h);
  return h;
}

// ===================== กติกาของระบบ (ใช้ร่วมกันทั้งไฟล์ HTML และ Apps Script) =====================
// ระยะเดินจากจุดรับฝากถึงแต่ละจุดส่ง: คำนวณจากพิกัด (ค่า m ที่เขียนไว้ใน PLACES ถูกแทนที่ตรงนี้)
(function () {
  var O = CONFIG.DROP_POINT_LL, rad = function (x) { return x * Math.PI / 180; };
  Object.keys(CONFIG.PLACES).forEach(function (k) {
    var p = CONFIG.PLACES[k].ll, dLat = rad(p[0] - O[0]), dLng = rad(p[1] - O[1]);
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(rad(O[0])) * Math.cos(rad(p[0])) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    var straight = 2 * 6371000 * Math.asin(Math.sqrt(h));
    CONFIG.PLACES[k].m = Math.max(30, Math.round(straight * 1.3 / 10) * 10);
  });
})();
// ราคาและ Point ตั้งต้น (จับไว้ตอนโหลดไฟล์ ก่อนแอดมินแก้) ใช้เมื่อยังไม่เคยตั้งค่า
var PRICING_BASE = (function () { var P = CONFIG.PRICE, ex = 0; for (var k in P.ITEM_EXTRA) { ex = P.ITEM_EXTRA[k]; break; }
  return { normal: P.BASE.normal, urgent: P.BASE.urgent, dist: P.DIST.slice(), extra: ex, pt_normal: CONFIG.POINTS.BASE.normal, pt_urgent: CONFIG.POINTS.BASE.urgent,
    per_baht: CONFIG.POINT_USE.PER_BAHT, comp: CONFIG.LATE.COMP_POINTS, penalty: CONFIG.REFUSE.PENALTY }; })();
function createLogic(store) {
  function fail(msg) { var e = new Error(msg); e.userFacing = true; throw e; }
  function nowIso() { return new Date().toISOString(); }
  function dayKey(iso) { return new Date(iso).toLocaleDateString('en-CA', { timeZone: CONFIG.TIMEZONE }); }
  function rnd(n) {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      var a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n;
    }
    return Math.floor(Math.random() * n);
  }
  function rid(prefix, len) {
    var ch = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = '';
    for (var i = 0; i < len; i++) s += ch[rnd(ch.length)];
    return prefix + s;
  }
  function str(v, max) { return String(v == null ? '' : v).trim().slice(0, max); }

  // ---------- ผู้ใช้และการเข้าสู่ระบบ ----------
  function allUsers() {
    return store.list('Users');
  }
  function publicUser(u) {
    if (!u) return null;
    return { id: u.id, username: u.username, name: u.name, phone: u.phone, role: u.role, status: u.status, created_at: u.created_at, must_change: u.must_change === 'yes' };
  }
  function userById(id) { return allUsers().filter(function (u) { return u.id === id; })[0] || null; }
  function nameOf(id, users) {
    var u = users.filter(function (x) { return x.id === id; })[0];
    if (!u) return '';
    return u.status === 'deleted' ? u.name + ' (บัญชีถูกลบ)' : u.name;
  }

  function log(user, action, target, detail) {
    store.insert('Logs', {
      id: rid('L', 8), at: nowIso(), user_id: user ? user.id : '', role: user ? user.role : '',
      action: action, target: target || '', detail: str(detail, 200),
    });
  }

  function newSession(user) {
    var token = rid('', 32);
    var now = new Date();
    store.insert('Sessions', {
      token: token, user_id: user.id, created_at: now.toISOString(),
      expires_at: new Date(now.getTime() + CONFIG.SESSION_DAYS * 864e5).toISOString(), revoked: '',
    });
    return token;
  }
  function sessionUser(token) {
    if (!token) return null;
    var s = store.list('Sessions').filter(function (x) { return x.token === token; })[0];
    if (!s) return null;
    var u = userById(s.user_id);
    if (u && u.status === 'disabled') fail('บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อแอดมิน');
    if (s.revoked === 'yes' || new Date(s.expires_at) < new Date()) return null;
    if (!u || u.status !== 'active') return null;
    return u;
  }

  // ชื่อโปรไฟล์ห้ามซ้ำ: ไม่สนตัวพิมพ์เล็ก-ใหญ่ และช่องว่างเกิน (นับเฉพาะบัญชีที่ยังไม่ถูกลบ)
  function normName(n) { return String(n || '').trim().replace(/\s+/g, ' ').toLowerCase(); }
  function nameTaken(n) {
    var k = normName(n);
    return !!k && allUsers().some(function (u) { return u.status !== 'deleted' && normName(u.name) === k; });
  }
  // ชื่อผู้ใช้ที่สงวนไว้ (ขึ้นต้นด้วยคำเหล่านี้ใช้ไม่ได้) — กันคนเข้าใจผิดว่าเป็นบัญชีของระบบ
  var RESERVED = ['admin', 'administrator', 'system', 'root', 'support', 'staff', 'theungmue', 'deleted_'];
  function reservedUsername(u) { return RESERVED.some(function (w) { return u.indexOf(w) === 0; }); }
  function phoneTaken(p) {
    return !!p && allUsers().some(function (u) { return u.status !== 'deleted' && u.phone === p; });
  }
  function checkNewAccount(a) {
    var username = str(a.username, 40).toLowerCase();
    var name = str(a.name, 60).replace(/\s+/g, ' ');
    var phone = str(a.phone, 20).replace(/[\s-]/g, '');
    var password = String(a.password || '');
    if (!/^[a-z0-9_]{3,20}$/.test(username)) fail('ชื่อผู้ใช้ใช้ได้เฉพาะ a-z, 0-9 หรือ _ ความยาว 3–20 ตัว');
    if (!name) fail('กรอกชื่อโปรไฟล์');
    if (!/^[\x20-\x7E\u0E00-\u0E7F]{2,30}$/.test(name)) fail('ชื่อโปรไฟล์ใช้ภาษาไทย ภาษาอังกฤษ ตัวเลข และอักขระพิเศษได้ ยาว 2–30 ตัว');
    if (!/^0[689]\d{8}$/.test(phone)) fail('เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 06, 08 หรือ 09');
    if (!/^[\x21-\x7E]{6,64}$/.test(password)) fail('รหัสผ่านใช้ได้เฉพาะภาษาอังกฤษ ตัวเลข และสัญลักษณ์ ยาว 6 ตัวขึ้นไป (ไม่มีเว้นวรรค)');
    if (reservedUsername(username)) fail('ชื่อผู้ใช้นี้สงวนไว้สำหรับระบบ');
    if (allUsers().some(function (u) { return u.username === username; })) fail('มีชื่อผู้ใช้นี้อยู่แล้วในระบบ');
    if (phoneTaken(phone)) fail('มีเบอร์โทรศัพท์นี้อยู่แล้วในระบบ');
    if (nameTaken(name)) fail('มีชื่อโปรไฟล์นี้อยู่แล้วในระบบ');
    return { username: username, name: name, phone: phone, password: password };
  }

  function register(a) {
    var c = checkNewAccount(a);
    var username = c.username, name = c.name, phone = c.phone, password = c.password;
    var salt = rid('', 16);
    var u = {
      id: rid('U', 6), username: username, name: name, phone: phone, role: 'user',
      pass_hash: hashPassword(password, salt), salt: salt, status: 'active', created_at: nowIso(),
    };
    store.insert('Users', u);
    log(u, 'register', u.id, 'สมัครสมาชิก');
    return { registered: true, username: u.username };
  }

  function login(a) {
    var username = str(a.username, 40).toLowerCase();
    var u = allUsers().filter(function (x) { return x.username === username && x.status !== 'deleted'; })[0];
    if (u && u.status === 'disabled') {
      log(u, 'login_failed', username, 'บัญชีถูกระงับ');
      fail('บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อแอดมิน');
    }
    if (!u) {
      log(null, 'login_failed', username, 'ไม่พบชื่อผู้ใช้');
      fail('ไม่พบชื่อผู้ใช้นี้ในระบบ');
    }
    checkPassword(u, a.password, 'login');
    log(u, 'login', u.id, 'เข้าสู่ระบบ');
    return { token: newSession(u), me: publicUser(u) };
  }

  // ---------- ตรวจรหัสผ่าน + ล็อกบัญชีชั่วคราวเมื่อใส่ผิดหลายครั้ง ----------
  // ใช้ร่วมกันทั้งการเข้าสู่ระบบ การเปลี่ยนรหัสผ่าน และการลบบัญชี (นับครั้งผิดรวมกัน)
  function lockedMinutesLeft(u) {
    var ms = u.locked_until ? new Date(u.locked_until).getTime() - Date.now() : 0;
    return ms > 0 ? Math.ceil(ms / 60000) : 0;
  }
  function checkPassword(u, password, action) {
    var max = CONFIG.MAX_PASSWORD_FAILS;
    var left = lockedMinutesLeft(u);
    if (left) {
      log(u, action + '_failed', u.username, 'บัญชีถูกล็อกชั่วคราว');
      fail('ใส่รหัสผ่านผิดครบ ' + max + ' ครั้ง บัญชีถูกล็อกชั่วคราว กรุณาลองใหม่ในอีก ' + left + ' นาที');
    }
    if (hashPassword(String(password || ''), u.salt) === u.pass_hash) {
      if ((u.failed_count && u.failed_count !== '0') || u.locked_until) {
        store.update('Users', u.id, { failed_count: '0', locked_until: '' });
      }
      return;
    }
    var n = (parseInt(u.failed_count, 10) || 0) + 1;
    if (n >= max) {
      var until = new Date(Date.now() + CONFIG.LOCK_MINUTES * 60000).toISOString();
      store.update('Users', u.id, { failed_count: '0', locked_until: until });
      log(u, 'account_locked', u.username, 'ใส่รหัสผ่านผิดครบ ' + max + ' ครั้ง ล็อก ' + CONFIG.LOCK_MINUTES + ' นาที');
      fail('ใส่รหัสผ่านผิดครบ ' + max + ' ครั้ง บัญชีถูกล็อกชั่วคราว ' + CONFIG.LOCK_MINUTES + ' นาที');
    }
    store.update('Users', u.id, { failed_count: String(n) });
    log(u, action + '_failed', u.username, 'รหัสผ่านไม่ถูกต้อง (ครั้งที่ ' + n + ')');
    fail('รหัสผ่านไม่ถูกต้อง (ใส่ผิดได้อีก ' + (max - n) + ' ครั้ง ก่อนบัญชีถูกล็อกชั่วคราว)');
  }

  // ---------- เปลี่ยนรหัสผ่าน (หน้าโปรไฟล์ / หลังแอดมินรีเซ็ต) ใช้ได้ทุกบทบาท ----------
  function changePassword(me, token, a) {
    var oldPw = String(a.old_password || ''), newPw = String(a.password || '');
    if (!/^[\x21-\x7E]{6,64}$/.test(newPw)) fail('รหัสผ่านใหม่ใช้ได้เฉพาะภาษาอังกฤษ ตัวเลข และสัญลักษณ์ ยาว 6 ตัวขึ้นไป (ไม่มีเว้นวรรค)');
    checkPassword(me, oldPw, 'change_password');
    if (newPw === oldPw) fail('รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม');
    var salt = rid('', 16);
    store.update('Users', me.id, { pass_hash: hashPassword(newPw, salt), salt: salt, failed_count: '0', locked_until: '', must_change: '' });
    // ออกจากระบบเครื่องอื่นที่ยังค้างอยู่ด้วยรหัสเดิม (เครื่องนี้ยังใช้งานต่อได้)
    store.list('Sessions').forEach(function (s) {
      if (s.user_id === me.id && s.token !== token && s.revoked !== 'yes') store.update('Sessions', s.token, { revoked: 'yes' }, null, 'token');
    });
    log(me, 'change_password', me.id, 'เปลี่ยนรหัสผ่าน');
    return { changed: true, me: publicUser(userById(me.id)) };
  }

  // ---------- แอดมินรีเซ็ตรหัสผ่าน (กรณีผู้ใช้ลืมรหัส) ----------
  function findAccount(username) {
    var name = str(username, 40).toLowerCase().replace(/^@/, '');
    var t = allUsers().filter(function (u) { return u.username === name && u.status !== 'deleted'; })[0];
    if (!t) fail('ไม่พบชื่อผู้ใช้นี้ในระบบ');
    if (t.role === 'admin') fail('บัญชีแอดมินเปลี่ยนรหัสผ่านเองได้ที่หน้าโปรไฟล์');
    return t;
  }
  function findUserAny(q) { // ค้นจากชื่อผู้ใช้ / เบอร์ / ชื่อโปรไฟล์
    var raw = str(q, 60).trim(), name = raw.toLowerCase().replace(/^@/, ''), digits = raw.replace(/\D/g, '');
    var pool = allUsers().filter(function (u) { return u.status !== 'deleted' && u.role === 'user'; });
    var t = pool.filter(function (u) { return u.username === name; })[0] || (digits.length >= 9 ? pool.filter(function (u) { return u.phone === digits; })[0] : null) ||
      pool.filter(function (u) { return String(u.name).toLowerCase().indexOf(name) >= 0; })[0];
    if (!t) { if (allUsers().some(function (u) { return u.role === 'admin' && u.username === name; })) fail('บัญชีแอดมินเปลี่ยนรหัสผ่านเองได้ที่หน้าโปรไฟล์'); fail('ไม่พบผู้ใช้นี้ในระบบ'); }
    return t;
  }
  function tempPassword() {
    var ch = 'abcdefghjkmnpqrstuvwxyz23456789', s = '';
    for (var i = 0; i < 8; i++) s += ch[rnd(ch.length)];
    return s;
  }
  function adminResetPassword(me, a) {
    var t = findAccount(a.username);
    var temp = tempPassword(), salt = rid('', 16);
    store.update('Users', t.id, { pass_hash: hashPassword(temp, salt), salt: salt, failed_count: '0', locked_until: '', must_change: 'yes' });
    store.list('Sessions').forEach(function (s) {
      if (s.user_id === t.id && s.revoked !== 'yes') store.update('Sessions', s.token, { revoked: 'yes' }, null, 'token');
    });
    log(me, 'admin_reset_password', t.id, 'รีเซ็ตรหัสผ่าน @' + t.username);
    return { username: t.username, name: t.name, temp: temp };
  }

  function logout(token, me) {
    var s = store.list('Sessions').filter(function (x) { return x.token === token; })[0];
    if (s) store.update('Sessions', token, { revoked: 'yes' }, null, 'token');
    if (me) log(me, 'logout', me.id, 'ออกจากระบบ');
    return { ok: true };
  }

  // แก้ไขชื่อ/เบอร์โทร (ชื่อผู้ใช้แก้ไม่ได้) ต้องยืนยันด้วยรหัสผ่าน
  function updateProfile(me, a) {
    var name = str(a.name, 60).replace(/\s+/g, ' ');
    var phone = str(a.phone, 20).replace(/[\s-]/g, '');
    if (!name) fail('กรอกชื่อโปรไฟล์');
    if (!/^[\x20-\x7E\u0E00-\u0E7F]{2,30}$/.test(name)) fail('ชื่อโปรไฟล์ใช้ภาษาไทย ภาษาอังกฤษ ตัวเลข และอักขระพิเศษได้ ยาว 2–30 ตัว');
    if (!/^0[689]\d{8}$/.test(phone)) fail('เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 06, 08 หรือ 09');
    if (phone !== me.phone && phoneTaken(phone)) fail('มีเบอร์โทรศัพท์นี้อยู่แล้วในระบบ');
    if (name.toLowerCase() !== String(me.name).toLowerCase() && nameTaken(name)) fail('มีชื่อโปรไฟล์นี้อยู่แล้วในระบบ');
    if (name === me.name && phone === me.phone) fail('ยังไม่ได้แก้ไขข้อมูล');
    checkPassword(me, a.password, 'update_profile');
    var changed = [];
    if (name !== me.name) changed.push('ชื่อ');
    if (phone !== me.phone) changed.push('เบอร์โทร');
    var u = store.update('Users', me.id, { name: name, phone: phone });
    log(me, 'profile_update', me.id, 'แก้ไข' + changed.join('และ'));
    return { me: publicUser(u) };
  }

  function deleteAccount(me, a) {
    if (me.role !== 'user') fail('บัญชีแอดมินลบเองไม่ได้');
    if (str(a.confirm, 20) !== 'ลบบัญชี') fail('พิมพ์คำว่า "ลบบัญชี" เพื่อยืนยัน');
    checkPassword(me, a.password, 'delete_account');
    var busy = jobs().some(function (j) { return isActive(j) && (j.sender_id === me.id || j.recipient_id === me.id); });
    if (busy) fail('ยังมีคำสั่งที่ค้างอยู่ — รอให้สำเร็จหรือยกเลิกก่อนลบบัญชี');
    if (jobs().some(function (j) { var t = todoOf(j); return j.sender_id === me.id && (t.refund || t.ret); })) fail('ยังมีของหรือเงินคืนที่ต้องรับที่จุดรับฝาก — รับให้เรียบร้อยก่อนลบบัญชี');
    store.update('Users', me.id, { status: 'deleted', username: 'deleted_' + me.id.toLowerCase(), phone: '' });
    // ลบแชทกับน้องถึงและคะแนนขนนกของบัญชีนี้ (ถ้าระบบเก็บข้อมูลลบแถวไม่ได้ ให้ล้างข้อความแทน)
    [['BotMessages', 'user_id', { text: '(ลบแล้ว)', card: '', options: '' }], ['BotRatings', 'user_id', { comment: '', stars: '0' }], ['BotThreads', 'user_id', { summary: '', last_order: '', mode: 'bot' }]].forEach(function (x) {
      store.list(x[0]).forEach(function (row) { if (row[x[1]] !== me.id) return; if (store.remove) store.remove(x[0], row.id); else store.update(x[0], row.id, x[2]); });
    });
    store.list('Sessions').forEach(function (s) {
      if (s.user_id === me.id && s.revoked !== 'yes') store.update('Sessions', s.token, { revoked: 'yes' }, null, 'token');
    });
    log(me, 'delete_account', me.id, 'ลบบัญชี');
    return { ok: true };
  }

  // ===================== คำสั่งบริการ (v2: ผู้ใช้สั่ง · แอดมินรับเรื่องและส่งเอง) =====================
  function jobs() { return store.list('Jobs'); }
  function getJob(id) {
    var j = jobs().filter(function (x) { return x.id === id; })[0];
    if (!j) fail('ไม่พบคำสั่งนี้');
    return j;
  }
  function isActive(j) { return ['pending', 'confirmed', 'picked', 'delivering'].indexOf(j.status) >= 0; }
  function closed(j) { return j.status === 'delivered' || j.status === 'cancelled'; }
  function tierIndex(zone) {
    var p = CONFIG.PLACES[zone];
    if (!p) return 1;
    for (var i = 0; i < CONFIG.TIERS.length; i++) if (p.m <= CONFIG.TIERS[i].max) return i;
    return CONFIG.TIERS.length - 1;
  }
  // ค่าบริการ = ตามแบบการส่ง + ตามระยะ + ประเภทของที่ต้องดูแลเพิ่ม
  function priceFor(mode, zone, item) {
    var P = CONFIG.PRICE, ti = tierIndex(zone);
    var base = P.BASE[mode] || P.BASE.normal, dist = P.DIST[ti] || 0, extra = P.ITEM_EXTRA[item] || 0;
    return { base: base, dist: dist, tier: CONFIG.TIERS[ti].label, m: CONFIG.PLACES[zone] ? CONFIG.PLACES[zone].m : null, item: extra, subtotal: base + dist + extra };
  }
  // Point ที่ได้เมื่อคำสั่งสำเร็จ (ได้อัตโนมัติ ไม่ต้องให้คะแนน)
  function pointsEarn(j) { return (CONFIG.POINTS.BASE[j.mode] || CONFIG.POINTS.BASE.normal) + (CONFIG.POINTS.DIST[tierIndex(j.dropoff_zone)] || 0); }
  // คนที่จ่าย: จ่ายตอนฝาก = ผู้สั่ง / เก็บเงินปลายทาง = ผู้รับ (หลังผู้รับกดยอมรับ)
  function payerOf(j) { return j.payer_id || (j.pay_method === 'cod' ? (j.cod_status === 'accepted' ? j.recipient_id : '') : j.sender_id); }
  function penaltyActive(j) { return Number(j.penalty_points || 0) > 0 && j.appeal_result !== 'revoked'; }
  // ยอด Point = ตั้งต้น + ได้จากคำสั่งที่สำเร็จ (ของคนที่จ่าย) + ชดเชยส่งช้า − ใช้ไปในคำสั่งที่ยังไม่ยกเลิก − โทษปฏิเสธรับของ
  function pointBalance(uid, js) {
    js = js || jobs();
    var u = userById(uid), start = u ? Number(u.bonus_points || 0) : 0; // Point ตั้งต้น (บัญชีทดลอง)
    var earn = start, used = 0, comp = 0, pen = 0;
    js.forEach(function (j) {
      if (payerOf(j) === uid) {
        if (j.status === 'delivered') { earn += Number(j.points_earned || 0); comp += Number(j.comp_points || 0); }
        if (j.status !== 'cancelled') used += Number(j.points_used || 0);
      }
      if (j.penalty_user === uid && penaltyActive(j)) pen += Number(j.penalty_points);
    });
    return { earned: earn + comp, used: used, penalty: pen, balance: earn + comp - used - pen, start: start };
  }
  // ประวัติการปฏิเสธรับของปลายทาง (ความผิดผู้รับ ไม่นับที่ถูกยกเลิกโทษ) ในช่วง WINDOW_DAYS
  function refusals(uid, js) {
    var R = CONFIG.REFUSE, from = Date.now() - R.WINDOW_DAYS * 86400000;
    var all = (js || jobs()).filter(function (j) { return j.penalty_user === uid && j.fail_fault === 'recipient' && j.appeal_result !== 'revoked'; });
    var recent = all.filter(function (j) { return new Date(j.cancelled_at).getTime() >= from; }).sort(function (a, b) { return String(a.cancelled_at).localeCompare(String(b.cancelled_at)); });
    var banUntil = '';
    if (recent.length >= R.LIMIT) banUntil = new Date(new Date(recent[recent.length - 1].cancelled_at).getTime() + R.BAN_DAYS * 86400000).toISOString();
    if (banUntil && new Date(banUntil).getTime() < Date.now()) banUntil = '';
    return { total: all.length, recent: recent.length, ban_until: banUntil };
  }
  function contactLog(j) { try { return JSON.parse(j.contact_log || '[]'); } catch (e) { return []; } }
  // ส่วนลดสูงสุดที่ใช้ Point ได้กับยอดนี้ (บาท)
  function maxDiscount(subtotal, balance) {
    var P = CONFIG.POINT_USE;
    return Math.max(0, Math.min(Math.floor(balance / P.PER_BAHT), Math.floor(subtotal * P.MAX_RATIO)));
  }
  function overdueMin(j) { var d = Date.now() - new Date(j.due_at).getTime(); return d > 0 ? Math.floor(d / 60000) : 0; }

  // งานค้างของคำสั่งที่ปิดแล้ว: คืนเงิน · ของรอผู้สั่งมารับคืน (เก็บไว้ HOLD_DAYS วัน ขยายได้) · คำโต้แย้งรอตรวจ
  function keepUntil(j) { return j.keep_until || (j.cancelled_at ? new Date(new Date(j.cancelled_at).getTime() + CONFIG.REFUSE.HOLD_DAYS * 864e5).toISOString() : ''); }
  function todoOf(j) {
    var t = { refund: !!(Number(j.refund_amount) && !j.refunded_at), ret: !!(j.status === 'cancelled' && j.picked_at && !j.returned_at && !j.disposed_at), appeal: !!(j.appeal_at && !j.appeal_result) };
    if (t.ret) { t.keep_until = keepUntil(j); t.overdue = Date.now() > new Date(t.keep_until).getTime(); t.days_left = Math.max(0, Math.ceil((new Date(t.keep_until).getTime() - Date.now()) / 864e5)); }
    t.any = t.refund || t.ret || t.appeal;
    return t;
  }
  // ราคาและ Point ที่แอดมินตั้งเอง (เก็บใน Settings: pricing) · ไม่ตั้ง = ใช้ค่าใน CONFIG
  function pricingNow() {
    var P = CONFIG.PRICE, ex = 0; for (var k in P.ITEM_EXTRA) { ex = P.ITEM_EXTRA[k]; break; }
    return { normal: P.BASE.normal, urgent: P.BASE.urgent, dist: P.DIST.slice(), extra: ex, pt_normal: CONFIG.POINTS.BASE.normal, pt_urgent: CONFIG.POINTS.BASE.urgent,
      per_baht: CONFIG.POINT_USE.PER_BAHT, comp: CONFIG.LATE.COMP_POINTS, penalty: CONFIG.REFUSE.PENALTY };
  }
  function applyPricing(p) {
    p = p || PRICING_BASE;
    CONFIG.PRICE.BASE.normal = p.normal; CONFIG.PRICE.BASE.urgent = p.urgent; CONFIG.PRICE.DIST = p.dist.slice();
    for (var k in CONFIG.PRICE.ITEM_EXTRA) CONFIG.PRICE.ITEM_EXTRA[k] = p.extra;
    CONFIG.POINTS.BASE.normal = p.pt_normal; CONFIG.POINTS.BASE.urgent = p.pt_urgent; CONFIG.POINT_USE.PER_BAHT = p.per_baht;
    CONFIG.LATE.COMP_POINTS = p.comp; CONFIG.REFUSE.PENALTY = p.penalty;
  }
  function loadPricing() { var raw = setting('pricing'); try { applyPricing(raw ? JSON.parse(raw) : null); } catch (e) { applyPricing(null); } }
  function setPricing(me, a) {
    var n = function (v, lo, hi, label) { var x = Number(v); if (!(x >= lo && x <= hi) || Math.floor(x) !== x) fail(label + ' ต้องเป็นจำนวนเต็ม ' + lo + '–' + hi); return x; };
    var p = { normal: n(a.normal, 1, 500, 'ค่าส่งปกติ'), urgent: n(a.urgent, 1, 500, 'ค่าส่งด่วน'),
      dist: [n((a.dist || [])[0], 0, 100, 'ค่าระยะใกล้'), n((a.dist || [])[1], 0, 100, 'ค่าระยะกลาง'), n((a.dist || [])[2], 0, 100, 'ค่าระยะไกล')],
      extra: n(a.extra, 0, 100, 'ค่าของที่ต้องดูแลเพิ่ม'), pt_normal: n(a.pt_normal, 0, 100, 'Point งานปกติ'), pt_urgent: n(a.pt_urgent, 0, 100, 'Point งานด่วน'),
      per_baht: n(a.per_baht, 1, 100, 'Point ต่อ 1 บาท'), comp: n(a.comp, 0, 100, 'Point ชดเชย'), penalty: n(a.penalty, 0, 100, 'Point ที่หัก') };
    if (p.urgent < p.normal) fail('ค่าส่งด่วนต้องไม่น้อยกว่าค่าส่งปกติ');
    var row = store.list('Settings').filter(function (x) { return x.id === 'pricing'; })[0];
    if (row) store.update('Settings', 'pricing', { value: JSON.stringify(p) }); else store.insert('Settings', { id: 'pricing', value: JSON.stringify(p) });
    applyPricing(p);
    log(me, 'pricing_update', '', 'ปกติ ฿' + p.normal + ' · ด่วน ฿' + p.urgent + ' · ระยะ ' + p.dist.join('/') + ' · Point ' + p.pt_normal + '/' + p.pt_urgent);
    return { pricing: pricingNow() };
  }
  function viewJob(job, me, users) {
    var o = {};
    for (var k in job) o[k] = job[k];
    var admin = me && me.role === 'admin';
    if (!me || me.id !== job.recipient_id || job.status !== 'delivering') delete o.code; // ผู้รับเห็นรหัสเฉพาะตอนกำลังนำส่ง
    o.hidden = me && hiddenFields(job, me).some(function (f) { return job[f]; }) ? '1' : '';
    delete o.hidden_sender; delete o.hidden_recipient;
    if (!admin) { delete o.code_fails; delete o.admin_note; }
    if (!admin && (!me || me.id !== job.penalty_user)) Object.keys(o).forEach(function (k) { if (/^(penalty_|appeal_)/.test(k)) delete o[k]; }); // บทลงโทษเห็นเฉพาะคนที่ถูกลงโทษและแอดมิน
    o.sender_name = nameOf(job.sender_id, users);
    o.recipient_name = nameOf(job.recipient_id, users);
    o.overdue_min = closed(job) ? 0 : overdueMin(job);
    o.payer = payerOf(job);
    o.contacts = contactLog(job); delete o.contact_log;
    if (admin && job.status !== 'delivered') o.recipient_refusals = refusals(job.recipient_id);
    if (admin) o.todo = todoOf(job);
    if (job.status === 'cancelled' && job.picked_at) o.keep_until = keepUntil(job);
    o.near_due = false;
    if (isActive(job) && ['pending', 'confirmed', 'picked'].indexOf(job.status) >= 0) { var lf = (new Date(job.due_at).getTime() - Date.now()) / 60000; o.near_due = lf <= CONFIG.LATE.NEAR_DUE_MIN; }
    if (job.status === 'pending') o.waiting_min = Math.floor((Date.now() - new Date(job.cod_at || job.created_at).getTime()) / 60000);
    if (job.status === 'delivering' && job.pay_method === 'cod') o.free_refuse = overdueMin(job) > CONFIG.LATE.COD_FREE_MIN;
    if (admin || isActive(job)) {
      var phone = function (id) { var u = users.filter(function (x) { return x.id === id; })[0]; return u ? u.phone : ''; };
      if (admin) { o.sender_phone = phone(job.sender_id); o.recipient_phone = phone(job.recipient_id); }
    }
    return o;
  }
  function hiddenFields(job, me) {
    var f = [];
    if (job.sender_id === me.id) f.push('hidden_sender');
    if (job.recipient_id === me.id) f.push('hidden_recipient');
    return f;
  }
  function addReward(userId, kind, amount, jobId, detail) {
    if (!(amount > 0) && ['notice', 'expire', 'cancel', 'return'].indexOf(kind) < 0) return; // แจ้งเตือนไม่มี Point ก็ต้องบันทึก
    store.insert('Rewards', { id: rid('R', 8), user_id: userId, kind: kind, amount: String(amount), job_id: jobId, detail: str(detail, 200), created_at: nowIso(), seen_at: '' });
  }
  function byCreatedDesc(a, b) { return String(b.created_at).localeCompare(String(a.created_at)); }
  function update(table, id, patch, ifMatch) {
    try { return store.update(table, id, patch, ifMatch); }
    catch (e) { if (String(e.message).indexOf('CONFLICT') >= 0) fail('สถานะคำสั่งเพิ่งเปลี่ยน ลองโหลดหน้าใหม่'); throw e; }
  }
  function checkPhotos(list, min, max, needMsg) {
    var photos = Array.isArray(list) ? list : [];
    if (photos.length < min) fail(needMsg);
    if (photos.length > max) fail('แนบรูปได้ไม่เกิน ' + max + ' รูป');
    photos.forEach(function (p) {
      if (typeof p !== 'string' || !/^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/.test(p) || p.length > 400000) fail('ไฟล์รูปไม่ถูกต้อง');
    });
    return photos;
  }
  function savePhotos(jobId, stage, photos, at) {
    photos.forEach(function (p, i) {
      var ref = store.putPhoto ? store.putPhoto(p, jobId + '-' + stage + '-' + (i + 1)) : p;
      store.insert('Photos', { id: rid('P', 8), job_id: jobId, idx: String(i + 1), data: ref, created_at: at, stage: stage });
    });
  }
  function canSeeJob(j, me) {
    if (me.role !== 'admin' && [j.sender_id, j.recipient_id].indexOf(me.id) < 0) fail('ไม่มีสิทธิ์ดูคำสั่งนี้');
  }
  function orderNo() { // เลขคำสั่งแบบอ่านง่าย: TM + วันเดือน + ลำดับของวัน
    // เลขถัดจากเลขสูงสุดของวันนี้ (ไม่ใช้จำนวนคำสั่ง เพื่อไม่ให้เลขซ้ำ) · ตอนขึ้น Google Sheet ต้องครอบด้วย LockService กันสั่งพร้อมกัน
    var d = dayKey(nowIso()), pre = 'TM' + d.slice(8, 10) + d.slice(5, 7) + '-', n = 0;
    jobs().forEach(function (j) { if (String(j.id).indexOf(pre) === 0) n = Math.max(n, Number(String(j.id).slice(pre.length)) || 0); });
    return pre + ('0' + (n + 1)).slice(-2);
  }

  function checkOrder(me, f) {
    ['item_type', 'item_detail', 'dropoff_zone', 'recipient_id', 'mode'].forEach(function (k) { if (!str(f[k], 500)) fail('กรอกข้อมูลให้ครบ'); });
    if (!CONFIG.MODES[f.mode]) fail('แบบการส่งไม่ถูกต้อง');
    if (CONFIG.ZONES.indexOf(f.dropoff_zone) < 0) fail('จุดส่งไม่ถูกต้อง');
    if (CONFIG.ITEM_TYPES.indexOf(f.item_type) < 0) fail('ประเภทของไม่ถูกต้อง');
    var r = userById(f.recipient_id);
    if (!r || r.role !== 'user' || r.status !== 'active') fail('ไม่พบผู้รับปลายทาง');
    if (r.id === me.id) fail('ผู้รับปลายทางต้องไม่ใช่ตัวเอง');
    return r;
  }
  // เวลาให้บริการ: สั่งได้เฉพาะในเวลา · งานด่วนต้องถึงก่อนปิด (แอดมินเปิด "รับคำสั่งนอกเวลา" ได้ตอนทดสอบ/นำเสนอ)
  function setting(id) { var s = store.list('Settings').filter(function (x) { return x.id === id; })[0]; return s ? s.value : ''; }
  function todayAt(hm) { return new Date(dayKey(nowIso()) + 'T' + hm + ':00+07:00'); }
  function serviceStatus() {
    var H = BOT.SHOP_HOURS, override = setting('service_override') === 'on', now = Date.now();
    var open = todayAt(H.open).getTime(), close = todayAt(H.close).getTime(), lead = CONFIG.URGENT_LEAD_MINUTES * 60000;
    var inHours = now >= open && now < close;
    return { open: override || inHours, in_hours: inHours, override: override, hours: H, close_at: new Date(close).toISOString(),
      urgent_ok: override || (inHours && now + lead <= close), urgent_until: hm(close - lead), pricing: pricingNow() };
  }
  function hm(ms) { return new Date(ms).toLocaleTimeString('en-GB', { timeZone: CONFIG.TIMEZONE, hour: '2-digit', minute: '2-digit' }); }
  function createJob(me, f) {
    if (me.role !== 'user') fail('เฉพาะผู้ใช้เท่านั้นที่สั่งบริการได้');
    var sv = serviceStatus();
    if (!sv.open) fail('ตอนนี้นอกเวลาให้บริการ (เปิด ' + sv.hours.open + '–' + sv.hours.close + ' น.) สั่งได้อีกครั้งตอน ' + sv.hours.open + ' น.');
    if (f.mode === 'urgent' && !sv.urgent_ok) fail('งานด่วนสั่งได้ถึง ' + sv.urgent_until + ' น. เพื่อให้ส่งถึงก่อนปิด ' + sv.hours.close + ' น. ตอนนี้เลือกส่งปกติได้');
    var r = checkOrder(me, f);
    var nPend = jobs().filter(function (j) { return j.sender_id === me.id && j.status === 'pending'; }).length;
    if (nPend >= CONFIG.MAX_PENDING) fail('มีคำสั่งรอยืนยันครบ ' + CONFIG.MAX_PENDING + ' รายการแล้ว รอแอดมินยืนยันหรือยกเลิกบางรายการก่อนสั่งเพิ่ม');
    var photos = checkPhotos(f.photos, CONFIG.PHOTO_MIN, CONFIG.PHOTO_MAX, 'กรุณาแนบรูปของอย่างน้อย ' + CONFIG.PHOTO_MIN + ' รูป');
    var created = new Date();
    var due = new Date(created.getTime() + CONFIG.MODES[f.mode].hours * 3600 * 1000);
    if (f.deadline && f.mode === 'urgent') {
      var d = new Date(f.deadline);
      if (isNaN(d.getTime())) fail('เวลาที่ต้องถึงไม่ถูกต้อง');
      if (d.getTime() < created.getTime() + (CONFIG.URGENT_LEAD_MINUTES - 1) * 60000) fail('เวลาที่ต้องถึงต้องห่างจากตอนนี้อย่างน้อย ' + CONFIG.URGENT_LEAD_MINUTES + ' นาที');
      if (d.getTime() > due.getTime() + 60000) fail('เวลาที่ต้องถึงต้องไม่เกิน ' + CONFIG.MODES.urgent.hours + ' ชม. จากตอนนี้');
      if (d < due) due = d;
    }
    if (f.mode === 'urgent' && !sv.override && due.getTime() > new Date(sv.close_at).getTime()) {
      if (f.deadline) fail('งานด่วนต้องถึงก่อนปิด ' + sv.hours.close + ' น.');
      due = new Date(sv.close_at); // ไม่เลือกเวลา: ส่งถึงภายในเวลาปิด
    }
    var pr = priceFor(f.mode, f.dropoff_zone, f.item_type);
    var cod = f.pay_method === 'cod';
    if (cod) { var rb = refusals(r.id); if (rb.ban_until) fail('ผู้รับคนนี้รับของแบบเก็บเงินปลายทางไม่ได้ชั่วคราว กรุณาเลือก "จ่ายตอนฝากของ"'); }
    var bal = pointBalance(me.id).balance;
    var discount = !cod && f.use_points ? maxDiscount(pr.subtotal, bal) : 0; // เก็บเงินปลายทาง: ผู้รับเลือกใช้ Point เองตอนยอมรับ
    // ตรวจยอดที่หน้าเว็บแสดง ถ้าไม่ตรง (ราคาหรือ Point เปลี่ยนระหว่างกรอก) ให้ผู้ใช้ดูยอดใหม่ก่อน
    if (f.expect_total !== undefined && f.expect_total !== null && f.expect_total !== '' && Number(f.expect_total) !== pr.subtotal - discount) fail('ยอดชำระเปลี่ยนแล้ว กรุณาตรวจยอดใหม่อีกครั้ง');
    var job = {
      id: orderNo(), created_at: created.toISOString(), sender_id: me.id, recipient_id: r.id,
      item_type: f.item_type, item_detail: str(f.item_detail, 300),
      pickup_zone: CONFIG.DROP_POINT, pickup_detail: '',
      dropoff_zone: f.dropoff_zone, dropoff_detail: str(f.dropoff_detail, 200),
      mode: f.mode, due_at: due.toISOString(), note: str(f.note, 500), status: 'pending',
      code: ('000' + rnd(10000)).slice(-4), photo_count: String(photos.length),
      price_base: String(pr.base), price_dist: String(pr.dist), price_item: String(pr.item), subtotal: String(pr.subtotal),
      points_used: String(discount * CONFIG.POINT_USE.PER_BAHT), discount: String(discount), total: String(pr.subtotal - discount),
      service: str(f.service, 20),
      pay_method: cod ? 'cod' : 'sender', payer_id: cod ? '' : me.id, cod_status: cod ? 'waiting' : '',
    };
    savePhotos(job.id, 'item', photos, job.created_at);
    store.insert('Jobs', job);
    log(me, 'job_create', job.id, 'สั่ง' + CONFIG.MODES[job.mode].label + ' → ' + job.dropoff_zone + (cod ? ' · เก็บเงินปลายทาง ฿' + job.total : ' · ฿' + job.total + (discount ? ' (ใช้ ' + job.points_used + ' Point)' : '')));
    return job;
  }

  // ส่งไม่สำเร็จ: ยกเลิกคำสั่ง คืน Point ที่ใช้ไป และหักโทษผู้รับถ้าเป็นความผิดผู้รับในคำสั่งเก็บเงินปลายทาง
  function failJob(me, job, reason, fault, note, photos, at, by) {
    var patch = { status: 'cancelled', cancelled_at: at, cancel_reason: 'failed', fail_reason: reason, fail_fault: fault, fail_note: note, fail_photo_count: String(photos.length) };
    var pen = 0;
    if (fault === 'recipient' && job.pay_method === 'cod') {
      var after = pointBalance(job.recipient_id).balance + (payerOf(job) === job.recipient_id ? Number(job.points_used || 0) : 0); // คืน Point ที่ใช้ไปก่อน แล้วค่อยหัก
      pen = Math.max(0, Math.min(CONFIG.REFUSE.PENALTY, after));
      patch.penalty_user = job.recipient_id; patch.penalty_points = String(pen);
    }
    if (fault === 'shop' && job.pay_method !== 'cod' && job.picked_at && Number(job.total) > 0) patch.refund_amount = String(job.total); // ผู้สั่งจ่ายตอนฝากแล้ว คืนเงินสดตอนมารับของคืน
    var r = update('Jobs', job.id, patch, { status: 'delivering' });
    if (photos.length) savePhotos(job.id, 'fail', photos, at);
    log(me, by === 'recipient' ? 'job_refuse' : 'job_fail', job.id, CONFIG.FAIL_REASONS[reason].label + ' · ' + (CONFIG.FAULT_LABEL[fault] ? 'ความผิด' + CONFIG.FAULT_LABEL[fault] : '') + (pen ? ' · หัก ' + pen + ' Point' : ''));
    if (patch.penalty_user) {
      var rf = refusals(job.recipient_id);
      addReward(job.recipient_id, 'penalty', pen, job.id, CONFIG.FAIL_REASONS[reason].label + '|' + rf.recent + '|' + (rf.ban_until || ''));
    }
    return r;
  }
  function act(me, id, action, code, photos, note) {
    var job = getJob(id), r, at = nowIso();
    var admin = me.role === 'admin';
    var need = function (st, msg) { if (job.status !== st) fail(msg || 'สถานะคำสั่งไม่ถูกต้อง'); };
    var cod = job.pay_method === 'cod';
    // ---- ผู้รับ: ยอมรับ / ปฏิเสธ / ถอน การชำระปลายทาง
    if (action === 'cod_accept') {
      if (me.id !== job.recipient_id) fail('เฉพาะผู้รับ');
      if (!cod || job.status !== 'pending' || job.cod_status !== 'waiting') fail('คำสั่งนี้ไม่ได้รอการยอมรับชำระ');
      var sub = Number(job.subtotal), disc = note === 'use_points' ? maxDiscount(sub, pointBalance(me.id).balance) : 0;
      if (code !== undefined && code !== null && code !== '' && Number(code) !== sub - disc) fail('ยอดชำระเปลี่ยนแล้ว กรุณาตรวจยอดใหม่อีกครั้ง');
      r = update('Jobs', id, { cod_status: 'accepted', cod_at: at, payer_id: me.id, discount: String(disc), points_used: String(disc * CONFIG.POINT_USE.PER_BAHT), total: String(sub - disc) }, { status: 'pending', cod_status: 'waiting' });
      log(me, 'cod_accept', id, 'ยอมรับชำระปลายทาง ฿' + (sub - disc) + (disc ? ' (ใช้ ' + disc * CONFIG.POINT_USE.PER_BAHT + ' Point)' : ''));
      return r;
    }
    if (action === 'cod_decline' || action === 'cod_withdraw') {
      if (me.id !== job.recipient_id) fail('เฉพาะผู้รับ');
      if (!cod) fail('คำสั่งนี้ไม่ได้เก็บเงินปลายทาง');
      if (action === 'cod_decline' && !(job.status === 'pending' && job.cod_status === 'waiting')) fail('ปฏิเสธได้เฉพาะตอนรอการยอมรับ');
      if (action === 'cod_withdraw' && !(job.cod_status === 'accepted' && (job.status === 'pending' || job.status === 'confirmed'))) fail('ถอนการยอมรับได้ก่อนไรเดอร์รับของเท่านั้น');
      r = update('Jobs', id, { status: 'cancelled', cancelled_at: at, cancel_reason: action === 'cod_decline' ? 'cod_declined' : 'cod_withdrawn', cod_status: action === 'cod_decline' ? 'declined' : 'withdrawn' }, { status: job.status });
      log(me, action, id, action === 'cod_decline' ? 'ปฏิเสธชำระปลายทาง' : 'ถอนการยอมรับชำระปลายทาง');
      return r;
    }
    // ---- ผู้รับ: ไม่รับของระหว่างร้านนำส่ง
    if (action === 'refuse') {
      if (me.id !== job.recipient_id) fail('เฉพาะผู้รับ');
      need('delivering', 'ไม่รับของได้ระหว่างไรเดอร์กำลังนำส่ง');
      var rr = CONFIG.FAIL_REASONS[code];
      if (!rr || (rr.by !== 'recipient' && rr.by !== 'both')) fail('เลือกเหตุผลที่ไม่รับของ');
      if (code === 'cannot_pay' && job.pay_method !== 'cod') fail('คำสั่งนี้ผู้สั่งจ่ายแล้ว เลือกเหตุผลอื่น');
      if (code === 'late' && overdueMin(job) <= CONFIG.LATE.COD_FREE_MIN) fail('เลือก "ส่งช้าเกินกำหนด" ได้เมื่อเลยกำหนดเกิน ' + CONFIG.LATE.COD_FREE_MIN + ' นาที');
      return failJob(me, job, code, rr.fault, str(note, 300), [], at, 'recipient');
    }
    // ---- ผู้ที่ถูกหัก Point: ยื่นโต้แย้ง
    if (action === 'appeal') {
      if (me.id !== job.penalty_user || job.fail_fault !== 'recipient' || job.appeal_result === 'revoked') fail('ไม่มีบทลงโทษให้โต้แย้ง');
      if (job.appeal_at) fail('ยื่นโต้แย้งไปแล้ว');
      if (!str(note, 500)) fail('กรุณาเขียนเหตุผลที่โต้แย้ง');
      r = update('Jobs', id, { appeal_text: str(note, 500), appeal_at: at });
      log(me, 'appeal', id, 'ยื่นโต้แย้งการหัก Point');
      return r;
    }
    if (action === 'cancel') { // ผู้สั่งยกเลิกเองได้ก่อนไรเดอร์รับของ / แอดมินยกเลิกได้จนกว่าจะส่งสำเร็จ
      if (!admin && job.sender_id !== me.id) fail('ยกเลิกได้เฉพาะผู้สั่ง');
      if (!admin && ['pending', 'confirmed'].indexOf(job.status) < 0) fail('ยกเลิกได้ก่อนไรเดอร์รับของเท่านั้น หากต้องการยกเลิกกรุณาแชทกับแอดมิน');
      if (closed(job)) fail('คำสั่งนี้ปิดแล้ว');
      if (admin && !str(note, 300)) fail('กรุณาระบุเหตุผลที่ยกเลิก');
      var cp = { status: 'cancelled', cancelled_at: at, cancel_reason: admin ? 'admin' : 'sender', cancel_note: str(note, 300) };
      if (admin && job.picked_at && job.pay_method !== 'cod' && Number(job.total) > 0) cp.refund_amount = String(job.total); // ยกเลิกหลังเก็บเงินแล้ว: คืนเงินตอนผู้สั่งมารับของคืน
      r = update('Jobs', id, cp, { status: job.status });
      log(me, 'job_cancel', id, admin ? 'แอดมินยกเลิกคำสั่ง: ' + str(note, 100) + (cp.refund_amount ? ' · คืนเงิน ฿' + cp.refund_amount : '') : 'ยกเลิกคำสั่ง');
      if (admin) addReward(job.sender_id, 'cancel', 0, id, 'เหตุผล: ' + str(note, 100) + (job.picked_at ? ' · กรุณามารับของคืนที่จุดรับฝาก' + (cp.refund_amount ? ' และรับเงินคืน ฿' + cp.refund_amount : '') : ''));
      return r;
    }
    if (action === 'returned') {
      if (job.sender_id !== me.id && !admin) fail('ไม่มีสิทธิ์');
      if (job.status !== 'cancelled' || !job.picked_at) fail('ยืนยันรับของคืนได้เฉพาะคำสั่งที่ยกเลิกหลังไรเดอร์รับของแล้ว');
      if (job.returned_at) fail('บันทึกรับของคืนไปแล้ว');
      if (job.disposed_at) fail('ของชิ้นนี้แอดมินจัดการไปแล้ว');
      r = update('Jobs', id, job.refund_amount && !job.refunded_at ? { returned_at: at, refunded_at: at } : { returned_at: at });
      log(me, 'job_returned', id, 'รับของคืนแล้ว' + (job.refund_amount ? ' · คืนเงิน ฿' + job.refund_amount : ''));
      return r;
    }
    if (!admin) fail('เฉพาะแอดมิน');
    // ---- ของรอผู้สั่งมารับคืน: แจ้งซ้ำ / ขยายเวลา / บันทึกว่าจัดการแล้ว
    if (action === 'refunded') { // คืนเงินผู้สั่งแล้ว (แยกจากการรับของคืน)
      if (!Number(job.refund_amount)) fail('คำสั่งนี้ไม่มีเงินที่ต้องคืน');
      if (job.refunded_at) fail('บันทึกคืนเงินไปแล้ว');
      r = update('Jobs', id, { refunded_at: at });
      log(me, 'refund_paid', id, 'คืนเงินผู้สั่ง ฿' + job.refund_amount);
      return r;
    }
    if (action === 'remind_return' || action === 'extend_keep' || action === 'dispose') {
      if (!todoOf(job).ret) fail('คำสั่งนี้ไม่มีของรอรับคืน');
      if (action === 'remind_return') {
        r = update('Jobs', id, { remind_at: at });
        addReward(job.sender_id, 'return', 0, id, 'ของยังอยู่ที่จุดรับฝาก กรุณามารับคืน' + (todoOf(job).refund ? ' และรับเงินคืน ฿' + job.refund_amount : ''));
        log(me, 'return_remind', id, 'แจ้งผู้สั่งให้มารับของคืนอีกครั้ง');
        return r;
      }
      if (action === 'extend_keep') {
        var base = Math.max(Date.now(), new Date(keepUntil(job)).getTime());
        r = update('Jobs', id, { keep_until: new Date(base + CONFIG.REFUSE.HOLD_DAYS * 864e5).toISOString() });
        log(me, 'return_extend', id, 'ขยายเวลาเก็บของอีก ' + CONFIG.REFUSE.HOLD_DAYS + ' วัน');
        return r;
      }
      if (!str(note, 300)) fail('ระบุว่าจัดการของอย่างไร');
      r = update('Jobs', id, { disposed_at: at, dispose_note: str(note, 300) });
      log(me, 'return_dispose', id, 'จัดการของที่ไม่มีคนรับคืน: ' + str(note, 100));
      return r;
    }
    if (action === 'confirm') {
      need('pending', 'ยืนยันได้เฉพาะคำสั่งที่รอยืนยัน');
      if (cod && job.cod_status !== 'accepted') fail('ต้องรอผู้รับยอมรับชำระปลายทางก่อน');
      r = update('Jobs', id, { status: 'confirmed', confirmed_at: at }, { status: 'pending' });
      log(me, 'job_confirm', id, 'แอดมินยืนยันคำสั่ง');
      return r;
    }
    if (action === 'reject') {
      need('pending', 'ปฏิเสธได้เฉพาะคำสั่งที่รอยืนยัน');
      if (!str(note, 300)) fail('กรุณาระบุเหตุผลที่ปฏิเสธ');
      r = update('Jobs', id, { status: 'cancelled', cancelled_at: at, cancel_reason: 'rejected', cancel_note: str(note, 300) }, { status: 'pending' });
      log(me, 'job_reject', id, 'แอดมินปฏิเสธคำสั่ง: ' + str(note, 100));
      return r;
    }
    if (action === 'pickup') { // รับของที่จุดรับฝาก + เก็บเงินสด
      need('confirmed', 'ต้องยืนยันคำสั่งก่อน');
      var pp = checkPhotos(photos, CONFIG.PROOF_MIN, CONFIG.PROOF_MAX, 'กรุณาถ่ายรูปของตอนรับอย่างน้อย ' + CONFIG.PROOF_MIN + ' รูป');
      r = update('Jobs', id, { status: 'picked', picked_at: at, paid_at: cod ? '' : at, pickup_photo_count: String(pp.length) }, { status: 'confirmed' });
      savePhotos(id, 'pickup', pp, at);
      log(me, 'job_pickup', id, 'รับของที่จุดรับฝาก · ' + (cod ? 'เก็บเงินปลายทาง ฿' + job.total : 'เก็บเงิน ฿' + job.total));
      return r;
    }
    if (action === 'start') {
      need('picked', 'ต้องรับของก่อนออกนำส่ง');
      r = update('Jobs', id, { status: 'delivering', delivering_at: at }, { status: 'picked' });
      log(me, 'job_start', id, 'ออกนำส่ง');
      return r;
    }
    if (action === 'arrive') {
      need('delivering', 'ต้องกด "เริ่มนำส่ง" ก่อน');
      if (job.arrived_at) fail('บันทึกถึงจุดส่งแล้ว');
      r = update('Jobs', id, { arrived_at: at }, { status: 'delivering' });
      log(me, 'job_arrive', id, 'ถึงจุดส่ง');
      return r;
    }
    if (action === 'contact') { // บันทึกการพยายามติดต่อผู้รับ (ใช้เป็นหลักฐานกรณีไม่พบผู้รับ)
      need('delivering');
      if (!job.arrived_at) fail('กด "ถึงจุดส่งแล้ว" ก่อน');
      var cl = contactLog(job), kind = code === 'chat' ? 'chat' : 'call';
      if (kind === 'call') {
        var calls = cl.filter(function (c) { return c.k === 'call'; });
        if (calls.length && Date.now() - new Date(calls[calls.length - 1].t).getTime() < CONFIG.REFUSE.CALL_GAP_MIN * 60000) fail('โทรครั้งถัดไปได้หลังครั้งก่อน ' + CONFIG.REFUSE.CALL_GAP_MIN + ' นาที');
      } else {
        store.insert('Messages', { id: rid('M', 8), job_id: id, sender_id: me.id, text: 'ถึงจุดส่งแล้วครับ รบกวนติดต่อกลับหรือมารับของ', preset: 'yes', created_at: at, channel: 'recipient' });
      }
      cl.push({ k: kind, t: at });
      r = update('Jobs', id, { contact_log: JSON.stringify(cl) });
      log(me, 'job_contact', id, kind === 'call' ? 'โทรหาผู้รับ ไม่รับสาย' : 'ส่งแชทแจ้งถึงจุดส่ง');
      return r;
    }
    if (action === 'fail') { // ส่งไม่สำเร็จ (แอดมิน)
      need('delivering', 'บันทึกส่งไม่สำเร็จได้ระหว่างนำส่ง');
      var fr = CONFIG.FAIL_REASONS[code];
      if (!fr || fr.by === 'recipient') fail('เลือกเหตุผลที่ส่งไม่สำเร็จ');
      var fault = fr.verdict ? (photos && photos.verdict) : fr.fault, fnote = str(note, 300), fph = photos && photos.list;
      if (fr.verdict && ['sender', 'shop', 'recipient'].indexOf(fault) < 0) fail('เลือกว่าเป็นความผิดของใคร (เทียบรูป 3 ช่วง)');
      if ((fr.verdict || code === 'no_pay') && !fnote) fail('กรุณาเขียนรายละเอียด');
      var fp = checkPhotos(fph, 1, CONFIG.PROOF_MAX, 'กรุณาถ่ายรูปหลักฐานอย่างน้อย 1 รูป');
      if (code === 'not_found') {
        var R = CONFIG.REFUSE, log2 = contactLog(job), calls2 = log2.filter(function (c) { return c.k === 'call'; }).length, chats = log2.filter(function (c) { return c.k === 'chat'; }).length;
        if (!job.arrived_at) fail('กด "ถึงจุดส่งแล้ว" ก่อน');
        var waited = (Date.now() - new Date(job.arrived_at).getTime()) / 60000;
        if (calls2 < R.CALLS || chats < 1 || waited < R.WAIT_MIN) fail('ยังทำขั้นตอนไม่ครบ: โทร ' + calls2 + '/' + R.CALLS + ' ครั้ง · แชท ' + Math.min(chats, 1) + '/1 · รอ ' + Math.floor(waited) + '/' + R.WAIT_MIN + ' นาที');
      }
      return failJob(me, job, code, fault, fnote, fp, at, 'admin');
    }
    if (action === 'appeal_decide') {
      if (!job.appeal_at || job.appeal_result) fail('ไม่มีคำโต้แย้งที่รอตรวจ');
      var res = code === 'revoked' ? 'revoked' : 'kept';
      r = update('Jobs', id, { appeal_result: res, appeal_done_at: at });
      log(me, 'appeal_decide', id, res === 'revoked' ? 'ยกเลิกบทลงโทษ คืน ' + job.penalty_points + ' Point' : 'คงบทลงโทษ');
      if (res === 'revoked' && Number(job.penalty_points)) addReward(job.penalty_user, 'point', Number(job.penalty_points), id, 'แอดมินยกเลิกบทลงโทษ คืน Point ให้ และไม่นับการปฏิเสธครั้งนี้');
      else if (res === 'revoked') addReward(job.penalty_user, 'notice', 0, id, 'แอดมินยกเลิกบทลงโทษ ไม่นับการปฏิเสธครั้งนี้');
      else addReward(job.penalty_user, 'notice', 0, id, 'แอดมินตรวจคำโต้แย้งแล้ว คงบทลงโทษเดิม');
      return r;
    }
    if (action === 'deliver') {
      need('delivering', 'ต้องกด "เริ่มนำส่ง" ก่อน');
      if (cod && note !== 'cod_collected') fail('ติ๊ก "เก็บเงินสดจากผู้รับแล้ว" ก่อนยืนยัน');
      var lockLeft = job.code_lock_until ? new Date(job.code_lock_until).getTime() - Date.now() : 0;
      if (lockLeft > 0) fail('ใส่รหัสผิดครบ ' + CONFIG.CODE_MAX_TRIES + ' ครั้ง ลองใหม่ได้ในอีก ' + Math.ceil(lockLeft / 60000) + ' นาที');
      if (str(code, 10) !== ('000' + job.code).slice(-4)) {
        var fails = Number(job.code_fails || 0) + 1;
        if (fails >= CONFIG.CODE_MAX_TRIES) {
          store.update('Jobs', id, { code_fails: '0', code_lock_until: new Date(Date.now() + CONFIG.CODE_LOCK_MIN * 60000).toISOString() });
          log(me, 'job_code_locked', id, 'ใส่รหัสผิดครบ ' + CONFIG.CODE_MAX_TRIES + ' ครั้ง');
          fail('ใส่รหัสผิดครบ ' + CONFIG.CODE_MAX_TRIES + ' ครั้ง ล็อกการใส่รหัส ' + CONFIG.CODE_LOCK_MIN + ' นาที');
        }
        store.update('Jobs', id, { code_fails: String(fails) });
        fail('รหัสรับของไม่ถูกต้อง · เหลืออีก ' + (CONFIG.CODE_MAX_TRIES - fails) + ' ครั้ง');
      }
      var dp = checkPhotos(photos, CONFIG.PROOF_MIN, CONFIG.PROOF_MAX, 'กรุณาถ่ายรูปตอนส่งอย่างน้อย ' + CONFIG.PROOF_MIN + ' รูป');
      var pe = pointsEarn(job), payer = payerOf(job);
      var lateMin = Math.max(0, Math.round((new Date(at).getTime() - new Date(job.due_at).getTime()) / 60000));
      var excused = lateMin > 0 && job.arrived_at && new Date(job.arrived_at).getTime() <= new Date(job.due_at).getTime(); // ถึงก่อนกำหนดแต่ผู้รับไม่อยู่
      var comp = lateMin > CONFIG.LATE.GRACE_MIN && !excused ? CONFIG.LATE.COMP_POINTS : 0;
      r = update('Jobs', id, { status: 'delivered', delivered_at: at, delivery_photo_count: String(dp.length), code_fails: '0', code_lock_until: '', points_earned: String(pe),
        paid_at: cod ? at : job.paid_at, late_min: String(lateMin), late_excused: excused ? '1' : '', comp_points: comp ? String(comp) : '' }, { status: 'delivering' });
      savePhotos(id, 'delivery', dp, at);
      log(me, 'job_deliver', id, 'ส่งถึงมือผู้รับแล้ว' + (cod ? ' · เก็บเงินปลายทาง ฿' + job.total : '') + (lateMin > 0 ? ' · ' + (excused ? 'หลังกำหนด ' + lateMin + ' นาที (ผู้รับไม่อยู่)' : 'ช้า ' + lateMin + ' นาที') : ''));
      addReward(payer, 'point', pe, id, 'คำสั่ง ' + id + ' สำเร็จ');
      if (comp) addReward(payer, 'point', comp, id, 'ชดเชยส่งช้า ' + lateMin + ' นาที');
      return r;
    }
    fail('คำสั่งไม่ถูกต้อง');
  }

  function needAdmin(me) { if (me.role !== 'admin') fail('เฉพาะแอดมิน'); }
  // แชท: ผู้สั่งและผู้รับคุยกับร้าน (แอดมิน) คนละห้อง ต่อหนึ่งคำสั่ง
  function canChat(job, me) { return me.role === 'admin' || [job.sender_id, job.recipient_id].indexOf(me.id) >= 0; }
  function chatChannel(job, me, want) {
    if (me.role === 'admin') {
      if (want !== 'sender' && want !== 'recipient') fail('เลือกห้องแชทก่อน');
      return want;
    }
    return me.id === job.sender_id ? 'sender' : 'recipient';
  }

  // ---------- จุดเข้าใช้งานเดียวของหน้าเว็บ ----------
  // ===================== ผู้ช่วย AI: ตอบแทนแอดมิน + ส่งต่อแอดมิน =====================
  var botModel = null, botModelKey = '';
  function botExamples() {
    var ex = [];
    Object.keys(BOT.TRAIN).forEach(function (k) { BOT.TRAIN[k].forEach(function (t) { ex.push([t, k]); }); });
    store.list('BotExamples').forEach(function (e) { if (BOT.INTENTS[e.intent]) ex.push([e.text, e.intent]); });
    return ex;
  }
  function model() {
    var ex = botExamples(), key = String(ex.length);
    if (!botModel || botModelKey !== key) { botModel = botTrain(ex); botModelKey = key; }
    return botModel;
  }
  function tTime(iso) { return new Date(iso).toLocaleTimeString('th-TH', { timeZone: CONFIG.TIMEZONE, hour: '2-digit', minute: '2-digit' }) + ' น.'; }
  function tWhen(iso) {
    var same = dayKey(iso) === dayKey(nowIso());
    return (same ? 'วันนี้ ' : new Date(iso).toLocaleDateString('th-TH', { timeZone: CONFIG.TIMEZONE, day: 'numeric', month: 'short' }) + ' ') + tTime(iso);
  }
  function threadId(uid) { return 'B' + uid; }
  function getThread(uid) {
    var t = store.list('BotThreads').filter(function (x) { return x.id === threadId(uid); })[0];
    if (t) return t;
    t = { id: threadId(uid), user_id: uid, mode: 'bot', reason: '', summary: '', last_order: '', handoff_at: '', closed_at: '', updated_at: nowIso() };
    store.insert('BotThreads', t);
    return t;
  }
  function botMsgs(tid) {
    return store.list('BotMessages').filter(function (m) { return m.thread_id === tid; })
      .sort(function (x, y) { return String(x.created_at).localeCompare(String(y.created_at)) || String(x.seq).localeCompare(String(y.seq)); });
  }
  var botSeq = 0;
  function addMsg(t, role, text, extra) {
    var m = { id: rid('BM', 8), thread_id: t.id, user_id: t.user_id, role: role, text: str(text, 600), intent: '', conf: '', card: '', options: '', created_at: nowIso(), read_at: '', taught: '', seq: String(1e6 + (++botSeq)) };
    for (var k in (extra || {})) m[k] = extra[k];
    store.insert('BotMessages', m);
    store.update('BotThreads', t.id, { updated_at: m.created_at });
    return m;
  }
  function shopOpen() {
    var h = BOT.SHOP_HOURS, now = new Date().toLocaleTimeString('en-GB', { timeZone: CONFIG.TIMEZONE, hour: '2-digit', minute: '2-digit' });
    return now >= h.open && now < h.close;
  }
  var CANCEL_LABEL = { sender: 'ผู้สั่งยกเลิก', admin: 'แอดมินยกเลิก', rejected: 'แอดมินปฏิเสธคำสั่ง', cod_declined: 'ผู้รับปฏิเสธชำระปลายทาง', cod_withdrawn: 'ผู้รับถอนการยอมรับชำระ', cod_expired: 'ผู้รับไม่ตอบรับภายใน 24 ชม.', failed: 'ส่งไม่สำเร็จ' };
  function zoneShort(j) { return String(j.dropoff_zone || '').replace(/ \(.*\)$/, ''); }
  function myOrder(j, uid) { return j.sender_id === uid || j.recipient_id === uid; }
  function orderCard(j, uid) {
    var rows = [['สั่งเมื่อ', tWhen(j.created_at)]];
    if (j.confirmed_at) rows.push(['แอดมินยืนยัน', tWhen(j.confirmed_at)]);
    if (j.picked_at) rows.push(['ไรเดอร์รับของ', tWhen(j.picked_at)]);
    if (j.delivering_at) rows.push(['ออกนำส่ง', tWhen(j.delivering_at)]);
    if (j.arrived_at && !j.delivered_at) rows.push(['ถึงจุดส่ง', tWhen(j.arrived_at)]);
    if (j.delivered_at) rows.push(['ส่งสำเร็จ', tWhen(j.delivered_at)]);
    if (j.cancelled_at) rows.push(['ยกเลิก', tWhen(j.cancelled_at)]);
    if (isActive(j)) rows.push(['ต้องถึง ' + zoneShort(j), 'ก่อน ' + tTime(j.due_at)]);
    var st = j.status === 'pending' && j.cod_status === 'waiting' ? 'รอผู้รับยอมรับ' : CONFIG.STATUS[j.status];
    return JSON.stringify({ type: 'order', id: j.id, status: st, st: j.status, as: j.sender_id === uid ? 'ผู้สั่ง' : 'ผู้รับ', rows: rows });
  }
  // ---- คำตอบแต่ละประเภท (ดึงจากข้อมูลจริง ไม่ให้ AI แต่งตัวเลขเอง) ----
  function answerOrder(intent, j, me) {
    var cod = j.pay_method === 'cod', payer = payerOf(j);
    if (intent === 'status') {
      var s = {
        pending: cod && j.cod_status === 'waiting' ? 'รอผู้รับกดยอมรับชำระปลายทาง จากนั้นแอดมินจึงยืนยันคำสั่ง' : 'รอแอดมินยืนยันคำสั่งครับ',
        confirmed: 'แอดมินยืนยันแล้ว รอไรเดอร์รับของที่จุดรับฝาก',
        picked: 'ไรเดอร์รับของแล้ว กำลังเตรียมออกนำส่ง',
        delivering: j.arrived_at ? 'ไรเดอร์ถึงจุดส่งแล้วเมื่อ ' + tTime(j.arrived_at) + ' กำลังติดต่อผู้รับ' : 'กำลังนำส่งครับ ต้องถึงก่อน ' + tTime(j.due_at),
        delivered: 'ส่งสำเร็จแล้วเมื่อ ' + tWhen(j.delivered_at),
        cancelled: 'คำสั่งนี้ยกเลิกแล้ว (' + (CANCEL_LABEL[j.cancel_reason] || 'ยกเลิก') + ')',
      }[j.status];
      var od = isActive(j) ? overdueMin(j) : 0;
      return { text: j.id + ': ' + s + (od ? ' · ตอนนี้เลยกำหนดมา ' + od + ' นาที' : ''), card: orderCard(j, me.id) };
    }
    if (intent === 'pay_amount') {
      if (j.status === 'cancelled') return { text: j.id + ' ยกเลิกแล้ว จึงไม่มีการเก็บเงิน' + (Number(j.points_used) ? ' และคืน ' + j.points_used + ' Point ให้คนที่ใช้แล้ว' : '') };
      if (cod && j.cod_status === 'waiting') return { text: j.id + ' เป็นแบบเก็บเงินปลายทาง ผู้รับเป็นผู้จ่าย ยอดก่อนส่วนลด ฿' + j.subtotal + (j.recipient_id === me.id ? ' คุณเลือกใช้ Point ลดได้ตอนกดยอมรับในหน้าคำสั่ง' : ' รอผู้รับกดยอมรับ'), card: orderCard(j, me.id) };
      var who = payer === me.id ? 'คุณเป็นผู้จ่าย' : (cod ? 'ผู้รับเป็นผู้จ่าย' : 'ผู้สั่งเป็นผู้จ่าย');
      var parts = 'ค่าบริการ ฿' + j.subtotal + (Number(j.discount) ? ' ใช้ ' + j.points_used + ' Point ลด ฿' + j.discount : '');
      var when = j.paid_at ? 'ชำระแล้วเมื่อ ' + tWhen(j.paid_at) : (cod ? 'จ่ายเงินสดให้ไรเดอร์ตอนได้รับของ' : 'จ่ายเงินสดตอนไรเดอร์รับของที่จุดรับฝาก');
      return { text: j.id + (cod ? ' เป็นแบบเก็บเงินปลายทาง ' : ' จ่ายตอนฝากของ ') + who + ' ยอด ฿' + j.total + ' (' + parts + ') · ' + when };
    }
    if (intent === 'cancel') {
      if (closed(j)) return { text: j.id + ' ปิดแล้ว (' + CONFIG.STATUS[j.status] + ') ยกเลิกไม่ได้' };
      if (j.sender_id !== me.id) return { text: 'ผู้รับยกเลิกคำสั่งไม่ได้ครับ ถ้าไม่ต้องการของ ' + (cod ? 'กดปฏิเสธชำระปลายทางในหน้าคำสั่งได้' : 'แจ้งผู้สั่งหรือติดต่อแอดมิน') };
      if (['pending', 'confirmed'].indexOf(j.status) >= 0) return { text: 'ยกเลิกเองได้ครับ เปิดคำสั่ง ' + j.id + ' แล้วกด "ยกเลิกคำสั่ง" ด้านล่าง' + (Number(j.points_used) ? ' Point ที่ใช้ไปจะคืนอัตโนมัติ' : ''), card: orderCard(j, me.id) };
      return { text: 'ไรเดอร์รับ ' + j.id + ' ไปแล้ว จึงยกเลิกเองไม่ได้ ถ้าต้องการยกเลิกกด "ติดต่อแอดมิน" ได้เลยครับ' };
    }
    if (intent === 'late') {
      var L = CONFIG.LATE;
      if (j.status === 'delivered') return { text: Number(j.late_min) > L.GRACE_MIN && !j.late_excused ? j.id + ' ส่งช้า ' + j.late_min + ' นาที คนที่จ่ายได้รับชดเชย ' + (j.comp_points || L.COMP_POINTS) + ' Point แล้ว' : j.id + ' ส่งทันกำหนด' };
      if (!isActive(j)) return { text: j.id + ' ยกเลิกแล้ว' };
      var o = overdueMin(j);
      if (!o) return { text: j.id + ' ยังไม่เลยกำหนดครับ ต้องถึงก่อน ' + tTime(j.due_at), card: orderCard(j, me.id) };
      return { text: j.id + ' เลยกำหนดมา ' + o + ' นาที ขออภัยครับ ถ้าส่งช้าเกิน ' + L.GRACE_MIN + ' นาที คนที่จ่ายจะได้ชดเชย ' + L.COMP_POINTS + ' Point อัตโนมัติ' + (cod ? ' และถ้าเลยเกิน ' + L.COD_FREE_MIN + ' นาที ผู้รับปฏิเสธรับของได้โดยไม่ถูกหัก Point' : ''), card: orderCard(j, me.id) };
    }
    return null;
  }
  function answerGeneral(intent, me) {
    var P = CONFIG.PRICE, U = CONFIG.POINT_USE, R = CONFIG.REFUSE, H = BOT.SHOP_HOURS;
    switch (intent) {
      case 'greet': return 'สวัสดีครับ ผม' + BOT.NAME + ' ผู้ช่วยของ ' + CONFIG.APP_NAME + ' ถามเรื่องคำสั่งของคุณ ค่าบริการ Point หรือกติกาได้เลย ใส่เลขคำสั่งมาด้วยจะตอบได้ตรงขึ้น';
      case 'thanks': return 'ยินดีครับ มีอะไรถามได้ตลอด';
      case 'status': case 'pay_amount': return 'ตอนนี้คุณไม่มีคำสั่งที่กำลังดำเนินการครับ ถ้าถามถึงคำสั่งเก่า พิมพ์เลขคำสั่งมาได้เลย เช่น TM' + new Date().toLocaleDateString('en-GB', { timeZone: CONFIG.TIMEZONE, day: '2-digit', month: '2-digit' }).replace('/', '') + '-01';
      case 'cancel': return 'ผู้สั่งยกเลิกเองได้ก่อนไรเดอร์รับของ ที่หน้าคำสั่งปุ่ม "ยกเลิกคำสั่ง" Point ที่ใช้คืนอัตโนมัติ หลังไรเดอร์รับของแล้วต้องติดต่อแอดมิน';
      case 'late': return 'ถ้าส่งช้าเกินกำหนดเกิน ' + CONFIG.LATE.GRACE_MIN + ' นาที คนที่จ่ายได้ชดเชย ' + CONFIG.LATE.COMP_POINTS + ' Point อัตโนมัติ ส่วนแบบเก็บเงินปลายทางที่เลยเกิน ' + CONFIG.LATE.COD_FREE_MIN + ' นาที ผู้รับปฏิเสธได้โดยไม่ถูกหัก Point';
      case 'pay_method': return 'จ่ายได้ 2 แบบ เป็นเงินสดทั้งคู่: ' + CONFIG.PAY_METHODS.sender.label + ' (' + CONFIG.PAY_METHODS.sender.hint + ') หรือ ' + CONFIG.PAY_METHODS.cod.label + ' (' + CONFIG.PAY_METHODS.cod.hint + ') · ตอนนี้ยังไม่รับโอน';
      case 'price': {
        var items = Object.keys(P.ITEM_EXTRA).map(function (k) { return k.split(' /')[0]; }).join(' ');
        return 'ส่งปกติ ฿' + P.BASE.normal + ' · ส่งด่วน ฿' + P.BASE.urgent + ' บวกตามระยะ ' + CONFIG.TIERS.map(function (t, i) { return t.label.replace('ระยะ', '') + ' +' + P.DIST[i]; }).join(' / ') +
          ' และของที่ต้องดูแลเพิ่ม (' + items + ') +฿' + P.ITEM_EXTRA[Object.keys(P.ITEM_EXTRA)[0]] + ' · ดูราคาจริงได้ตอนสั่งก่อนกดยืนยัน';
      }
      case 'points': {
        var b = pointBalance(me.id);
        return 'ตอนนี้คุณมี ' + b.balance + ' Point · ใช้ลดค่าบริการได้ ' + U.PER_BAHT + ' Point = ฿1 ไม่เกินครึ่งหนึ่งของค่าบริการ · ได้ Point อัตโนมัติเมื่อคำสั่งสำเร็จ (ปกติ ' + CONFIG.POINTS.BASE.normal + ' ด่วน ' + CONFIG.POINTS.BASE.urgent + ' บวกตามระยะ) คนที่จ่ายเป็นคนได้ Point';
      }
      case 'refuse_rule': {
        var rf = refusals(me.id);
        return 'ปฏิเสธรับของได้ครับ ไม่เสียค่าบริการและคืน Point ที่ใช้ แต่ถ้าเป็นแบบเก็บเงินปลายทาง ไรเดอร์ออกนำส่งแล้ว และเป็นความผิดของผู้รับ (เช่น เปลี่ยนใจ ติดต่อไม่ได้) จะหัก ' + R.PENALTY + ' Point ' +
          'ครบ ' + R.LIMIT + ' ครั้งใน ' + R.WINDOW_DAYS + ' วัน ระงับรับปลายทาง ' + R.BAN_DAYS + ' วัน ถ้าเห็นว่าไม่ได้ผิดยื่นโต้แย้งได้ในหน้าคำสั่ง · ของคุณตอนนี้: ' + rf.recent + ' ครั้งใน ' + R.WINDOW_DAYS + ' วัน' + (rf.ban_until ? ' (ระงับถึง ' + tWhen(rf.ban_until) + ')' : '');
      }
      case 'hours': return 'เปิดให้บริการ' + H.days + ' ' + H.open + '–' + H.close + ' น. ตอนนี้' + (shopOpen() ? 'อยู่ในเวลาให้บริการ งานด่วนสั่งได้ถึง ' + serviceStatus().urgent_until + ' น.' : 'นอกเวลาให้บริการ สั่งได้อีกครั้งตอน ' + H.open + ' น.');
      case 'dropoff_point': return 'จุดรับฝากอยู่ที่ ' + CONFIG.DROP_POINT_PLACE + ' ' + CONFIG.DROP_POINT_NOTE;
      case 'how_order': return 'กด "หน้าแรก" เลือกบริการ แล้วกรอกผู้รับ จุดส่ง ประเภทของ แนบรูปของ เลือกวิธีจ่าย ตรวจราคาแล้วกดยืนยัน จากนั้นนำของไปวางที่จุดรับฝาก ' + CONFIG.DROP_POINT_PLACE;
      case 'code': return 'รหัสรับของ 4 หลักอยู่ในหน้าคำสั่งฝั่งผู้รับ ให้บอกไรเดอร์ตอนได้รับของเท่านั้น ใส่ผิดได้ ' + CONFIG.CODE_MAX_TRIES + ' ครั้งแล้วล็อก ' + CONFIG.CODE_LOCK_MIN + ' นาที · เพื่อความปลอดภัยผู้ช่วยไม่แสดงรหัสในแชท';
    }
    return '';
  }
  function activeOrders(uid) { return jobs().filter(function (j) { return isActive(j) && myOrder(j, uid); }).sort(byCreatedDesc); }
  function queuePos(t) {
    var w = store.list('BotThreads').filter(function (x) { return x.mode === 'handoff' && x.handoff_at && !adminReplied(x); })
      .sort(function (a, b) { return String(a.handoff_at).localeCompare(String(b.handoff_at)); });
    var i = w.map(function (x) { return x.id; }).indexOf(t.id);
    return i < 0 ? w.length : i + 1;
  }
  function adminReplied(t, ms) {
    ms = ms || botMsgs(t.id);
    return ms.some(function (m) { return m.role === 'admin' && m.created_at >= t.handoff_at; });
  }
  var HANDOFF_REASON = { admin_button: 'กดติดต่อแอดมิน', clarify: 'ถามกลับแล้วยังไม่ใช่', admin_takeover: 'แอดมินเข้ามาตอบเอง' };
  function reasonLabel(r) { return HANDOFF_REASON[r] || (BOT.INTENTS[r] || {}).label || r; }
  function makeSummary(t, reason) { // สรุปให้แอดมิน: เหตุผล + ข้อความล่าสุด + คำสั่งที่เกี่ยวข้อง + เรื่องที่ถามก่อนหน้า
    var ms = botMsgs(t.id).filter(function (m) { return m.role === 'user'; });
    var last = ms.filter(function (m) { return !m.picked; }).slice(-1)[0];
    var asked = [];
    ms.slice(-8).forEach(function (m) { var l = (BOT.INTENTS[m.intent] || {}).label; if (l && asked.indexOf(l) < 0 && m.intent !== reason) asked.push(l); });
    var j = t.last_order ? jobs().filter(function (x) { return x.id === t.last_order && myOrder(x, t.user_id); })[0] : null;
    return reasonLabel(reason) + (last ? ': "' + str(last.text, 120) + '"' : '') +
      (j ? ' · คำสั่ง ' + j.id + ' (' + CONFIG.STATUS[j.status] + ', ' + tWhen(j.created_at) + ', ' + (j.sender_id === t.user_id ? 'เป็นผู้สั่ง' : 'เป็นผู้รับ') + ')' : '') +
      (asked.length ? ' · ก่อนหน้านี้ถามเรื่อง ' + asked.slice(0, 3).join(', ') : '');
  }
  function handoff(t, reason, botText) {
    if (botText) addMsg(t, 'bot', botText);
    t = store.update('BotThreads', t.id, { mode: 'handoff', reason: reason, handoff_at: nowIso(), closed_at: '', summary: makeSummary(t, reason) });
    var H = BOT.SHOP_HOURS;
    addMsg(t, 'system', 'ส่งต่อแอดมินแล้ว · คิวที่ ' + queuePos(t) + (shopOpen() ? '' : ' · นอกเวลาให้บริการ แอดมินจะตอบเมื่อเปิด') + ' · เวลาให้บริการ ' + H.open + '–' + H.close + ' น.');
    log(userById(t.user_id), 'bot_handoff', t.id, reasonLabel(reason));
    return t;
  }
  function findOrder(text) { var m = String(text || '').toUpperCase().match(/TM\d{4}-\d{2}/); return m ? m[0] : ''; }
  // ตอบตามประเภทคำถาม: คืนข้อความของผู้ช่วยที่บันทึกแล้ว
  function botAnswer(t, me, intent, orderId) {
    var I = BOT.INTENTS[intent];
    if (I.handoff) {
      return handoff(t, intent, 'เรื่อง' + I.label + 'ต้องให้แอดมินดูแลครับ ส่งต่อพร้อมสรุปเรื่องให้แล้ว');
    }
    if (orderId) {
      var j = jobs().filter(function (x) { return x.id === orderId; })[0];
      if (!j || !myOrder(j, me.id)) return addMsg(t, 'bot', 'คำสั่ง ' + orderId + ' ไม่ใช่คำสั่งที่คุณเป็นผู้สั่งหรือผู้รับ จึงแสดงข้อมูลให้ไม่ได้ครับ', rateMark(t, intent));
    }
    if (I.order) {
      var id = orderId || (t.last_order && dayKey(t.last_order_at || t.updated_at) === today() ? t.last_order : ''); // วันใหม่ไม่จำเลขคำสั่งเดิม
      if (id && !jobs().some(function (x) { return x.id === id && myOrder(x, me.id); })) id = '';
      if (!id) {
        var act = activeOrders(me.id);
        if (act.length === 1) id = act[0].id;
        else if (act.length > 1) {
          return addMsg(t, 'bot', 'คุณมี ' + act.length + ' คำสั่งที่กำลังดำเนินการ หมายถึงคำสั่งไหนครับ', {
            options: JSON.stringify(act.slice(0, 4).map(function (j) { return { kind: 'order', intent: intent, order: j.id, label: j.id + ' · ' + (j.sender_id === me.id ? 'ส่งถึง ' : 'ของที่จะได้รับ ') + zoneShort(j) }; })),
          });
        }
      }
      if (id) {
        store.update('BotThreads', t.id, { last_order: id, last_order_at: nowIso() });
        var r = answerOrder(intent, getJob(id), me);
        var ex = rateMark(t, intent); ex.card = r.card || '';
        return addMsg(t, 'bot', r.text, ex);
      }
    }
    return addMsg(t, 'bot', answerGeneral(intent, me), rateMark(t, intent));
  }
  // คำตอบที่ให้คะแนนได้: ผูกกับคำถามล่าสุดของผู้ใช้ (ไม่นับคำทักทาย/ขอบคุณ)
  function rateMark(t, intent) {
    if (intent === 'greet' || intent === 'thanks') return { intent: intent };
    var q = botMsgs(t.id).filter(function (m) { return m.role === 'user' && m.intent && m.intent !== 'pick'; }).slice(-1)[0];
    return { intent: intent, rate: 'yes', q_id: q ? q.id : '' };
  }
  function today() { return dayKey(nowIso()); }
  function ratedOn(uid, day) { var r = store.list('BotRatings').filter(function (x) { return x.user_id === uid && dayKey(x.created_at) === day; })[0]; return r ? Number(r.stars) : 0; }
  // ลบแชทที่เก่ากว่า KEEP_DAYS (เปิดใช้ตอนขึ้น Google Sheet ด้วย BOT.PURGE)
  function botPurge() {
    if (!BOT.PURGE || !BOT.KEEP_DAYS || !store.remove) return;
    var cut = Date.now() - BOT.KEEP_DAYS * 864e5;
    ['BotMessages', 'BotRatings'].forEach(function (tb) { store.list(tb).forEach(function (r) { if (new Date(r.created_at).getTime() < cut) store.remove(tb, r.id); }); });
  }
  function ratedToday(uid) { return store.list('BotRatings').some(function (r) { return r.user_id === uid && dayKey(r.created_at) === today(); }); }
  function ratePrompt(t, ms) {
    if (t.mode !== 'bot' || t.rate_skip === today() || ratedToday(t.user_id)) return false;
    return ms.filter(function (m) { return m.rate && dayKey(m.created_at) === today(); }).length >= BOT.RATE_AFTER;
  }
  function userMsgView(m, admin) {
    var o = { id: m.id, role: m.role, text: m.text, created_at: m.created_at, read_at: m.read_at };
    if (m.card) try { o.card = JSON.parse(m.card); } catch (e) {}
    if (m.options) try { o.options = JSON.parse(m.options); } catch (e) {}
    if (m.used) o.used = true;
    if (m.rate) { o.rate = true; o.fb = m.fb || ''; o.fb_reason = m.fb_reason || ''; o.fb_reason_label = BOT.FB_REASONS[m.fb_reason] || ''; }
    if (admin && m.role === 'user' && m.intent) {
      o.intent = m.intent; o.intent_label = m.intent === 'pick' ? 'เลือกจากตัวเลือก' : (BOT.INTENTS[m.intent] || {}).label || m.intent;
      o.conf = Number(m.conf); o.low = m.intent !== 'pick' && Number(m.conf) < BOT.THRESHOLD; o.taught = m.taught; o.route = m.route;
    }
    return o;
  }
  function threadView(t, admin) {
    var ms = botMsgs(t.id), u = userById(t.user_id);
    var waiting = t.mode === 'handoff' && !adminReplied(t, ms);
    return {
      user_id: t.user_id, name: u ? u.name : '', username: u ? u.username : '', mode: t.mode, reason: t.reason, reason_label: t.reason ? reasonLabel(t.reason) : '',
      summary: t.summary, last_order: t.last_order, handoff_at: t.handoff_at, closed_at: t.closed_at, waiting: waiting,
      wait_min: waiting ? Math.max(0, Math.floor((Date.now() - new Date(t.handoff_at).getTime()) / 60000)) : 0,
      queue: waiting ? queuePos(t) : 0,
      last: ms.length ? { text: ms[ms.length - 1].text, role: ms[ms.length - 1].role, at: ms[ms.length - 1].created_at } : null,
      unread: admin ? ms.filter(function (m) { return m.role === 'user' && !m.admin_read && t.mode === 'handoff' && m.created_at >= t.handoff_at; }).length : ms.filter(function (m) { return m.role === 'admin' && !m.read_at; }).length,
    };
  }
  function botUnread(uid) {
    var t = store.list('BotThreads').filter(function (x) { return x.id === threadId(uid); })[0];
    return t ? botMsgs(t.id).filter(function (m) { return m.role === 'admin' && !m.read_at; }).length : 0;
  }
  function botWaiting() { return store.list('BotThreads').filter(function (t) { return t.mode === 'handoff' && !adminReplied(t); }).length; }
  function botAccuracy() {
    var m = model(), ok = 0, direct = 0;
    var rows = BOT.TEST.map(function (x) {
      var p = m.predict(x[0]), hit = p.intent === x[1];
      if (hit) ok++;
      if (hit && p.conf >= BOT.THRESHOLD) direct++;
      return { text: x[0], want: x[1], got: p.intent, want_label: BOT.INTENTS[x[1]].label, got_label: (BOT.INTENTS[p.intent] || {}).label || '–', conf: p.conf, ok: hit };
    });
    return { total: BOT.TEST.length, correct: ok, direct: direct, train: m.size, rows: rows };
  }
  function botStats() {
    var from = Date.now() - 7 * 864e5;
    var ms = store.list('BotMessages').filter(function (m) { return new Date(m.created_at).getTime() >= from; });
    var qs = ms.filter(function (m) { return m.role === 'user' && m.intent && m.intent !== 'pick'; });
    var handoffs = ms.filter(function (m) { return m.role === 'system' && /^ส่งต่อแอดมิน/.test(m.text); }).length;
    var byIntent = {};
    qs.forEach(function (m) { var k = Number(m.conf) < BOT.THRESHOLD ? 'unsure' : m.intent; byIntent[k] = (byIntent[k] || 0) + 1; });
    var solved = qs.filter(function (m) { return Number(m.conf) >= BOT.THRESHOLD && !(BOT.INTENTS[m.intent] || {}).handoff; }).length;
    // เวลาที่แอดมินตอบครั้งแรกหลังส่งต่อ (นาที)
    var waits = [];
    store.list('BotThreads').forEach(function (t) {
      var tm = botMsgs(t.id);
      tm.forEach(function (m, i) {
        if (m.role !== 'system' || !/^ส่งต่อแอดมิน/.test(m.text) || new Date(m.created_at).getTime() < from) return;
        var r = tm.slice(i + 1).filter(function (x) { return x.role === 'admin'; })[0];
        if (r) waits.push((new Date(r.created_at) - new Date(m.created_at)) / 60000);
      });
    });
    var users = allUsers();
    var low = store.list('BotMessages').filter(function (m) { return m.role === 'user' && m.intent && m.intent !== 'pick' && Number(m.conf) < BOT.THRESHOLD && !m.taught; })
      .sort(function (x, y) { return String(y.created_at).localeCompare(String(x.created_at)); }).slice(0, 10)
      .map(function (m) { return { id: m.id, text: m.text, conf: Number(m.conf), guess: m.intent, guess_label: (BOT.INTENTS[m.intent] || {}).label, user: nameOf(m.user_id, users), at: m.created_at }; });
    return {
      questions: qs.length, solved: solved, solved_pct: qs.length ? Math.round(solved / qs.length * 100) : null, handoffs: handoffs,
      admin_wait_min: waits.length ? Math.round(waits.reduce(function (a, b) { return a + b; }, 0) / waits.length) : null,
      by_intent: Object.keys(byIntent).map(function (k) { return { key: k, label: k === 'unsure' ? 'ไม่แน่ใจ (ถามกลับ)' : BOT.INTENTS[k].label, n: byIntent[k] }; }).sort(function (a, b) { return b.n - a.n; }),
      low: low, report: botReport(from, users), accuracy: botAccuracy(), threshold: BOT.THRESHOLD, taught: store.list('BotExamples').length,
      intents: Object.keys(BOT.INTENTS).map(function (k) { return { key: k, label: BOT.INTENTS[k].label }; }),
    };
  }
  // สมุดพกน้องถึง: ขนนกเฉลี่ย · % ตรงใจ (รวม / แยกเรื่อง) · คำตอบที่ยังไม่ตรง · คำชมล่าสุด
  function botReport(from, users) {
    var all = store.list('BotMessages'), byId = {};
    all.forEach(function (m) { byId[m.id] = m; });
    var rt = store.list('BotRatings').filter(function (r) { return new Date(r.created_at).getTime() >= from; });
    var fbs = all.filter(function (m) { return m.rate && m.fb && new Date(m.fb_at).getTime() >= from; });
    var up = fbs.filter(function (m) { return m.fb === 'up'; }).length;
    var per = {};
    fbs.forEach(function (m) { var k = m.intent; per[k] = per[k] || { up: 0, n: 0 }; per[k].n++; if (m.fb === 'up') per[k].up++; });
    var raters = {};
    rt.forEach(function (r) { raters[r.user_id] = 1; });
    return {
      ratings: rt.length, raters: Object.keys(raters).length,
      avg: rt.length ? Math.round(rt.reduce(function (s, r) { return s + Number(r.stars); }, 0) / rt.length * 10) / 10 : null,
      fb: fbs.length, up: up, down: fbs.length - up, up_pct: fbs.length ? Math.round(up / fbs.length * 100) : null,
      by_intent: Object.keys(per).map(function (k) { return { key: k, label: (BOT.INTENTS[k] || {}).label || k, n: per[k].n, pct: Math.round(per[k].up / per[k].n * 100) }; })
        .sort(function (a, b) { return a.pct - b.pct || b.n - a.n; }),
      bad: all.filter(function (m) { return m.fb === 'down' && !m.fb_done; }).sort(function (x, y) { return String(y.fb_at).localeCompare(String(x.fb_at)); }).slice(0, 10).map(function (m) {
        var q = byId[m.q_id] || {};
        return { id: m.id, q_id: q.id || '', q_text: q.text || '', q_intent: q.intent || '', q_label: (BOT.INTENTS[q.intent] || {}).label || '', q_conf: Number(q.conf || 0),
          answered: (BOT.INTENTS[m.intent] || {}).label || m.intent, answered_key: m.intent, answer: m.text, reason: m.fb_reason, reason_label: BOT.FB_REASONS[m.fb_reason] || 'ไม่ระบุเหตุผล', user: nameOf(m.user_id, users), at: m.fb_at };
      }),
      comments: store.list('BotRatings').filter(function (r) { return r.comment; }).sort(function (x, y) { return String(y.created_at).localeCompare(String(x.created_at)); }).slice(0, 5)
        .map(function (r) { return { stars: Number(r.stars), comment: r.comment, user: nameOf(r.user_id, users), at: r.created_at }; }),
      feather_label: BOT.FEATHER_LABEL,
    };
  }
  function botHandle(me, action, a) {
    var admin = me.role === 'admin';
    if (action === 'bot_thread') { // ผู้ใช้: เปิดห้องผู้ช่วย
      if (admin) fail('ใช้ได้เฉพาะผู้ใช้');
      botPurge();
      var t = getThread(me.id), all = botMsgs(t.id);
      if (a.day && a.day !== today()) { // ดูวันเก่า: อ่านอย่างเดียว
        var dm = all.filter(function (m) { return dayKey(m.created_at) === a.day; });
        if (!dm.length) fail('ไม่พบแชทของวันนี้');
        return { day: a.day, read_only: true, messages: dm.map(function (m) { var v = userMsgView(m, false); delete v.options; v.rate = false; return v; }), rated: ratedOn(me.id, a.day) };
      }
      // วันนี้ + เรื่องที่ส่งต่อแอดมินแล้วยังไม่ปิด (แสดงตั้งแต่วันที่ส่งต่อ)
      var from = t.mode === 'handoff' && t.handoff_at && dayKey(t.handoff_at) < today() ? dayKey(t.handoff_at) : today();
      var ms = all.filter(function (m) { return dayKey(m.created_at) >= from; });
      if (a.seen) ms.forEach(function (m) { if (m.role === 'admin' && !m.read_at) store.update('BotMessages', m.id, { read_at: nowIso() }); });
      var carry = null;
      if (from < today()) { var cu = ms.filter(function (m) { return m.role === 'user' && m.created_at <= t.handoff_at; }).slice(-1)[0]; carry = { text: cu ? cu.text : '', at: t.handoff_at }; }
      return { thread: threadView(t, false), messages: ms.map(function (m) { var v = userMsgView(m, false); if (dayKey(m.created_at) !== today()) { delete v.options; v.rate = false; } return v; }), bot_name: BOT.NAME,
        today: today(), carry: carry, rated: ratedOn(me.id, today()), has_history: all.some(function (m) { return dayKey(m.created_at) < from; }),
        rate_prompt: ratePrompt(t, ms), fb_reasons: BOT.FB_REASONS, feather_label: BOT.FEATHER_LABEL,
        quick: ['ของฉันถึงไหนแล้ว', 'ต้องจ่ายเท่าไร', 'ใช้ Point ยังไง', 'เปิดให้บริการกี่โมง'], hours: BOT.SHOP_HOURS };
    }
    if (action === 'bot_send') {
      if (admin) fail('ใช้ได้เฉพาะผู้ใช้');
      var th = getThread(me.id);
      if (a.pick) { // เลือกจากตัวเลือกที่ผู้ช่วยถามกลับ
        var src = botMsgs(th.id).filter(function (m) { return m.id === a.ref; })[0];
        var opt = null;
        try { opt = JSON.parse(src.options || '[]')[Number(a.pick) - 1]; } catch (e) {}
        if (!opt || src.used || dayKey(src.created_at) !== today()) fail('ตัวเลือกนี้ใช้ไปแล้ว');
        store.update('BotMessages', src.id, { used: 'yes' });
        addMsg(th, 'user', opt.label, { intent: 'pick', conf: '1', picked: 'yes' });
        if (th.mode === 'handoff') return { ok: true };
        if (opt.kind === 'admin') { handoff(th, 'clarify'); return { ok: true }; }
        botAnswer(getThread(me.id), me, opt.intent, opt.order || '');
        return { ok: true };
      }
      var text = str(a.text, 300);
      if (!text) fail('พิมพ์คำถามก่อนส่ง');
      var oid = findOrder(text);
      if (oid && jobs().some(function (j) { return j.id === oid && myOrder(j, me.id); })) th = store.update('BotThreads', th.id, { last_order: oid, last_order_at: nowIso() }); // จำเฉพาะคำสั่งของตัวเอง
      if (th.mode === 'handoff') { addMsg(th, 'user', text); return { ok: true }; }
      var p = model().predict(text);
      var um = addMsg(th, 'user', text, { intent: p.intent, conf: String(p.conf) });
      log(me, 'bot_ask', th.id, (BOT.INTENTS[p.intent] || {}).label + ' ' + Math.round(p.conf * 100) + '%');
      // ก้ำกึ่งระหว่างเรื่องที่ต้องส่งต่อแอดมินอยู่แล้ว (เช่น ของเสียหาย + คืนเงิน) ส่งต่อเลย ไม่ต้องถามกลับ
      var r0 = p.ranked[0], r1 = p.ranked[1];
      if (p.conf < BOT.THRESHOLD && r0 && r1 && r0.sim >= 0.35 && BOT.INTENTS[r0.intent].handoff && BOT.INTENTS[r1.intent].handoff) {
        store.update('BotMessages', um.id, { route: 'sensitive' });
        botAnswer(th, me, r0.intent, oid);
        return { ok: true, intent: p.intent, conf: p.conf, handoff: true };
      }
      if (p.conf < BOT.THRESHOLD) { // ไม่แน่ใจ: ถามกลับ 2 ตัวเลือก + ติดต่อแอดมิน
        var opts = p.ranked.filter(function (r) { return r.sim > 0; }).slice(0, 2).map(function (r) { return { kind: 'intent', intent: r.intent, order: oid, label: BOT.INTENTS[r.intent].label }; });
        opts.push({ kind: 'admin', label: opts.length ? 'ไม่ใช่ ติดต่อแอดมิน' : 'ติดต่อแอดมิน' });
        addMsg(th, 'bot', opts.length > 1 ? 'ยังไม่แน่ใจว่าถามเรื่องไหน หมายถึงข้อใดครับ' : 'ยังไม่เข้าใจคำถามครับ ลองพิมพ์ใหม่ หรือให้แอดมินช่วย', { options: JSON.stringify(opts) });
        return { ok: true, intent: p.intent, conf: p.conf, low: true, id: um.id };
      }
      botAnswer(th, me, p.intent, oid);
      return { ok: true, intent: p.intent, conf: p.conf };
    }
    if (action === 'bot_handoff') {
      if (admin) fail('ใช้ได้เฉพาะผู้ใช้');
      var th2 = getThread(me.id);
      if (th2.mode === 'handoff') return { ok: true };
      handoff(th2, 'admin_button');
      return { ok: true };
    }
    if (action === 'bot_history') { // รายการวันที่เคยคุย (ใหม่สุดก่อน)
      if (admin) fail('ใช้ได้เฉพาะผู้ใช้');
      var ht = getThread(me.id), days = {};
      botMsgs(ht.id).forEach(function (m) {
        var k = dayKey(m.created_at), d = days[k] = days[k] || { day: k, count: 0, first: '', admin: false };
        if (m.role !== 'system') d.count++;
        if (m.role === 'user' && !d.first) d.first = m.text;
        if (m.role === 'admin') d.admin = true;
      });
      return { today: today(), keep_days: BOT.KEEP_DAYS, purge: BOT.PURGE, days: Object.keys(days).sort().reverse().map(function (k) { days[k].stars = ratedOn(me.id, k); return days[k]; }) };
    }
    if (action === 'bot_feedback') { // ตอบตรงไหม: up / down (+ เหตุผล ไม่บังคับ) · กดเปลี่ยนได้
      if (admin) fail('ใช้ได้เฉพาะผู้ใช้');
      var ft = getThread(me.id), fm = botMsgs(ft.id).filter(function (m) { return m.id === a.id && m.role === 'bot' && m.rate; })[0];
      if (!fm) fail('ให้คะแนนข้อความนี้ไม่ได้');
      if (dayKey(fm.created_at) !== today()) fail('ให้คะแนนได้เฉพาะคำตอบของวันนี้');
      var val = a.value === 'up' || a.value === 'down' ? a.value : '';
      var rsn = val === 'down' && BOT.FB_REASONS[a.reason] ? a.reason : '';
      store.update('BotMessages', fm.id, { fb: val, fb_reason: rsn, fb_at: val ? nowIso() : '', fb_done: '' });
      log(me, 'bot_feedback', fm.id, val === 'up' ? 'ตรงใจ' : val === 'down' ? 'ยังไม่ตรง' + (rsn ? ': ' + BOT.FB_REASONS[rsn] : '') : 'ยกเลิกคะแนน');
      if (rsn === 'admin' && ft.mode !== 'handoff') handoff(ft, 'admin_button');
      return { ok: true };
    }
    if (action === 'bot_rate') { // ให้ขนนกน้องถึง 1–5 วันละครั้ง
      if (admin) fail('ใช้ได้เฉพาะผู้ใช้');
      var stars = Math.round(Number(a.stars));
      if (!(stars >= 1 && stars <= 5)) fail('เลือกจำนวนขนนก 1–5');
      if (ratedToday(me.id)) fail('วันนี้ให้ขนนกน้องถึงไปแล้ว');
      store.insert('BotRatings', { id: rid('BR', 8), user_id: me.id, stars: String(stars), comment: str(a.comment, 200), created_at: nowIso() });
      log(me, 'bot_rate', threadId(me.id), 'ให้ขนนกน้องถึง ' + stars);
      return { ok: true, stars: stars };
    }
    if (action === 'bot_rate_later') {
      if (admin) fail('ใช้ได้เฉพาะผู้ใช้');
      store.update('BotThreads', getThread(me.id).id, { rate_skip: today() });
      return { ok: true };
    }
    if (action === 'bot_unread') return { unread: admin ? botWaiting() : botUnread(me.id) };
    needAdmin(me);
    if (action === 'bot_queue') {
      var all = store.list('BotThreads').filter(function (t) { return botMsgs(t.id).length; }).map(function (t) { return threadView(t, true); });
      all.sort(function (x, y) { return String((y.last || {}).at).localeCompare(String((x.last || {}).at)); });
      return {
        waiting: all.filter(function (t) { return t.waiting; }).sort(function (x, y) { return String(x.handoff_at).localeCompare(String(y.handoff_at)); }),
        talking: all.filter(function (t) { return t.mode === 'handoff' && !t.waiting; }),
        bot: all.filter(function (t) { return t.mode === 'bot' && !t.closed_at; }),
        closed: all.filter(function (t) { return t.mode === 'bot' && t.closed_at; }),
      };
    }
    var tt = store.list('BotThreads').filter(function (x) { return x.user_id === a.user_id; })[0];
    if (action === 'bot_teach') {
      var tm = store.list('BotMessages').filter(function (m) { return m.id === a.id && m.role === 'user'; })[0];
      if (!tm) fail('ไม่พบข้อความนี้');
      if (!BOT.INTENTS[a.intent]) fail('กรุณาเลือกประเภทคำถาม');
      store.insert('BotExamples', { id: rid('BE', 8), text: tm.text.replace(/TM\d{4}-\d{2}/ig, '').trim(), intent: a.intent, by: me.id, at: nowIso() });
      store.update('BotMessages', tm.id, { taught: a.intent });
      if (a.fb) store.update('BotMessages', a.fb, { fb_done: nowIso() });
      log(me, 'bot_teach', tm.id, 'สอนผู้ช่วย: ' + BOT.INTENTS[a.intent].label);
      return { ok: true, stats: botStats() };
    }
    if (action === 'bot_fb_done') { // รับทราบคำติแล้ว (เช่น ปรับข้อความคำตอบ)
      var dm = store.list('BotMessages').filter(function (m) { return m.id === a.id && m.fb === 'down'; })[0];
      if (!dm) fail('ไม่พบคำติ');
      store.update('BotMessages', dm.id, { fb_done: nowIso() });
      return { ok: true, stats: botStats() };
    }
    if (action === 'bot_stats') return botStats();
    if (!tt) fail('ไม่พบแชทนี้');
    if (action === 'bot_admin_thread') {
      var am = botMsgs(tt.id);
      am.forEach(function (m) { if (m.role === 'user' && !m.admin_read) store.update('BotMessages', m.id, { admin_read: nowIso() }); });
      var orders = jobs().filter(function (j) { return myOrder(j, tt.user_id); }).sort(byCreatedDesc).slice(0, 3).map(function (j) { return { id: j.id, status: CONFIG.STATUS[j.status], active: isActive(j) }; });
      return { thread: threadView(tt, true), messages: am.map(function (m) { return userMsgView(m, true); }), orders: orders, threshold: BOT.THRESHOLD };
    }
    if (action === 'bot_reply') {
      var rt = str(a.text, 300);
      if (!rt) fail('พิมพ์ข้อความก่อนส่ง');
      if (tt.mode !== 'handoff') tt = store.update('BotThreads', tt.id, { mode: 'handoff', reason: 'admin_takeover', handoff_at: nowIso(), closed_at: '', summary: makeSummary(tt, 'admin_takeover') });
      addMsg(tt, 'admin', rt);
      log(me, 'bot_reply', tt.id, 'แอดมินตอบในแชทผู้ช่วย');
      return { ok: true };
    }
    if (action === 'bot_close') {
      if (tt.mode !== 'handoff') fail('เรื่องนี้ปิดแล้ว');
      tt = store.update('BotThreads', tt.id, { mode: 'bot', closed_at: nowIso() });
      addMsg(tt, 'system', 'แอดมินปิดเรื่องแล้ว ' + BOT.NAME + ' กลับมาตอบคำถามต่อ ถ้ามีปัญหาอีกกด "ติดต่อแอดมิน" ได้ตลอด');
      log(me, 'bot_close', tt.id, 'ปิดเรื่อง ให้ผู้ช่วยกลับมาตอบ');
      return { ok: true };
    }
    fail('คำสั่งไม่ถูกต้อง');
  }

  // เก็บเงินปลายทาง: ผู้รับไม่ตอบรับภายใน COD_WAIT_HOURS ชม. → ยกเลิกอัตโนมัติ แจ้งผู้สั่งและผู้รับ
  function expireCod() {
    var lim = CONFIG.COD_WAIT_HOURS * 3600000, now = Date.now();
    jobs().forEach(function (j) {
      if (j.status !== 'pending' || j.cod_status !== 'waiting' || now - new Date(j.created_at).getTime() < lim) return;
      var at = nowIso();
      store.update('Jobs', j.id, { status: 'cancelled', cancelled_at: at, cancel_reason: 'cod_expired', cod_status: 'expired' });
      log(null, 'cod_expire', j.id, 'ผู้รับไม่ตอบรับเก็บเงินปลายทางภายใน ' + CONFIG.COD_WAIT_HOURS + ' ชม.');
      addReward(j.sender_id, 'expire', 0, j.id, 'ผู้รับไม่ตอบรับเก็บเงินปลายทางภายใน ' + CONFIG.COD_WAIT_HOURS + ' ชม. ระบบจึงยกเลิกคำสั่งให้ ไม่ต้องนำของมาฝาก สั่งใหม่แบบ "จ่ายตอนฝากของ" ได้');
    });
  }
  function handle(token, action, a) {
    a = a || {};
    loadPricing();
    if (action === 'register') return register(a);
    if (action === 'login') return login(a);
    if (action === 'check_name') return { available: !nameTaken(a.name) };
    if (action === 'check_phone') return { available: !phoneTaken(str(a.phone, 20).replace(/\D/g, '')) };
    if (action === 'check_username') {
      var name = str(a.username, 40).toLowerCase();
      if (reservedUsername(name)) return { available: false, reason: 'reserved' };
      return { available: !allUsers().some(function (u) { return u.username === name; }) };
    }
    if (action === 'lock_status') {
      var lu = allUsers().filter(function (x) { return x.username === str(a.username, 40).toLowerCase() && x.status !== 'deleted'; })[0];
      var ms = lu && lu.locked_until ? new Date(lu.locked_until).getTime() - Date.now() : 0;
      return { seconds: ms > 0 ? Math.ceil(ms / 1000) : 0 };
    }
    if (action === 'contact') return { text: CONFIG.ADMIN_CONTACT };
    if (action === 'demo') return CONFIG.PRODUCTION ? { accounts: [], password: '' } : { accounts: CONFIG.SEED_USERS.map(function (u) { return { username: u.username, role: u.role, points: u.points || 0 }; }), password: CONFIG.DEMO_PASSWORD };

    var me = sessionUser(token);
    if (!me) fail('กรุณาเข้าสู่ระบบ');
    expireCod();
    if (me.must_change === 'yes' && ['session', 'logout', 'change_password'].indexOf(action) < 0) fail('กรุณาตั้งรหัสผ่านใหม่ก่อนใช้งาน');
    var users = allUsers();
    var v = function (j) { return viewJob(j, me, users); };

    switch (action) {
      case 'session':
        return { me: publicUser(me), storeKind: store.kind };
      case 'logout':
        return logout(token, me);
      case 'change_password':
        return changePassword(me, token, a);
      case 'admin_find_user': {
        needAdmin(me);
        var fu = findUserAny(a.username);
        var fj = jobs();
        return { user: publicUser(fu), locked: lockedMinutesLeft(fu), status_note: fu.status_note || '',
          sent: fj.filter(function (j) { return j.sender_id === fu.id; }).length, received: fj.filter(function (j) { return j.recipient_id === fu.id; }).length,
          refusals: refusals(fu.id).recent, active: fj.filter(function (j) { return isActive(j) && (j.sender_id === fu.id || j.recipient_id === fu.id); }).length,
          active_list: fj.filter(function (j) { return isActive(j) && (j.sender_id === fu.id || j.recipient_id === fu.id); }).map(function (j) {
            return { id: j.id, as: j.recipient_id === fu.id ? 'recipient' : 'sender', status: j.status, cod_waiting: j.status === 'pending' && j.cod_status === 'waiting' }; }) };
      }
      case 'admin_set_user_status': {
        needAdmin(me);
        var un = str(a.username, 40).toLowerCase().replace(/^@/, '');
        var tu = allUsers().filter(function (u) { return u.username === un && u.status !== 'deleted'; })[0], on = a.status === 'disabled';
        if (!tu) fail('ไม่พบผู้ใช้นี้ในระบบ');
        if (tu.role === 'admin') fail('ระงับบัญชีแอดมินไม่ได้');
        if (on && !str(a.note, 200)) fail('กรุณาระบุเหตุผลที่ระงับบัญชี');
        var openJobs = jobs().filter(function (j) { return isActive(j) && (j.sender_id === tu.id || j.recipient_id === tu.id); });
        if (on && openJobs.length && !a.confirm_active) fail('ผู้ใช้นี้มีคำสั่งที่ยังไม่จบ ' + openJobs.length + ' รายการ กรุณายืนยันอีกครั้ง');
        if (on === (tu.status === 'disabled')) fail(on ? 'บัญชีนี้ถูกระงับอยู่แล้ว' : 'บัญชีนี้ใช้งานได้อยู่แล้ว');
        store.update('Users', tu.id, { status: on ? 'disabled' : 'active', status_note: on ? str(a.note, 200) : '' });
        if (on) store.list('Sessions').forEach(function (x) { if (x.user_id === tu.id && x.revoked !== 'yes') store.update('Sessions', x.token, { revoked: 'yes' }, null, 'token'); });
        log(me, on ? 'admin_disable_user' : 'admin_enable_user', tu.id, (on ? 'ระงับบัญชี @' : 'ยกเลิกระงับ @') + tu.username + (on ? ': ' + str(a.note, 100) : ''));
        return { username: tu.username, status: on ? 'disabled' : 'active' };
      }
      case 'admin_badges': { // ตัวเลขบนเมนูล่างของแอดมิน
        needAdmin(me);
        var bj = jobs(), ids = {};
        bj.forEach(function (j) { ids[j.id] = 1; });
        var adminIds = users.filter(function (u) { return u.role === 'admin'; }).map(function (u) { return u.id; });
        return { pending: bj.filter(function (j) { return j.status === 'pending'; }).length,
          order_unread: store.list('Messages').filter(function (m) { return ids[m.job_id] && adminIds.indexOf(m.sender_id) < 0 && !m.read_at; }).length,
          bot: botWaiting(), todo: bj.filter(function (j) { return todoOf(j).any; }).length };
      }
      case 'pricing':
        return { pricing: pricingNow() };
      case 'set_pricing':
        needAdmin(me);
        return setPricing(me, a);
      case 'admin_reset_password':
        needAdmin(me);
        return adminResetPassword(me, a);
      case 'delete_account':
        return deleteAccount(me, a);
      case 'update_profile':
        return updateProfile(me, a);
      case 'recipients':
        return {
          users: users.filter(function (u) { return u.role === 'user' && u.status === 'active' && u.id !== me.id; })
            .map(function (u) { return { id: u.id, name: u.name, username: u.username }; }), // ไม่ส่งสถานะการถูกระงับของคนอื่น (แจ้งตอนกดสั่งแทน)
          service: serviceStatus(),
        };
      case 'quote': { // ราคา + ส่วนลดจาก Point ก่อนยืนยันคำสั่ง
        var pr = priceFor(a.mode, a.dropoff_zone, a.item_type), bal = pointBalance(me.id).balance, md = maxDiscount(pr.subtotal, bal);
        pr.balance = bal; pr.max_discount = md; pr.points_for_max = md * CONFIG.POINT_USE.PER_BAHT;
        return pr;
      }
      case 'admin_overview': {
        needAdmin(me);
        var aj = jobs(), today = dayKey(nowIso());
        var td = aj.filter(function (j) { return dayKey(j.created_at) === today; });
        var sum = function (arr, f) { return arr.reduce(function (t, j) { return t + Number(j[f] || 0); }, 0); };
        var done = aj.filter(function (j) { return j.status === 'delivered'; });
        var doneToday = done.filter(function (j) { return dayKey(j.delivered_at) === today; });
        var paid = aj.filter(function (j) { return j.paid_at && !(j.status === 'cancelled' && !j.picked_at); });
        return {
          me: publicUser(me),
          count: { pending: 0, confirmed: 0, picked: 0, delivering: 0, delivered: 0, cancelled: 0 },
          counts: ['pending', 'confirmed', 'picked', 'delivering', 'delivered', 'cancelled'].reduce(function (o, s) { o[s] = aj.filter(function (j) { return j.status === s; }).length; return o; }, {}),
          today_orders: td.length, today_done: doneToday.length,
          revenue_today: sum(doneToday, 'total'), revenue_all: sum(done, 'total'),
          discount_all: sum(done, 'discount'),
          points_issued: sum(done, 'points_earned'), points_used: sum(aj.filter(function (j) { return j.status !== 'cancelled'; }), 'points_used'),
          users: users.filter(function (u) { return u.role === 'user' && u.status === 'active'; }).length,
          overdue: aj.filter(function (j) { return isActive(j) && overdueMin(j) > 0; }).length,
          by_mode: { normal: aj.filter(function (j) { return j.mode === 'normal'; }).length, urgent: aj.filter(function (j) { return j.mode === 'urgent'; }).length },
          paid_unclosed: paid.filter(function (j) { return j.status !== 'delivered'; }).length,
          ontime_pct: done.length ? Math.round(done.filter(function (j) { return Number(j.late_min || 0) <= CONFIG.LATE.GRACE_MIN || j.late_excused; }).length / done.length * 100) : null,
          late_count: done.filter(function (j) { return Number(j.late_min || 0) > CONFIG.LATE.GRACE_MIN && !j.late_excused; }).length,
          cod_revenue: sum(done.filter(function (j) { return j.pay_method === 'cod'; }), 'total'), sender_revenue: sum(done.filter(function (j) { return j.pay_method !== 'cod'; }), 'total'),
          failed: aj.filter(function (j) { return j.cancel_reason === 'failed'; }).length,
          fail_by: ['recipient', 'sender', 'shop'].reduce(function (o, f) { o[f] = aj.filter(function (j) { return j.cancel_reason === 'failed' && j.fail_fault === f; }).length; return o; }, {}),
          appeals: aj.filter(function (j) { return j.appeal_at && !j.appeal_result; }).map(function (j) { return { id: j.id, user: nameOf(j.penalty_user, users), at: j.appeal_at }; }),
          pending_slow: aj.filter(function (j) { return j.status === 'pending' && j.mode === 'urgent' && (Date.now() - new Date(j.cod_at || j.created_at).getTime()) / 60000 > CONFIG.LATE.PENDING_WARN_MIN; }).length,
          todo: aj.filter(function (j) { var t = todoOf(j); return t.refund || t.ret; }).map(function (j) { var t = todoOf(j);
            return { id: j.id, sender: nameOf(j.sender_id, users), refund: t.refund ? Number(j.refund_amount) : 0, ret: t.ret, overdue: !!t.overdue, days_left: t.days_left, keep_until: t.keep_until || '' }; }),
          mix: (function () { // แผนภูมิ: คำสั่งที่สั่งวันนี้แยกตามผล
            var f = function (fn) { return td.filter(fn).length; };
            return { done: f(function (j) { return j.status === 'delivered'; }), failed: f(function (j) { return j.cancel_reason === 'failed'; }),
              cancelled: f(function (j) { return j.status === 'cancelled' && j.cancel_reason !== 'failed'; }),
              pending: f(function (j) { return j.status === 'pending'; }), confirmed: f(function (j) { return j.status === 'confirmed'; }),
              moving: f(function (j) { return j.status === 'picked' || j.status === 'delivering'; }) }; })(),
          cash: (function () { // เงินสดวันนี้: เก็บตอนฝาก (paid_at) + เก็บปลายทาง (ส่งสำเร็จ) − คืนแล้ว
            var dep = aj.filter(function (j) { return j.pay_method !== 'cod' && j.paid_at && dayKey(j.paid_at) === today; });
            var cod = aj.filter(function (j) { return j.pay_method === 'cod' && j.status === 'delivered' && dayKey(j.delivered_at) === today; });
            var refunded = aj.filter(function (j) { return j.refunded_at && dayKey(j.refunded_at) === today; });
            var c = { deposit: sum(dep, 'total'), cod: sum(cod, 'total'), refunded: sum(refunded, 'refund_amount'),
              refund_due: aj.filter(function (j) { return todoOf(j).refund; }).reduce(function (t, j) { return t + Number(j.refund_amount); }, 0) };
            c.collected = c.deposit + c.cod; c.in_hand = c.collected - c.refunded; return c; })(),
        };
      }
      case 'profile': {
        var js = jobs();
        var svcInfo = me.role === 'admin' ? serviceStatus() : null;
        var myJobs = {};
        js.forEach(function (j) {
          var as = j.sender_id === me.id ? 'sender' : j.recipient_id === me.id ? 'recipient' : '';
          if (as) myJobs[j.id] = as;
        });
        var OTHER = {
          job_create: { recipient: 'มีคำสั่งส่งของถึงคุณ' },
          job_confirm: { sender: 'แอดมินยืนยันคำสั่งแล้ว', recipient: 'แอดมินยืนยันคำสั่งที่ส่งถึงคุณ' },
          job_reject: { sender: 'แอดมินปฏิเสธคำสั่ง' },
          job_pickup: { sender: 'ไรเดอร์รับของที่จุดรับฝากแล้ว', recipient: 'ไรเดอร์รับของแล้ว' },
          job_start: { sender: 'ไรเดอร์ออกนำส่งแล้ว', recipient: 'ของกำลังมาส่ง' },
          job_deliver: { sender: 'ส่งถึงผู้รับแล้ว', recipient: 'ได้รับของแล้ว' },
          job_cancel: { sender: 'คำสั่งถูกยกเลิก', recipient: 'คำสั่งที่ส่งถึงคุณถูกยกเลิก' },
          cod_expire: { sender: 'ยกเลิกอัตโนมัติ: ผู้รับไม่ตอบรับภายใน 24 ชม.', recipient: 'คำขอเก็บเงินปลายทางหมดเวลา' },
          cod_accept: { sender: 'ผู้รับยอมรับชำระปลายทาง' }, cod_decline: { sender: 'ผู้รับปฏิเสธชำระปลายทาง' }, cod_withdraw: { sender: 'ผู้รับถอนการยอมรับชำระ' },
          job_fail: { sender: 'ส่งไม่สำเร็จ', recipient: 'ส่งไม่สำเร็จ' }, job_refuse: { sender: 'ผู้รับไม่รับของ' }, job_arrive: { recipient: 'ไรเดอร์ถึงจุดส่งแล้ว' },
        };
        var mine = store.list('Logs').map(function (l, i) { l._i = i; return l; }).filter(function (l) {
          if (l.user_id === me.id) return true;
          var as = myJobs[l.target];
          return as && OTHER[l.action] && OTHER[l.action][as];
        }).sort(function (x, y) { return String(y.at).localeCompare(String(x.at)) || y._i - x._i; }).slice(0, a.all ? 2000 : 60);
        var pb = pointBalance(me.id, js);
        return { service: svcInfo,
          me: publicUser(me),
          stats: me.role === 'admin'
            ? { orders: js.length, active: js.filter(isActive).length, delivered: js.filter(function (j) { return j.status === 'delivered'; }).length }
            : { sent: js.filter(function (j) { return j.sender_id === me.id; }).length, received: js.filter(function (j) { return j.recipient_id === me.id && j.status === 'delivered'; }).length,
                points: pb.balance, points_earned: pb.earned, points_used: pb.used,
                busy: js.some(function (j) { return isActive(j) && (j.sender_id === me.id || j.recipient_id === me.id); }),
                owed: js.some(function (j) { var t = todoOf(j); return j.sender_id === me.id && (t.refund || t.ret); }) },
          logs: mine.map(function (l) {
            var other = l.user_id !== me.id && l.user_id !== '' ;
            var lab = other && OTHER[l.action] && myJobs[l.target] ? OTHER[l.action][myJobs[l.target]] : '';
            return { at: l.at, action: l.action, target: l.target, detail: l.detail, label: lab, other: !!lab };
          }),
        };
      }
      case 'jobs': {
        var all = jobs().sort(byCreatedDesc);
        if (me.role === 'admin') return { me: publicUser(me), orders: all.map(v) };
        return {
          me: publicUser(me), points: pointBalance(me.id, all), service: serviceStatus(),
          sent: all.filter(function (j) { return j.sender_id === me.id; }).map(v),
          incoming: all.filter(function (j) { return j.recipient_id === me.id; }).map(v),
        };
      }
      case 'job': {
        var j = getJob(a.id);
        canSeeJob(j, me);
        return { me: publicUser(me), job: v(j) };
      }
      case 'photos': {
        var pj = getJob(a.id);
        if (me.role !== 'admin' && [pj.sender_id, pj.recipient_id].indexOf(me.id) < 0) return { photos: [], pickup: [], delivery: [], hidden: true };
        var ph = store.list('Photos').filter(function (p) { return p.job_id === pj.id; }).sort(function (x, y) { return Number(x.idx) - Number(y.idx); });
        var byStage = function (st) { return ph.filter(function (p) { return (p.stage || 'item') === st; }).map(function (p) { return store.getPhoto ? store.getPhoto(p.data) : p.data; }); };
        return { photos: byStage('item'), pickup: byStage('pickup'), delivery: byStage('delivery'), fail: byStage('fail') };
      }
      case 'create':
        return { job: v(createJob(me, a)) };
      case 'act':
        return { job: viewJob(act(me, a.id, a.action, a.code, a.photos, a.note), me, allUsers()) };
      case 'hide': {
        var hj = getJob(a.id), hf = hiddenFields(hj, me);
        if (!hf.length) fail('ไม่พบคำสั่งนี้');
        if (!closed(hj)) fail('ซ่อนได้เฉพาะคำสั่งที่จบแล้ว');
        var patch = {};
        hf.forEach(function (f) { patch[f] = a.on ? nowIso() : ''; });
        return { job: v(store.update('Jobs', hj.id, patch)) };
      }
      case 'points': {
        var pjs = jobs().sort(byCreatedDesc);
        var pbal = pointBalance(me.id, pjs);
        var items = [];
        pjs.forEach(function (j) {
          var mine = payerOf(j) === me.id, base = { id: j.id, mode: j.mode, dropoff_zone: j.dropoff_zone, cod: j.pay_method === 'cod' };
          var add = function (o) { var x = {}; for (var k in base) x[k] = base[k]; for (var k2 in o) x[k2] = o[k2]; items.push(x); };
          if (mine && j.status === 'delivered' && Number(j.points_earned)) add({ kind: 'earn', amount: Number(j.points_earned), at: j.delivered_at });
          if (mine && j.status === 'delivered' && Number(j.comp_points)) add({ kind: 'comp', amount: Number(j.comp_points), at: j.delivered_at, late: j.late_min });
          if (mine && Number(j.points_used)) {
            add({ kind: 'use', amount: Number(j.points_used), discount: Number(j.discount), at: j.cod_at || j.created_at });
            if (j.status === 'cancelled') add({ kind: 'refund', amount: Number(j.points_used), at: j.cancelled_at });
          }
          if (j.penalty_user === me.id && Number(j.penalty_points)) {
            add({ kind: 'penalty', amount: Number(j.penalty_points), at: j.cancelled_at, reason: (CONFIG.FAIL_REASONS[j.fail_reason] || {}).label });
            if (j.appeal_result === 'revoked') add({ kind: 'revoked', amount: Number(j.penalty_points), at: j.appeal_done_at });
          }
        });
        if (pbal.start) items.push({ id: '', kind: 'start', amount: pbal.start, at: me.created_at });
        items.sort(function (x, y) { return String(y.at).localeCompare(String(x.at)); });
        return { me: publicUser(me), balance: pbal.balance, earned: pbal.earned, used: pbal.used, penalty: pbal.penalty, items: items, refusals: refusals(me.id) };
      }
      case 'rewards_unseen':
        return { items: store.list('Rewards').filter(function (x) { return x.user_id === me.id && !x.seen_at; })
          .sort(function (x, y) { return String(x.created_at).localeCompare(String(y.created_at)); }) };
      case 'rewards_seen': {
        var ids = [].concat(a.ids || []);
        store.list('Rewards').forEach(function (x) { if (x.user_id === me.id && ids.indexOf(x.id) >= 0 && !x.seen_at) store.update('Rewards', x.id, { seen_at: nowIso() }); });
        return { ok: true };
      }
      case 'chat_inbox': {
        var msgsAll = store.list('Messages');
        var rooms = [], unreadTotal = 0;
        jobs().forEach(function (j) {
          if (!canChat(j, me)) return;
          var chans = me.role === 'admin' ? ['sender', 'recipient'] : [me.id === j.sender_id ? 'sender' : 'recipient'];
          chans.forEach(function (ch) {
            var ms = msgsAll.filter(function (m) { return m.job_id === j.id && (m.channel || 'sender') === ch; })
              .sort(function (x, y) { return String(x.created_at).localeCompare(String(y.created_at)); });
            if (me.role === 'admin' && !ms.length) return; // แอดมินเห็นเฉพาะห้องที่ลูกค้าทักมา
            var last = ms[ms.length - 1];
            var mineSide = function (m) { return me.role === 'admin' ? userById(m.sender_id) && userById(m.sender_id).role === 'admin' : m.sender_id === me.id; };
            var unread = ms.filter(function (m) { return !mineSide(m) && !m.read_at; }).length;
            var closedJob = closed(j);
            if (!closedJob || unread) unreadTotal += unread;
            var withId = ch === 'sender' ? j.sender_id : j.recipient_id;
            rooms.push({
              job_id: j.id, channel: ch, mode: j.mode, status: j.status, closed: closedJob, dropoff: j.dropoff_zone, total: j.total,
              with_name: me.role === 'admin' ? nameOf(withId, users) : 'แอดมิน ' + CONFIG.APP_NAME,
              with_role: me.role === 'admin' ? (ch === 'sender' ? 'ผู้สั่ง' : 'ผู้รับ') : 'แอดมิน',
              as: me.role === 'admin' ? 'admin' : ch,
              last_text: last ? last.text : '', last_at: last ? last.created_at : j.created_at, last_mine: !!(last && mineSide(last)),
              unread: unread,
            });
          });
        });
        rooms.sort(function (x, y) { return String(y.last_at).localeCompare(String(x.last_at)); });
        return { rooms: rooms, unread: unreadTotal };
      }
      case 'messages': {
        var jm = getJob(a.id);
        if (!canChat(jm, me)) return { enabled: false, messages: [] };
        var ch = chatChannel(jm, me, a.channel);
        var all2 = store.list('Messages').filter(function (m) { return m.job_id === a.id; });
        var chOf = function (m) { return m.channel || 'sender'; };
        var ms2 = all2.filter(function (m) { return chOf(m) === ch; });
        var isShop = function (m) { var u = userById(m.sender_id); return !!(u && u.role === 'admin'); };
        if (a.seen) {
          var readAt = nowIso();
          ms2.forEach(function (m) {
            var fromOther = me.role === 'admin' ? !isShop(m) : m.sender_id !== me.id;
            if (fromOther && !m.read_at) { store.update('Messages', m.id, { read_at: readAt }); m.read_at = readAt; }
          });
        }
        ms2.sort(function (x, y) { return String(x.created_at).localeCompare(String(y.created_at)); });
        var out = { enabled: true, channel: ch, messages: ms2.map(function (m) { m.sender_name = isShop(m) ? 'แอดมิน ' + CONFIG.APP_NAME : nameOf(m.sender_id, users); m.shop = isShop(m); return m; }) };
        if (me.role === 'admin') { out.counts = { sender: 0, recipient: 0 }; all2.forEach(function (m) { out.counts[chOf(m)]++; }); }
        return out;
      }
      case 'send': {
        var jc = getJob(a.id);
        if (!canChat(jc, me)) fail('ไม่มีสิทธิ์แชทในคำสั่งนี้');
        if (closed(jc)) fail('คำสั่งนี้ปิดแล้ว');
        var text = str(a.text, 300);
        if (!text) fail('พิมพ์ข้อความก่อนส่ง');
        var msg = { id: rid('M', 8), job_id: a.id, sender_id: me.id, text: text, preset: a.preset ? 'yes' : 'no', created_at: nowIso(), channel: chatChannel(jc, me, a.channel) };
        store.insert('Messages', msg);
        log(me, 'chat_send', a.id, a.preset ? 'ข้อความด่วน' : 'พิมพ์ข้อความเอง');
        return { message: msg };
      }
    }
    if (action === 'service') return serviceStatus();
    if (action === 'set_service_override') {
      needAdmin(me);
      var on = a.on ? 'on' : '';
      if (store.list('Settings').some(function (x) { return x.id === 'service_override'; })) store.update('Settings', 'service_override', { value: on, updated_at: nowIso(), by: me.id });
      else store.insert('Settings', { id: 'service_override', value: on, updated_at: nowIso(), by: me.id });
      log(me, 'service_override', '', on ? 'เปิดรับคำสั่งนอกเวลา (ทดสอบ/นำเสนอ)' : 'ปิดรับคำสั่งนอกเวลา');
      return serviceStatus();
    }
    if (/^bot_/.test(action)) return botHandle(me, action, a);
    fail('คำสั่งไม่ถูกต้อง');
  }

  return { handle: handle };
}

// สร้างบัญชีทดลองพร้อมรหัสผ่าน (ใช้ตอนตั้งค่าที่เก็บข้อมูลครั้งแรก)
function seedUserRows() {
  return CONFIG.SEED_USERS.map(function (u, i) {
    var salt = 'seed' + u.id + 'x' + i;
    return {
      id: u.id, username: u.username, name: u.name, phone: u.phone, role: u.role,
      pass_hash: hashPassword(CONFIG.DEMO_PASSWORD, salt), salt: salt, status: 'active', created_at: '2026-11-21T00:00:00.000Z',
      bonus_points: u.points ? String(u.points) : '',
    };
  });
}
