import { BookReport, StudentAccount, StudentRankRecord, TypingSessionResult } from '../types';

type ApiResult<T> = T & { success?: boolean; message?: string };

async function request<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init?.headers || {}) as Record<string, string>),
  };
  if (!headers.Authorization) {
    const studentToken = getStudentToken();
    if (studentToken) headers.Authorization = `Bearer ${studentToken}`;
  }
  const response = await fetch(path, {
    ...init,
    headers,
  });
  const data = (await response.json().catch(() => ({}))) as ApiResult<T>;
  if (!response.ok) {
    throw new Error(data.message || '요청에 실패했습니다.');
  }
  return data;
}

export async function apiListSchools(): Promise<string[]> {
  try {
    const data = await request<{ schools: string[] }>('/api/schools');
    return data.schools || [];
  } catch {
    return [];
  }
}

export async function apiRegisterStudent(payload: {
  schoolYear: string;
  schoolName: string;
  grade: number;
  classNum: number;
  studentNum: number;
  name: string;
}): Promise<{ success: boolean; message: string; account?: StudentAccount }> {
  try {
    const data = await request<{ account?: StudentAccount; token?: string }>('/api/students', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (data.token) setStudentToken(data.token);
    return { success: Boolean(data.success), message: data.message || '', account: data.account };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : '회원가입에 실패했습니다.' };
  }
}

export async function apiLoginStudent(payload: {
  schoolYear: string;
  schoolName: string;
  grade: number;
  classNum: number;
  studentNum: number;
  name: string;
}): Promise<{ success: boolean; message: string; account?: StudentAccount }> {
  try {
    const data = await request<{ account?: StudentAccount; token?: string }>('/api/student-login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (data.token) setStudentToken(data.token);
    return { success: Boolean(data.success), message: data.message || '', account: data.account };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : '로그인에 실패했습니다.' };
  }
}

export async function apiListSessions(studentId: string): Promise<TypingSessionResult[]> {
  const data = await request<{ sessions: TypingSessionResult[] }>(
    `/api/sessions?studentId=${encodeURIComponent(studentId)}`
  );
  return data.sessions || [];
}

export async function apiSaveSession(
  studentId: string,
  result: TypingSessionResult
): Promise<TypingSessionResult[]> {
  const data = await request<{ sessions: TypingSessionResult[] }>('/api/sessions', {
    method: 'POST',
    body: JSON.stringify({ studentId, result }),
  });
  return data.sessions || [];
}

export async function apiDeleteSession(studentId: string, sessionId: string): Promise<TypingSessionResult[]> {
  const data = await request<{ sessions: TypingSessionResult[] }>(
    `/api/session-item?id=${encodeURIComponent(sessionId)}&studentId=${encodeURIComponent(studentId)}`,
    { method: 'DELETE' }
  );
  return data.sessions || [];
}

export async function apiClearSessions(studentId: string): Promise<void> {
  await request(`/api/sessions?studentId=${encodeURIComponent(studentId)}`, { method: 'DELETE' });
}

export async function apiListReports(studentId: string): Promise<BookReport[]> {
  const data = await request<{ reports: BookReport[] }>(
    `/api/reports?studentId=${encodeURIComponent(studentId)}`
  );
  return data.reports || [];
}

export async function apiSaveReport(studentId: string, report: BookReport): Promise<BookReport[]> {
  const data = await request<{ reports: BookReport[] }>('/api/reports', {
    method: 'POST',
    body: JSON.stringify({ studentId, report }),
  });
  return data.reports || [];
}

export async function apiDeleteReport(studentId: string, reportId: string): Promise<BookReport[]> {
  const data = await request<{ reports: BookReport[] }>(
    `/api/report-item?id=${encodeURIComponent(reportId)}&studentId=${encodeURIComponent(studentId)}`,
    { method: 'DELETE' }
  );
  return data.reports || [];
}

