import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import type { BookReport, StudentAccount, StudentRankRecord, TypingSessionResult } from '../src/types';
import { expandSchoolName } from '../src/utils/schoolName';
import { calculateCumulativeEffortScore, getTitleBadge } from '../src/utils/storage';
import {
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_ADMIN_USERNAME,
  expectedAdminPassword,
  expectedAdminUser,
  readStaffToken,
  secretsEqual,
  signStaffToken,
} from './adminAuth.js';

export { DEFAULT_ADMIN_PASSWORD, DEFAULT_ADMIN_USERNAME };

export type StaffRole = 'admin' | 'teacher';

export interface StaffSession {
  id: string;
  username: string;
  role: StaffRole;
  schoolName: string;
  createdAt: number;
  lastLoginAt: number;
}

const SCHEMA_CANDIDATES = [
  path.join(import.meta.dirname, 'schema.sql'),
  path.join(import.meta.dirname, '../server/schema.sql'),
  path.join(process.cwd(), 'server/schema.sql'),
];

function readSchema(): string {
  for (const file of SCHEMA_CANDIDATES) {
    try {
      return readFileSync(file, 'utf8');
    } catch {
      // try the next known location
    }
  }
  throw new Error('schema.sql not found');
}

const SCHEMA = readSchema();

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
    await migrateExtraColumns();
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
    paragraphNotes: parseParagraphNotes(row.paragraph_notes),
  };
}

