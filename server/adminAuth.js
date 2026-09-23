import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const DEFAULT_ADMIN_USERNAME = 'admin';
export const DEFAULT_ADMIN_PASSWORD = 'GaonAdmin2026!';
const SESSION_MS = 1000 * 60 * 60 * 24 * 7;

export function expectedAdminUser() {
  return String(process.env.ADMIN_USERNAME || DEFAULT_ADMIN_USERNAME).trim();
}

export function expectedAdminPassword() {
  return String(process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD);
}

function tokenSecret() {
  return String(process.env.ADMIN_TOKEN_SECRET || expectedAdminPassword());
}

function sha256(value) {
  return createHash('sha256').update(String(value)).digest();
}

export function secretsEqual(left, right) {
  return timingSafeEqual(sha256(left), sha256(right));
}

export function signStaffToken(payload) {
  const body = Buffer.from(
    JSON.stringify({
      u: payload.u,
      role: payload.role || 'admin',
      schoolName: payload.schoolName || '',
      grade: Number(payload.grade || 0),
      classNum: Number(payload.classNum || 0),
      exp: Date.now() + SESSION_MS,
    })
  ).toString('base64url');
  const signature = createHmac('sha256', tokenSecret()).update(body).digest('hex');
  return `${body}.${signature}`;
}

export function readStaffToken(token) {
  if (!token) return null;
  const [body, signature] = String(token).split('.');
  if (!body || !signature) return null;
  const expected = createHmac('sha256', tokenSecret()).update(body).digest('hex');
  try {
    if (!timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))) return null;
  } catch {
    return null;
  }
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!data.u || typeof data.exp !== 'number' || data.exp < Date.now()) return null;
    if (data.role === 'student') return null;
    const role =
      data.role === 'school_admin' ? 'school_admin' : data.role === 'teacher' ? 'teacher' : 'admin';
    return {
      username: String(data.u),
      role,
      schoolName: String(data.schoolName || ''),
      grade: Number(data.grade || 0),
      classNum: Number(data.classNum || 0),
    };
  } catch {
    return null;
  }
}

export function signStudentToken(studentId) {
  const body = Buffer.from(
    JSON.stringify({
      s: String(studentId || ''),
      role: 'student',
      exp: Date.now() + SESSION_MS,
    })
  ).toString('base64url');
  const signature = createHmac('sha256', tokenSecret()).update(body).digest('hex');
  return `${body}.${signature}`;
}

export function readStudentToken(token) {
  if (!token) return null;
  const [body, signature] = String(token).split('.');
  if (!body || !signature) return null;
  const expected = createHmac('sha256', tokenSecret()).update(body).digest('hex');
  try {
    if (!timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))) return null;
  } catch {
    return null;
  }
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (data.role !== 'student' || !data.s || typeof data.exp !== 'number' || data.exp < Date.now()) return null;
    return { studentId: String(data.s) };
  } catch {
    return null;
  }
}
