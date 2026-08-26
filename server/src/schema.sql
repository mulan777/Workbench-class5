-- 中5班工作台 SQLite schema
CREATE TABLE IF NOT EXISTS teachers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'teacher',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sid TEXT NOT NULL UNIQUE,          -- 学号（两位字符串）
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,                -- YYYY-MM-DD
  photo_path TEXT,                   -- /uploads/xxx.webp
  note TEXT,
  created_by INTEGER NOT NULL REFERENCES teachers(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS checkin_pairs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  checkin_id INTEGER NOT NULL REFERENCES checkins(id) ON DELETE CASCADE,
  student_a INTEGER NOT NULL REFERENCES students(id),
  student_b INTEGER NOT NULL REFERENCES students(id)
);
CREATE INDEX IF NOT EXISTS idx_pairs_checkin ON checkin_pairs(checkin_id);
CREATE INDEX IF NOT EXISTS idx_pairs_students ON checkin_pairs(student_a, student_b);

CREATE TABLE IF NOT EXISTS area_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week INTEGER NOT NULL,             -- 第几周(1-20)
  area TEXT NOT NULL,                -- 区域名
  student_id INTEGER REFERENCES students(id),
  partner_name TEXT,
  type TEXT NOT NULL,                -- 讲述/绘画/符号/关键词/前书写/录音
  q1 TEXT, q2 TEXT, q3 TEXT, q4 TEXT,
  content TEXT,
  created_by INTEGER NOT NULL REFERENCES teachers(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_area_week ON area_records(week, area);

CREATE TABLE IF NOT EXISTS council_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week INTEGER NOT NULL,
  source TEXT, evidence TEXT, proposal TEXT, reason TEXT,
  dissent TEXT, result TEXT, feedback TEXT,
  created_by INTEGER NOT NULL REFERENCES teachers(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 素材墙统一表：theme1/2/3 共用，kind 区分板块
CREATE TABLE IF NOT EXISTS theme_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week INTEGER NOT NULL,
  wall TEXT NOT NULL,                -- theme1 | theme2 | theme3
  section TEXT NOT NULL,             -- oldTimes/missingExpression/reunionMoments/gameDaily/friendReasons/modifications/firstMeeting/portraits/tips
  type TEXT NOT NULL,                -- 照片/画作/文字/想念信/合作作品/活动照片/合影/采访卡/肖像
  student_id INTEGER REFERENCES students(id),
  friend_name TEXT,
  content TEXT,
  note TEXT,
  extra_json TEXT,                   -- 采访卡等扩展字段
  photo_path TEXT,
  created_by INTEGER NOT NULL REFERENCES teachers(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_theme_week ON theme_items(week, wall, section);

CREATE TABLE IF NOT EXISTS troubles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week INTEGER NOT NULL,
  tag TEXT NOT NULL,
  type TEXT NOT NULL,                -- 绘画/教师代写/家长记录
  student_id INTEGER REFERENCES students(id),
  content TEXT,
  created_by INTEGER NOT NULL REFERENCES teachers(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS trouble_reactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trouble_id INTEGER NOT NULL REFERENCES troubles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,                -- empathy | vote
  student_id INTEGER NOT NULL REFERENCES students(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(trouble_id, kind, student_id)
);

CREATE TABLE IF NOT EXISTS trackings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trouble_id INTEGER NOT NULL REFERENCES troubles(id) ON DELETE CASCADE,
  content TEXT,
  created_by INTEGER NOT NULL REFERENCES teachers(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 区域倾听：可管理的区域名单（首次启动时从默认列表迁移）
CREATE TABLE IF NOT EXISTS area_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  emoji TEXT NOT NULL DEFAULT '🧸',
  sort INTEGER NOT NULL DEFAULT 0
);