export async function apiGetLeaderboard(params: {
  schoolYear: string;
  schoolName: string;
  grade: number;
  classNum: number;
  currentStudentId?: string;
}): Promise<{ records: StudentRankRecord[]; classNums: number[] }> {
  const query = new URLSearchParams({
    schoolYear: params.schoolYear,
    schoolName: params.schoolName,
    grade: String(params.grade),
    classNum: String(params.classNum),
  });
  if (params.currentStudentId) query.set('currentStudentId', params.currentStudentId);
  const data = await request<{ records: StudentRankRecord[]; classNums?: number[] }>(
    `/api/leaderboard?${query.toString()}`
  );
  return { records: data.records || [], classNums: data.classNums || [] };
}

const ADMIN_TOKEN_KEY = 'literary_typing_admin_token';
const STUDENT_TOKEN_KEY = 'literary_typing_student_token';

export function getAdminToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(ADMIN_TOKEN_KEY) || '';
}

export function setAdminToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
  else localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export function getStudentToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(STUDENT_TOKEN_KEY) || '';
}

export function setStudentToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem(STUDENT_TOKEN_KEY, token);
  else localStorage.removeItem(STUDENT_TOKEN_KEY);
}

async function adminRequest<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  return request<T>(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${getAdminToken()}`,
      ...(init?.headers || {}),
    },
  });
}

export async function apiAdminLogin(username: string, password: string) {
  const payload = { username, password };
  try {
    const data = await request<{
      token?: string;
      role?: 'admin' | 'teacher' | 'school_admin';
      admin?: { id: string; username: string; role?: 'admin' | 'teacher' | 'school_admin'; schoolName?: string; grade?: number; classNum?: number };
    }>('/api/admin-login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (data.token) setAdminToken(data.token);
    return data;
  } catch {
    try {
      const data = await request<{
        token?: string;
        role?: 'admin' | 'teacher' | 'school_admin';
        admin?: { id: string; username: string; role?: 'admin' | 'teacher' | 'school_admin'; schoolName?: string; grade?: number; classNum?: number };
      }>('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (data.token) setAdminToken(data.token);
      return data;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '관리자 로그인에 실패했습니다.',
      };
    }
  }
}

export async function apiTeacherLogin(username: string, password: string) {
  try {
    const data = await request<{
      token?: string;
      role?: 'admin' | 'teacher' | 'school_admin';
      admin?: { id: string; username: string; role?: 'admin' | 'teacher' | 'school_admin'; schoolName?: string; grade?: number; classNum?: number };
    }>('/api/teacher-login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (data.token) setAdminToken(data.token);
    return data;
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '선생님 로그인에 실패했습니다.',
    };
  }
}

export async function apiTeacherRegister(payload: {
  schoolName: string;
  username: string;
  password: string;
  grade: number;
  classNum: number;
}) {
  try {
    return await request('/api/teacher-register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '선생님 회원가입에 실패했습니다.',
    };
  }
}

export async function apiAdminLogout(): Promise<void> {
  try {
    await adminRequest('/api/admin-logout', { method: 'POST' });
  } finally {
    setAdminToken(null);
  }
}

export async function apiAdminMe() {
  try {
    return await adminRequest<{
      admin: { id: string; username: string; role?: 'admin' | 'teacher' | 'school_admin'; schoolName?: string; grade?: number; classNum?: number };
    }>('/api/admin-me');
  } catch {
    return adminRequest<{
      admin: { id: string; username: string; role?: 'admin' | 'teacher' | 'school_admin'; schoolName?: string; grade?: number; classNum?: number };
    }>('/api/admin/me');
  }
}

export async function apiAdminOverview() {
  const data = await adminRequest<{ overview: { studentCount: number; sessionCount: number; reportCount: number } }>(
    '/api/admin-overview'
  );
  return data.overview;
}

export async function apiAdminStudents() {
  const data = await adminRequest<{
    students: Array<StudentAccount & { sessionCount: number; reportCount: number; totalChars: number }>;
  }>('/api/admin-students');
  return data.students || [];
}

export async function apiAdminDeleteStudent(id: string) {
  const data = await adminRequest<{
    students: Array<StudentAccount & { sessionCount: number; reportCount: number; totalChars: number }>;
  }>(`/api/admin-students?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  return data.students || [];
}

