-- 문학 타자연습 관계형 스키마
-- students 1 --- * typing_sessions
-- students 1 --- * book_reports
-- 작품 본문은 src/data/books.ts 정적 데이터 (DB 미사용)
-- 글꼴/타자음 설정은 기기 localStorage

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  school_year TEXT NOT NULL,
  school_name TEXT NOT NULL,
  grade INTEGER NOT NULL,
  class_num INTEGER NOT NULL,
  student_num INTEGER NOT NULL,
  name TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  last_login_at BIGINT NOT NULL,
  UNIQUE (school_year, school_name, grade, class_num, student_num)
);

CREATE TABLE IF NOT EXISTS typing_sessions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  excerpt_id TEXT NOT NULL,
  book_title TEXT NOT NULL,
  author TEXT NOT NULL,
  excerpt_title TEXT NOT NULL,
  cpm REAL NOT NULL,
  wpm REAL NOT NULL,
  peak_cpm REAL NOT NULL,
  accuracy REAL NOT NULL,
  error_count INTEGER NOT NULL,
  total_chars INTEGER NOT NULL,
  total_strokes INTEGER NOT NULL,
  duration_seconds INTEGER NOT NULL,
  mistyped_letters TEXT NOT NULL DEFAULT '{}',
  effort_points INTEGER NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_student ON typing_sessions (student_id, created_at DESC);

CREATE TABLE IF NOT EXISTS book_reports (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  excerpt_id TEXT NOT NULL,
  book_title TEXT NOT NULL,
  author TEXT NOT NULL,
  excerpt_title TEXT NOT NULL,
  cpm REAL NOT NULL,
  accuracy REAL NOT NULL,
  duration_seconds INTEGER NOT NULL,
  title TEXT NOT NULL,
  rating INTEGER NOT NULL,
  memorable_quote TEXT NOT NULL DEFAULT '',
  quote_reason TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  personal_takeaway TEXT NOT NULL DEFAULT '',
  paragraph_notes TEXT NOT NULL DEFAULT '[]',
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reports_student ON book_reports (student_id, created_at DESC);

CREATE TABLE IF NOT EXISTS teachers (
  id TEXT PRIMARY KEY,
  school_name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  grade INTEGER NOT NULL DEFAULT 0,
  class_num INTEGER NOT NULL DEFAULT 0,
  is_school_admin INTEGER NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL,
  last_login_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  last_login_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  created_at BIGINT NOT NULL,
  expires_at BIGINT NOT NULL
);
