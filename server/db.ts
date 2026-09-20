import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import type { BookReport, StudentAccount, StudentRankRecord, TypingSessionResult } from '../src/types';
import { calculateCumulativeEffortScore, getTitleBadge } from '../src/utils/storage';

const SCHEMA = readFileSync(path.join(import.meta.dirname, 'schema.sql'), 'utf8');

type SqlRow = Record<string, unknown>;

function splitStatements(sql: string): string[] {
  return sql
    .split(';')
    .map((part) =>
      part
        .split('\n')
        .map((line) => (line.trim().startsWith('--') ? '' : line))
        .join('\n')
        .trim()
    )
    .filter(Boolean);
}

function toPg(sql: string): string {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

function sqlitePath(): string {
  if (process.env.SQLITE_PATH) return process.env.SQLITE_PATH;
  if (process.env.VERCEL) return '/tmp/booktyping.sqlite';
  const dir = path.join(process.cwd(), 'data');
  mkdirSync(dir, { recursive: true });
  return path.join(dir, 'booktyping.sqlite');
}

let sqliteDb: DatabaseSync | null = null;
let schemaReady = false;
let seedingAdmin = false;

function getSqlite(): DatabaseSync {
  if (!sqliteDb) {
    const db = new DatabaseSync(sqlitePath());
    db.exec('PRAGMA foreign_keys = ON');
    sqliteDb = db;
  }
  return sqliteDb;
}

function usePostgres(): boolean {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
  return url.startsWith('postgres');
}

async function query<T extends SqlRow = SqlRow>(sql: string, params: unknown[] = []): Promise<T[]> {
  await ensureSchema();
  if (usePostgres()) {
    const { neon } = await import('@neondatabase/serverless');
    const sqlFn = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL || '');
    const rows = await sqlFn.query(toPg(sql), params);
    return (rows as T[]) || [];
  }
  const stmt = getSqlite().prepare(sql);
  return stmt.all(...(params as never[])) as T[];
}

async function run(sql: string, params: unknown[] = []): Promise<void> {
  await ensureSchema();
  if (usePostgres()) {
    const { neon } = await import('@neondatabase/serverless');
    const sqlFn = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL || '');
    await sqlFn.query(toPg(sql), params);
    return;
  }
  getSqlite().prepare(sql).run(...(params as never[]));
}

async function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    if (usePostgres()) {
      const { neon } = await import('@neondatabase/serverless');
      const sqlFn = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL || '');
      for (const statement of splitStatements(SCHEMA)) {
        await sqlFn.query(statement);
      }
    } else {
      getSqlite().exec(SCHEMA);
    }
    schemaReady = true;
  }
  if (seedingAdmin) return;
  seedingAdmin = true;
  try {
    await seedDefaultAdmin();
  } finally {
    seedingAdmin = false;
  }
}

export function buildStudentAccountId(
  schoolYear: string,
  schoolName: string,
  grade: number,
  classNum: number,
  studentNum: number
): string {
  return `${schoolYear.trim()}_${schoolName.trim().replace(/\s+/g, '')}_${grade}_${classNum}_${studentNum}`;
}

function mapStudent(row: SqlRow): StudentAccount {
  return {
    id: String(row.id),
    schoolYear: String(row.school_year),
    schoolName: String(row.school_name),
    grade: Number(row.grade),
    classNum: Number(row.class_num),
    studentNum: Number(row.student_num),
    name: String(row.name),
    createdAt: Number(row.created_at),
    lastLoginAt: Number(row.last_login_at),
  };
}

function mapSession(row: SqlRow): TypingSessionResult {
  let mistypedLetters: Record<string, number> = {};
  try {
    mistypedLetters = JSON.parse(String(row.mistyped_letters || '{}'));
  } catch {
    mistypedLetters = {};
  }
  return {
    id: String(row.id),
    timestamp: Number(row.created_at),
    excerptId: String(row.excerpt_id),
    bookTitle: String(row.book_title),
    author: String(row.author),
    excerptTitle: String(row.excerpt_title),
    cpm: Number(row.cpm),
    wpm: Number(row.wpm),
    peakCpm: Number(row.peak_cpm),
    accuracy: Number(row.accuracy),
    errorCount: Number(row.error_count),
    totalChars: Number(row.total_chars),
    totalStrokes: Number(row.total_strokes),
    durationSeconds: Number(row.duration_seconds),
    mistypedLetters,
    earnedEffortPoints: Number(row.effort_points || 0),
    studentProfile: {
      schoolYear: '',
      schoolName: '',
      grade: 0,
      classNum: 0,
      studentNum: 0,
      name: '',
      accountId: String(row.student_id),
    },
  };
}