export async function apiAdminSessions() {
  const data = await adminRequest<{ sessions: TypingSessionResult[] }>('/api/admin-sessions');
  return data.sessions || [];
}

export async function apiAdminDeleteSession(id: string, studentId: string) {
  const data = await adminRequest<{ sessions: TypingSessionResult[] }>(
    `/api/admin-sessions?id=${encodeURIComponent(id)}&studentId=${encodeURIComponent(studentId)}`,
    { method: 'DELETE' }
  );
  return data.sessions || [];
}

export async function apiAdminReports() {
  const data = await adminRequest<{ reports: BookReport[] }>('/api/admin-reports');
  return data.reports || [];
}

export async function apiAdminDeleteReport(id: string, studentId: string) {
  const data = await adminRequest<{ reports: BookReport[] }>(
    `/api/admin-reports?id=${encodeURIComponent(id)}&studentId=${encodeURIComponent(studentId)}`,
    { method: 'DELETE' }
  );
  return data.reports || [];
}

export async function apiAdminTeachers() {
  const data = await adminRequest<{
    teachers: Array<{
      id: string;
      schoolName: string;
      username: string;
      grade: number;
      classNum: number;
      role: 'teacher' | 'school_admin';
      approved?: boolean;
      createdAt: number;
      lastLoginAt: number;
    }>;
  }>('/api/admin-teachers');
  return data.teachers || [];
}

export async function apiAdminCreateTeacher(payload: {
  schoolName: string;
  username: string;
  password: string;
  grade?: number;
  classNum?: number;
  schoolAdmin?: boolean;
}) {
  return adminRequest<{
    teachers?: Array<{
      id: string;
      schoolName: string;
      username: string;
      grade: number;
      classNum: number;
      role: 'teacher' | 'school_admin';
      approved?: boolean;
      createdAt: number;
      lastLoginAt: number;
    }>;
  }>('/api/admin-teachers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function apiAdminCreateTeachers(
  teachers: Array<{
    schoolName: string;
    username: string;
    password: string;
    grade?: number;
    classNum?: number;
    schoolAdmin?: boolean;
  }>
) {
  return adminRequest<{
    created?: number;
    failed?: string[];
    teachers?: Array<{
      id: string;
      schoolName: string;
      username: string;
      grade: number;
      classNum: number;
      role: 'teacher' | 'school_admin';
      approved?: boolean;
      createdAt: number;
      lastLoginAt: number;
    }>;
  }>('/api/admin-teachers', {
    method: 'POST',
    body: JSON.stringify({ teachers }),
  });
}

export async function apiAdminUpdateStudent(
  id: string,
  payload: {
    schoolYear?: string;
    schoolName?: string;
    grade?: number;
    classNum?: number;
    studentNum?: number;
    name?: string;
  }
) {
  const data = await adminRequest<{
    students: Array<StudentAccount & { sessionCount: number; reportCount: number; totalChars: number }>;
  }>(`/api/admin-students?id=${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return data.students || [];
}

export async function apiAdminUpdateTeacher(
  id: string,
  payload: {
    schoolName?: string;
    username?: string;
    password?: string;
    grade?: number;
    classNum?: number;
    schoolAdmin?: boolean;
    approved?: boolean;
  }
) {
  const data = await adminRequest<{
    teachers?: Array<{
      id: string;
      schoolName: string;
      username: string;
      grade: number;
      classNum: number;
      role: 'teacher' | 'school_admin';
      approved?: boolean;
      createdAt: number;
      lastLoginAt: number;
    }>;
  }>(`/api/admin-teachers?id=${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return data.teachers || [];
}

export async function apiAdminApproveTeacher(id: string) {
  return apiAdminUpdateTeacher(id, { approved: true });
}

export async function apiAdminDeleteTeacher(id: string) {
  const data = await adminRequest<{
    teachers: Array<{
      id: string;
      schoolName: string;
      username: string;
      grade: number;
      classNum: number;
      role: 'teacher' | 'school_admin';
      approved?: boolean;
      createdAt: number;
      lastLoginAt: number;
    }>;
  }>(`/api/admin-teachers?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  return data.teachers || [];
}