function parseParagraphNotes(value: unknown): BookReport['paragraphNotes'] {
  try {
    const parsed = JSON.parse(String(value || '[]'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function migrateExtraColumns(): Promise<void> {
  const statements = [
    `CREATE TABLE IF NOT EXISTS teachers (
      id TEXT PRIMARY KEY,
      school_name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      last_login_at BIGINT NOT NULL
    )`,
  ];
  for (const sql of statements) {
    try {
      await runRaw(sql);
    } catch {
      // already exists
    }
  }
  try {
    await runRaw(`ALTER TABLE book_reports ADD COLUMN paragraph_notes TEXT NOT NULL DEFAULT '[]'`);
  } catch {
    // column already exists
  }
  if (usePostgres()) {
    const timestampAlters = [
      'ALTER TABLE students ALTER COLUMN created_at TYPE BIGINT',
      'ALTER TABLE students ALTER COLUMN last_login_at TYPE BIGINT',
      'ALTER TABLE typing_sessions ALTER COLUMN created_at TYPE BIGINT',
      'ALTER TABLE book_reports ALTER COLUMN created_at TYPE BIGINT',
      'ALTER TABLE teachers ALTER COLUMN created_at TYPE BIGINT',
      'ALTER TABLE teachers ALTER COLUMN last_login_at TYPE BIGINT',
      'ALTER TABLE admins ALTER COLUMN created_at TYPE BIGINT',
      'ALTER TABLE admins ALTER COLUMN last_login_at TYPE BIGINT',
      'ALTER TABLE admin_sessions ALTER COLUMN created_at TYPE BIGINT',
      'ALTER TABLE admin_sessions ALTER COLUMN expires_at TYPE BIGINT',
    ];
    for (const sql of timestampAlters) {
      try {
        await runRaw(sql);
      } catch {
        // table/column may not exist yet
      }
    }
  }
}

async function runRaw(sql: string): Promise<void> {
  if (usePostgres()) {
    const { neon } = await import('@neondatabase/serverless');
    const sqlFn = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL || '');
    await sqlFn.query(sql);
    return;
  }
  getSqlite().exec(sql);
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
  const schoolName = expandSchoolName(String(data.schoolName || ''));
  const schoolYear = String(data.schoolYear || '').trim();
  const name = String(data.name || '').trim();
  const grade = Number(data.grade);
  const classNum = Number(data.classNum);
  const studentNum = Number(data.studentNum);
  if (!schoolName) return { success: false, message: '학교명을 입력해주세요.' };
  if (!name) return { success: false, message: '학생 성명을 입력해주세요. (성명이 로그인 암호 역할을 합니다)' };
  if (!schoolYear || !Number.isInteger(grade) || grade < 1 || !Number.isInteger(classNum) || classNum < 1 || !Number.isInteger(studentNum) || studentNum < 1) {
    return { success: false, message: '학년, 반, 번호를 올바르게 입력해주세요.' };
  }

  const id = buildStudentAccountId(schoolYear, schoolName, grade, classNum, studentNum);
  const now = Date.now();
  try {
    await run(
      `INSERT INTO students (id, school_year, school_name, grade, class_num, student_num, name, created_at, last_login_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, schoolYear, schoolName, grade, classNum, studentNum, name, now, now]
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        success: false,
        message: `${schoolYear} ${schoolName} ${grade}학년 ${classNum}반 ${studentNum}번으로 이미 등록된 계정이 있습니다. 로그인 탭에서 본인 성명으로 로그인해 주세요.`,
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
  const schoolName = expandSchoolName(String(data.schoolName || '')) || String(data.schoolName || '').trim();
  const schoolYear = String(data.schoolYear || '').trim();
  const name = String(data.name || '').trim();
  const grade = Number(data.grade);
  const classNum = Number(data.classNum);
  const studentNum = Number(data.studentNum);
  if (!schoolName) return { success: false, message: '학교명을 입력해주세요.' };
  if (!name) return { success: false, message: '등록된 학생 성명(암호)을 입력해주세요.' };
  if (!schoolYear || !Number.isInteger(grade) || grade < 1 || !Number.isInteger(classNum) || classNum < 1 || !Number.isInteger(studentNum) || studentNum < 1) {
    return { success: false, message: '학년, 반, 번호를 올바르게 입력해주세요.' };
  }

  const candidateNames = Array.from(new Set([schoolName, String(data.schoolName || '').trim()].filter(Boolean)));
  let matched: StudentAccount | null = null;
  let id = '';
  for (const candidate of candidateNames) {
    id = buildStudentAccountId(schoolYear, candidate, grade, classNum, studentNum);
    matched = await getStudentById(id);
    if (matched) break;
  }
  if (!matched) {
    return {
      success: false,
      message: `입력하신 정보(${schoolYear} ${schoolName} ${grade}학년 ${classNum}반 ${studentNum}번)로 등록된 계정이 없습니다. [회원가입] 탭에서 먼저 등록해주세요.`,
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
        memorable_quote = ?, quote_reason = ?, content = ?, personal_takeaway = ?, paragraph_notes = ?
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
        JSON.stringify(report.paragraphNotes || []),
        report.id,
        studentId,
      ]
    );
  } else {
    await run(
      `INSERT INTO book_reports (
        id, student_id, excerpt_id, book_title, author, excerpt_title,
        cpm, accuracy, duration_seconds, title, rating,
        memorable_quote, quote_reason, content, personal_takeaway, paragraph_notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        JSON.stringify(report.paragraphNotes || []),
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
  classNum?: number;
  currentStudentId?: string;
}): Promise<StudentRankRecord[]> {
  const params: unknown[] = [filter.schoolYear, filter.schoolName, filter.grade];
  let classSql = '';
  if (filter.classNum && filter.classNum > 0) {
    classSql = ' AND s.class_num = ? ';
    params.push(filter.classNum);
  }
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
     WHERE s.school_year = ? AND s.school_name = ? AND s.grade = ? ${classSql}
     GROUP BY s.id, s.school_year, s.school_name, s.grade, s.class_num, s.student_num, s.name
     ORDER BY s.class_num, s.student_num`,
    params
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

export async function listClassNumbers(filter: {
  schoolYear: string;
  schoolName: string;
  grade: number;
}): Promise<number[]> {
  const rows = await query(
    `SELECT DISTINCT class_num FROM students
     WHERE school_year = ? AND school_name = ? AND grade = ?
     ORDER BY class_num`,
    [filter.schoolYear, filter.schoolName, filter.grade]
  );
  return rows.map((row) => Number(row.class_num)).filter((value) => value > 0);
}

export async function listSchoolNames(): Promise<string[]> {
  const rows = await query('SELECT DISTINCT school_name FROM students ORDER BY school_name');
  return rows.map((row) => String(row.school_name)).filter(Boolean);
}

export interface AdminAccount {
  id: string;
  username: string;
  role: StaffRole;
  schoolName: string;
  createdAt: number;
  lastLoginAt: number;
}

export interface TeacherAccount {
  id: string;
  schoolName: string;
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
): Promise<{ success: boolean; message: string; token?: string; role?: StaffRole; admin?: AdminAccount }> {
  const name = username.trim();
  const pass = password.trim();
  if (!name || !pass) {
    return { success: false, message: '아이디와 비밀번호를 입력해주세요.' };
  }

  const envOk = secretsEqual(name, expectedAdminUser()) && secretsEqual(pass, expectedAdminPassword());
  if (envOk) {
    const now = Date.now();
    const admin: AdminAccount = {
      id: 'admin-default',
      username: expectedAdminUser(),
      role: 'admin',
      schoolName: '',
      createdAt: now,
      lastLoginAt: now,
    };
    try {
      await run('UPDATE admins SET last_login_at = ? WHERE username = ?', [now, admin.username]);
    } catch {
      // Vercel ephemeral sqlite can miss the row; the signed token is enough to stay logged in.
    }
    return {
      success: true,
      message: '관리자로 로그인되었습니다.',
      token: signStaffToken({ u: admin.username, role: 'admin' }),
      role: 'admin',
      admin,
    };
  }

  const adminRows = await query('SELECT * FROM admins WHERE username = ? LIMIT 1', [name]);
  const adminRow = adminRows[0];
  if (adminRow && verifyPassword(pass, String(adminRow.password_hash))) {
    const now = Date.now();
    const admin: AdminAccount = {
      id: String(adminRow.id),
      username: String(adminRow.username),
      role: 'admin',
      schoolName: '',
      createdAt: Number(adminRow.created_at),
      lastLoginAt: now,
    };
    await run('UPDATE admins SET last_login_at = ? WHERE username = ?', [now, admin.username]);
    return {
      success: true,
      message: '관리자로 로그인되었습니다.',
      token: signStaffToken({ u: admin.username, role: 'admin' }),
      role: 'admin',
      admin,
    };
  }

  const teacherRows = await query('SELECT * FROM teachers WHERE username = ? LIMIT 1', [name]);
  const teacherRow = teacherRows[0];
  if (teacherRow && verifyPassword(pass, String(teacherRow.password_hash))) {
    const now = Date.now();
    const schoolName = String(teacherRow.school_name);
    await run('UPDATE teachers SET last_login_at = ? WHERE id = ?', [now, String(teacherRow.id)]);
    const admin: AdminAccount = {
      id: String(teacherRow.id),
      username: String(teacherRow.username),
      role: 'teacher',
      schoolName,
      createdAt: Number(teacherRow.created_at),
      lastLoginAt: now,
    };
    return {
      success: true,
      message: `${schoolName} 담임교사로 로그인되었습니다.`,
      token: signStaffToken({ u: admin.username, role: 'teacher', schoolName }),
      role: 'teacher',
      admin,
    };
  }

  return { success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' };
}

export async function loginTeacher(
  username: string,
  password: string
): Promise<{ success: boolean; message: string; token?: string; role?: StaffRole; admin?: AdminAccount }> {
  const result = await loginAdmin(username, password);
  if (!result.success) {
    return { success: false, message: '선생님 아이디 또는 비밀번호가 올바르지 않습니다.' };
  }
  if (result.role !== 'teacher' || !result.admin?.schoolName) {
    return { success: false, message: '선생님 계정으로 로그인해 주세요. 관리자는 관리자 로그인을 이용하세요.' };
  }
  return result;
}

export async function getAdminByToken(token: string): Promise<AdminAccount | null> {
  if (!token) return null;
  const signed = readStaffToken(token);
  if (signed) {
    return {
      id: signed.role === 'teacher' ? `teacher:${signed.username}` : 'admin-default',
      username: signed.username,
      role: signed.role === 'teacher' ? 'teacher' : 'admin',
      schoolName: signed.schoolName,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    };
  }

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
    role: 'admin',
    schoolName: '',
    createdAt: Number(row.created_at),
    lastLoginAt: Number(row.last_login_at),
  };
}

export async function createTeacher(data: {
  schoolName: string;
  username: string;
  password: string;
}): Promise<{ success: boolean; message: string; teacher?: TeacherAccount }> {
  const schoolName = expandSchoolName(data.schoolName);
  const username = data.username.trim();
  const password = data.password.trim();
  if (!schoolName) return { success: false, message: '학교명을 입력해주세요.' };
  if (!username) return { success: false, message: '교사 아이디를 입력해주세요.' };
  if (username === expectedAdminUser()) {
    return { success: false, message: '관리자 아이디와 같은 이름은 사용할 수 없습니다.' };
  }
  if (password.length < 4) return { success: false, message: '비밀번호는 4자 이상 입력해주세요.' };

  const now = Date.now();
  try {
    await run(
      `INSERT INTO teachers (id, school_name, username, password_hash, created_at, last_login_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [`teacher-${now}`, schoolName, username, hashPassword(password), now, now]
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { success: false, message: '이미 사용 중인 교사 아이디입니다.' };
    }
    throw error;
  }

  return {
    success: true,
    message: `${schoolName} 담임교사 계정을 만들었습니다.`,
    teacher: { id: `teacher-${now}`, schoolName, username, createdAt: now, lastLoginAt: now },
  };
}

export async function listTeachers(): Promise<TeacherAccount[]> {
  const rows = await query('SELECT * FROM teachers ORDER BY school_name, username');
  return rows.map((row) => ({
    id: String(row.id),
    schoolName: String(row.school_name),
    username: String(row.username),
    createdAt: Number(row.created_at),
    lastLoginAt: Number(row.last_login_at),
  }));
}

export async function deleteTeacher(id: string): Promise<TeacherAccount[]> {
  await run('DELETE FROM teachers WHERE id = ?', [id]);
  return listTeachers();
}

export async function logoutAdmin(token: string): Promise<void> {
  if (!token) return;
  await run('DELETE FROM admin_sessions WHERE token_hash = ?', [hashToken(token)]);
}

function schoolFilter(alias: string, schoolName?: string): { sql: string; params: unknown[] } {
  if (!schoolName) return { sql: '', params: [] };
  return { sql: ` WHERE ${alias}.school_name = ? `, params: [schoolName] };
}

export async function getAdminOverview(schoolName?: string): Promise<AdminOverview> {
  if (schoolName) {
    const students = await query('SELECT COUNT(*) AS count FROM students WHERE school_name = ?', [schoolName]);
    const sessions = await query(
      `SELECT COUNT(*) AS count FROM typing_sessions ts
       JOIN students s ON s.id = ts.student_id
       WHERE s.school_name = ?`,
      [schoolName]
    );
    const reports = await query(
      `SELECT COUNT(*) AS count FROM book_reports br
       JOIN students s ON s.id = br.student_id
       WHERE s.school_name = ?`,
      [schoolName]
    );
    return {
      studentCount: Number(students[0]?.count || 0),
      sessionCount: Number(sessions[0]?.count || 0),
      reportCount: Number(reports[0]?.count || 0),
    };
  }
  const students = await query('SELECT COUNT(*) AS count FROM students');
  const sessions = await query('SELECT COUNT(*) AS count FROM typing_sessions');
  const reports = await query('SELECT COUNT(*) AS count FROM book_reports');
  return {
    studentCount: Number(students[0]?.count || 0),
    sessionCount: Number(sessions[0]?.count || 0),
    reportCount: Number(reports[0]?.count || 0),
  };
}

export async function listAllStudents(schoolName?: string): Promise<AdminStudentRow[]> {
  const filter = schoolFilter('s', schoolName);
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
     ${filter.sql}
     GROUP BY s.id, s.school_year, s.school_name, s.grade, s.class_num, s.student_num, s.name, s.created_at, s.last_login_at
     ORDER BY s.school_name, s.grade, s.class_num, s.student_num`,
    filter.params
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

export async function listAllSessions(limit = 200, schoolName?: string): Promise<TypingSessionResult[]> {
  const filter = schoolFilter('s', schoolName);
  const rows = await query(
    `SELECT ts.*, s.school_year, s.school_name, s.grade, s.class_num, s.student_num, s.name
     FROM typing_sessions ts
     JOIN students s ON s.id = ts.student_id
     ${filter.sql}
     ORDER BY ts.created_at DESC
     LIMIT ?`,
    [...filter.params, limit]
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

export async function listAllReports(limit = 200, schoolName?: string): Promise<BookReport[]> {
  const filter = schoolFilter('s', schoolName);
  const rows = await query(
    `SELECT br.*, s.school_year, s.school_name, s.grade, s.class_num, s.student_num, s.name
     FROM book_reports br
     JOIN students s ON s.id = br.student_id
     ${filter.sql}
     ORDER BY br.created_at DESC
     LIMIT ?`,
    [...filter.params, limit]
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