function mapReport(row: SqlRow): BookReport {
  return {
    id: String(row.id),
    createdAt: Number(row.created_at),
    excerptId: String(row.excerpt_id),
    bookTitle: String(row.book_title),
    author: String(row.author),
    excerptTitle: String(row.excerpt_title),
    studentProfile: {
      schoolYear: '',
      schoolName: '',
      grade: 0,
      classNum: 0,
      studentNum: 0,
      name: '',
      accountId: String(row.student_id),
    },
    cpm: Number(row.cpm),
    accuracy: Number(row.accuracy),
    durationSeconds: Number(row.duration_seconds),
    title: String(row.title),
    rating: Number(row.rating),
    memorableQuote: String(row.memorable_quote),
    quoteReason: String(row.quote_reason),
    content: String(row.content),
    personalTakeaway: String(row.personal_takeaway),
  };
}

function isUniqueViolation(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('UNIQUE') || message.includes('unique') || message.includes('23505');
}

export async function registerStudent(data: {
  schoolYear: string;
  schoolName: string;
  grade: number;
  classNum: number;
  studentNum: number;
  name: string;
}): Promise<{ success: boolean; message: string; account?: StudentAccount }> {
  const schoolName = data.schoolName.trim();
  const schoolYear = data.schoolYear.trim();
  const name = data.name.trim();
  if (!schoolName) return { success: false, message: '학교명을 입력해주세요.' };
  if (!name) return { success: false, message: '학생 성명을 입력해주세요. (성명이 암호 역할을 합니다)' };
  if (data.grade < 1 || data.classNum < 1 || data.studentNum < 1) {
    return { success: false, message: '학년, 반, 번호를 올바르게 입력해주세요.' };
  }

  const id = buildStudentAccountId(schoolYear, schoolName, data.grade, data.classNum, data.studentNum);
  const now = Date.now();
  try {
    await run(
      `INSERT INTO students (id, school_year, school_name, grade, class_num, student_num, name, created_at, last_login_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, schoolYear, schoolName, data.grade, data.classNum, data.studentNum, name, now, now]
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        success: false,
        message: `${schoolYear} ${schoolName} ${data.grade}학년 ${data.classNum}반 ${data.studentNum}번으로 이미 등록된 계정이 있습니다. 로그인 탭에서 본인 성명으로 로그인해 주세요.`,
      };
    }
    throw error;
  }

  const account = await getStudentById(id);
  return {
    success: true,
    message: `${name} 학생의 회원가입이 완료되었습니다! (성명이 로그인 암호입니다)`,
    account: account || undefined,
  };
}

export async function loginStudent(data: {
  schoolYear: string;
  schoolName: string;
  grade: number;
  classNum: number;
  studentNum: number;
  name: string;
}): Promise<{ success: boolean; message: string; account?: StudentAccount }> {
  const schoolName = data.schoolName.trim();
  const schoolYear = data.schoolYear.trim();
  const name = data.name.trim();
  if (!schoolName) return { success: false, message: '학교명을 입력해주세요.' };
  if (!name) return { success: false, message: '등록된 학생 성명(암호)을 입력해주세요.' };

  const id = buildStudentAccountId(schoolYear, schoolName, data.grade, data.classNum, data.studentNum);
  const matched = await getStudentById(id);
  if (!matched) {
    return {
      success: false,
      message: `입력하신 정보(${schoolYear} ${schoolName} ${data.grade}학년 ${data.classNum}반 ${data.studentNum}번)로 등록된 계정이 없습니다. [회원가입] 탭에서 먼저 등록해주세요.`,
    };
  }
  if (matched.name.trim() !== name) {
    return {
      success: false,
      message: '등록된 학생 성명(암호)과 일치하지 않습니다. 가입 시 입력하셨던 성명을 정확히 입력해 주세요.',
    };
  }

  const now = Date.now();
  await run('UPDATE students SET last_login_at = ? WHERE id = ?', [now, id]);
  const account = { ...matched, lastLoginAt: now };
  return {
    success: true,
    message: `${matched.name} 학생으로 로그인되었습니다.`,
    account,
  };
}

export async function getStudentById(id: string): Promise<StudentAccount | null> {
  const rows = await query('SELECT * FROM students WHERE id = ? LIMIT 1', [id]);
  return rows[0] ? mapStudent(rows[0]) : null;
}

export async function saveSession(
  studentId: string,
  result: TypingSessionResult
): Promise<TypingSessionResult[]> {
  await run(
    `INSERT INTO typing_sessions (
      id, student_id, excerpt_id, book_title, author, excerpt_title,
      cpm, wpm, peak_cpm, accuracy, error_count, total_chars, total_strokes,
      duration_seconds, mistyped_letters, effort_points, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      result.id,
      studentId,
      result.excerptId,
      result.bookTitle,
      result.author,
      result.excerptTitle,
      result.cpm,
      result.wpm,
      result.peakCpm,
      result.accuracy,
      result.errorCount,
      result.totalChars,
      result.totalStrokes,
      result.durationSeconds,
      JSON.stringify(result.mistypedLetters || {}),
      result.earnedEffortPoints || 0,
      result.timestamp || Date.now(),
    ]
  );
  return listSessions(studentId);
}

export async function listSessions(studentId: string): Promise<TypingSessionResult[]> {
  const rows = await query(
    'SELECT * FROM typing_sessions WHERE student_id = ? ORDER BY created_at DESC',
    [studentId]
  );
  const student = await getStudentById(studentId);
  return rows.map((row) => {
    const session = mapSession(row);
    if (student) {
      session.studentProfile = {
        schoolYear: student.schoolYear,
        schoolName: student.schoolName,
        grade: student.grade,
        classNum: student.classNum,
        studentNum: student.studentNum,
        name: student.name,
        accountId: student.id,
      };
    }
    return session;
  });
}

export async function deleteSession(id: string, studentId: string): Promise<TypingSessionResult[]> {
  await run('DELETE FROM typing_sessions WHERE id = ? AND student_id = ?', [id, studentId]);
  return listSessions(studentId);
}

export async function clearSessions(studentId: string): Promise<void> {
  await run('DELETE FROM typing_sessions WHERE student_id = ?', [studentId]);
}

export async function saveReport(studentId: string, report: BookReport): Promise<BookReport[]> {
  const existing = await query('SELECT id FROM book_reports WHERE id = ? LIMIT 1', [report.id]);
  if (existing[0]) {
    await run(
      `UPDATE book_reports SET
        excerpt_id = ?, book_title = ?, author = ?, excerpt_title = ?,
        cpm = ?, accuracy = ?, duration_seconds = ?, title = ?, rating = ?,
        memorable_quote = ?, quote_reason = ?, content = ?, personal_takeaway = ?
       WHERE id = ? AND student_id = ?`,
      [
        report.excerptId,
        report.bookTitle,
        report.author,
        report.excerptTitle,
        report.cpm,
        report.accuracy,
        report.durationSeconds,
        report.title,
        report.rating,
        report.memorableQuote,
        report.quoteReason,
        report.content,
        report.personalTakeaway,
        report.id,
        studentId,
      ]
    );
  } else {
    await run(
      `INSERT INTO book_reports (
        id, student_id, excerpt_id, book_title, author, excerpt_title,
        cpm, accuracy, duration_seconds, title, rating,
        memorable_quote, quote_reason, content, personal_takeaway, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        report.id,
        studentId,
        report.excerptId,
        report.bookTitle,
        report.author,
        report.excerptTitle,
        report.cpm,
        report.accuracy,
        report.durationSeconds,
        report.title,
        report.rating,
        report.memorableQuote,
        report.quoteReason,
        report.content,
        report.personalTakeaway,
        report.createdAt || Date.now(),
      ]
    );
  }
  return listReports(studentId);
}

export async function listReports(studentId: string): Promise<BookReport[]> {
  const rows = await query(
    'SELECT * FROM book_reports WHERE student_id = ? ORDER BY created_at DESC',
    [studentId]
  );
  const student = await getStudentById(studentId);
  return rows.map((row) => {
    const report = mapReport(row);
    if (student) {
      report.studentProfile = {
        schoolYear: student.schoolYear,
        schoolName: student.schoolName,
        grade: student.grade,
        classNum: student.classNum,
        studentNum: student.studentNum,
        name: student.name,
        accountId: student.id,
      };
    }
    return report;
  });
}

export async function deleteReport(id: string, studentId: string): Promise<BookReport[]> {
  await run('DELETE FROM book_reports WHERE id = ? AND student_id = ?', [id, studentId]);
  return listReports(studentId);
}

function formatLastActive(timestamp: number): string {
  if (!timestamp) return '등록 완료';
  const diffMs = Date.now() - timestamp;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 5) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '어제';
  return `${days}일 전`;
}

export async function getLeaderboard(filter: {
  schoolYear: string;
  schoolName: string;
  grade: number;
  classNum: number;
  currentStudentId?: string;
}): Promise<StudentRankRecord[]> {
  const rows = await query(
    `SELECT
      s.id,
      s.school_year,
      s.school_name,
      s.grade,
      s.class_num,
      s.student_num,
      s.name,
      COUNT(ts.id) AS completed_sessions,
      COALESCE(SUM(ts.total_chars), 0) AS total_chars,
      COALESCE(SUM(ts.total_strokes), 0) AS total_strokes,
      COALESCE(SUM(ts.duration_seconds), 0) AS total_practice_time_sec,
      COALESCE(MAX(ts.peak_cpm), 0) AS peak_cpm,
      COALESCE(AVG(ts.cpm), 0) AS avg_cpm,
      COALESCE(AVG(ts.accuracy), 0) AS avg_accuracy,
      COALESCE(MAX(ts.created_at), 0) AS last_session_at
     FROM students s
     LEFT JOIN typing_sessions ts ON ts.student_id = s.id
     WHERE s.school_year = ? AND s.school_name = ? AND s.grade = ? AND s.class_num = ?
     GROUP BY s.id, s.school_year, s.school_name, s.grade, s.class_num, s.student_num, s.name`,
    [filter.schoolYear, filter.schoolName, filter.grade, filter.classNum]
  );

  return rows.map((row) => {
    const totalChars = Number(row.total_chars);
    const completedSessions = Number(row.completed_sessions);
    const totalPracticeTimeSec = Number(row.total_practice_time_sec);
    const peakCpm = Math.round(Number(row.peak_cpm));
    const avgCpm = Math.round(Number(row.avg_cpm));
    const avgAccuracy = parseFloat(Number(row.avg_accuracy).toFixed(1));
    const effortScore = calculateCumulativeEffortScore({
      totalChars,
      completedSessions,
      totalPracticeTimeSec,
      avgAccuracy,
      avgCpm,
      peakCpm,
    });
    const studentId = String(row.id);
    return {
      id: studentId,
      profile: {
        schoolYear: String(row.school_year),
        schoolName: String(row.school_name),
        grade: Number(row.grade),
        classNum: Number(row.class_num),
        studentNum: Number(row.student_num),
        name: String(row.name),
        accountId: studentId,
      },
      isCurrentUser: Boolean(filter.currentStudentId && filter.currentStudentId === studentId),
      totalChars,
      totalStrokes: Number(row.total_strokes),
      completedSessions,
      totalPracticeTimeSec,
      peakCpm,
      avgCpm,
      avgAccuracy,
      effortScore,
      titleBadge: getTitleBadge({
        effortScore,
        totalChars,
        completedSessions,
        peakCpm,
        avgAccuracy,
      }),
      lastActive: formatLastActive(Number(row.last_session_at)),
    };
  });
}

export async function listSchoolNames(): Promise<string[]> {
  const rows = await query('SELECT DISTINCT school_name FROM students ORDER BY school_name');
  return rows.map((row) => String(row.school_name)).filter(Boolean);
}

export interface AdminAccount {
  id: string;
  username: string;
  createdAt: number;
  lastLoginAt: number;
}

export interface AdminStudentRow extends StudentAccount {
  sessionCount: number;
  reportCount: number;
  totalChars: number;
}

export interface AdminOverview {
  studentCount: number;
  sessionCount: number;
  reportCount: number;
}

export const DEFAULT_ADMIN_USERNAME = 'admin';
export const DEFAULT_ADMIN_PASSWORD = 'GaonAdmin2026!';
const SESSION_MS = 1000 * 60 * 60 * 24 * 7;

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 32).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const next = scryptSync(password, salt, 32);
  try {
    return timingSafeEqual(Buffer.from(hash, 'hex'), next);
  } catch {
    return false;
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

async function seedDefaultAdmin(): Promise<void> {
  const existing = await query('SELECT id FROM admins LIMIT 1');
  if (existing[0]) return;
  const now = Date.now();
  await run(
    `INSERT INTO admins (id, username, password_hash, created_at, last_login_at)
     VALUES (?, ?, ?, ?, ?)`,
    ['admin-default', DEFAULT_ADMIN_USERNAME, hashPassword(DEFAULT_ADMIN_PASSWORD), now, now]
  );
}

export async function loginAdmin(
  username: string,
  password: string
): Promise<{ success: boolean; message: string; token?: string; admin?: AdminAccount }> {
  const name = username.trim();
  if (!name || !password) {
    return { success: false, message: '아이디와 비밀번호를 입력해주세요.' };
  }
  const rows = await query('SELECT * FROM admins WHERE username = ? LIMIT 1', [name]);
  const row = rows[0];
  if (!row || !verifyPassword(password, String(row.password_hash))) {
    return { success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' };
  }

  const now = Date.now();
  const token = randomBytes(32).toString('hex');
  await run('UPDATE admins SET last_login_at = ? WHERE id = ?', [now, row.id]);
  await run('DELETE FROM admin_sessions WHERE expires_at < ?', [now]);
  await run(
    `INSERT INTO admin_sessions (token_hash, admin_id, created_at, expires_at)
     VALUES (?, ?, ?, ?)`,
    [hashToken(token), row.id, now, now + SESSION_MS]
  );

  return {
    success: true,
    message: '관리자로 로그인되었습니다.',
    token,
    admin: {
      id: String(row.id),
      username: String(row.username),
      createdAt: Number(row.created_at),
      lastLoginAt: now,
    },
  };
}

export async function getAdminByToken(token: string): Promise<AdminAccount | null> {
  if (!token) return null;
  const rows = await query(
    `SELECT a.id, a.username, a.created_at, a.last_login_at
     FROM admin_sessions s
     JOIN admins a ON a.id = s.admin_id
     WHERE s.token_hash = ? AND s.expires_at > ?
     LIMIT 1`,
    [hashToken(token), Date.now()]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: String(row.id),
    username: String(row.username),
    createdAt: Number(row.created_at),
    lastLoginAt: Number(row.last_login_at),
  };
}

export async function logoutAdmin(token: string): Promise<void> {
  if (!token) return;
  await run('DELETE FROM admin_sessions WHERE token_hash = ?', [hashToken(token)]);
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const students = await query('SELECT COUNT(*) AS count FROM students');
  const sessions = await query('SELECT COUNT(*) AS count FROM typing_sessions');
  const reports = await query('SELECT COUNT(*) AS count FROM book_reports');
  return {
    studentCount: Number(students[0]?.count || 0),
    sessionCount: Number(sessions[0]?.count || 0),
    reportCount: Number(reports[0]?.count || 0),
  };
}

export async function listAllStudents(): Promise<AdminStudentRow[]> {
  const rows = await query(
    `SELECT
      s.id, s.school_year, s.school_name, s.grade, s.class_num, s.student_num, s.name,
      s.created_at, s.last_login_at,
      COUNT(DISTINCT ts.id) AS session_count,
      COUNT(DISTINCT br.id) AS report_count,
      COALESCE(SUM(ts.total_chars), 0) AS total_chars
     FROM students s
     LEFT JOIN typing_sessions ts ON ts.student_id = s.id
     LEFT JOIN book_reports br ON br.student_id = s.id
     GROUP BY s.id, s.school_year, s.school_name, s.grade, s.class_num, s.student_num, s.name, s.created_at, s.last_login_at
     ORDER BY s.school_name, s.grade, s.class_num, s.student_num`
  );
  return rows.map((row) => ({
    ...mapStudent(row),
    sessionCount: Number(row.session_count),
    reportCount: Number(row.report_count),
    totalChars: Number(row.total_chars),
  }));
}

export async function deleteStudentAccount(id: string): Promise<void> {
  await run('DELETE FROM students WHERE id = ?', [id]);
}

export async function listAllSessions(limit = 200): Promise<TypingSessionResult[]> {
  const rows = await query(
    `SELECT ts.*, s.school_year, s.school_name, s.grade, s.class_num, s.student_num, s.name
     FROM typing_sessions ts
     JOIN students s ON s.id = ts.student_id
     ORDER BY ts.created_at DESC
     LIMIT ?`,
    [limit]
  );
  return rows.map((row) => {
    const session = mapSession(row);
    session.studentProfile = {
      schoolYear: String(row.school_year),
      schoolName: String(row.school_name),
      grade: Number(row.grade),
      classNum: Number(row.class_num),
      studentNum: Number(row.student_num),
      name: String(row.name),
      accountId: String(row.student_id),
    };
    return session;
  });
}

export async function listAllReports(limit = 200): Promise<BookReport[]> {
  const rows = await query(
    `SELECT br.*, s.school_year, s.school_name, s.grade, s.class_num, s.student_num, s.name
     FROM book_reports br
     JOIN students s ON s.id = br.student_id
     ORDER BY br.created_at DESC
     LIMIT ?`,
    [limit]
  );
  return rows.map((row) => {
    const report = mapReport(row);
    report.studentProfile = {
      schoolYear: String(row.school_year),
      schoolName: String(row.school_name),
      grade: Number(row.grade),
      classNum: Number(row.class_num),
      studentNum: Number(row.student_num),
      name: String(row.name),
      accountId: String(row.student_id),
    };
    return report;
  });
}

export function resetSchemaCache(): void {
  schemaReady = false;
  seedingAdmin = false;
  sqliteDb?.close();
  sqliteDb = null;
}
