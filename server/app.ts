import express from 'express';
import {
  clearSessions,
  createTeacher,
  createTeachers,
  deleteReport,
  deleteSession,
  deleteStudentAccount,
  deleteTeacher,
  getAdminByToken,
  getAdminOverview,
  getLeaderboard,
  getStudentById,
  listClassNumbers,
  listSchoolNames,
  listAllReports,
  listAllSessions,
  listAllStudents,
  listReports,
  listSessions,
  listTeachers,
  loginAdmin,
  loginStudent,
  loginTeacher,
  logoutAdmin,
  registerStudent,
  registerTeacher,
  approveTeacher,
  saveReport,
  saveSession,
  updateStudentAccount,
  type AdminAccount,
} from './db';

function isParsedObject(body: unknown): body is Record<string, unknown> {
  return Boolean(body && typeof body === 'object' && !Buffer.isBuffer(body) && Object.keys(body).length > 0);
}

function parseJsonBody(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    next();
    return;
  }

  if (isParsedObject(req.body)) {
    next();
    return;
  }

  if (Buffer.isBuffer(req.body) || typeof req.body === 'string') {
    try {
      const raw = String(req.body || '').trim();
      req.body = raw ? JSON.parse(raw) : {};
      next();
    } catch {
      res.status(400).json({ success: false, message: '요청 본문을 읽지 못했습니다.' });
    }
    return;
  }

  express.json({ limit: '1mb' })(req, res, next);
}

const app = express();

app.use((req, _res, next) => {
  const url = req.url || '';
  const parsed = new URL(url, 'http://localhost');
  const aliases: Record<string, string> = {
    '/api/student-login': '/api/students/login',
    '/api/admin-overview': '/api/admin/overview',
    '/api/admin-students': '/api/admin/students',
    '/api/admin-sessions': '/api/admin/sessions',
    '/api/admin-reports': '/api/admin/reports',
    '/api/admin-teachers': '/api/admin/teachers',
    '/api/admin-logout': '/api/admin/logout',
    '/api/session-item': '/api/sessions',
    '/api/report-item': '/api/reports',
    '/api/teacher-register': '/api/teachers/register',
  };
  const mapped = aliases[parsed.pathname];
  if (mapped) {
    const id = parsed.searchParams.get('id');
    parsed.searchParams.delete('id');
    parsed.pathname = id ? `${mapped}/${id}` : mapped;
    req.url = `${parsed.pathname}${parsed.search}`;
  } else {
    const pathOnly = url.split('?')[0];
    if (pathOnly === '/admin' || pathOnly.startsWith('/admin/')) {
      req.url = `/api${url.startsWith('/') ? url : `/${url}`}`;
    }
  }
  next();
});

app.use(parseJsonBody);

function asyncRoute(
  handler: (req: express.Request, res: express.Response) => Promise<void>
) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    handler(req, res).catch(next);
  };
}

function readToken(req: express.Request): string {
  return String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
}

async function requireStaff(req: express.Request, res: express.Response) {
  const staff = await getAdminByToken(readToken(req));
  if (!staff) {
    res.status(401).json({ success: false, message: '관리자 로그인이 필요합니다.' });
    return null;
  }
  if ((staff.role === 'teacher' || staff.role === 'school_admin') && !staff.schoolName) {
    res.status(403).json({ success: false, message: '학교 정보가 없는 선생님 계정입니다.' });
    return null;
  }
  return staff;
}

async function requireAdminOnly(req: express.Request, res: express.Response) {
  const staff = await requireStaff(req, res);
  if (!staff) return null;
  if (staff.role !== 'admin') {
    res.status(403).json({ success: false, message: '관리자만 할 수 있습니다.' });
    return null;
  }
  return staff;
}

async function requireStudentEditor(req: express.Request, res: express.Response) {
  const staff = await requireStaff(req, res);
  if (!staff) return null;
  if (staff.role !== 'admin' && staff.role !== 'school_admin') {
    res.status(403).json({ success: false, message: '학교 최고관리자만 학생 정보를 수정할 수 있습니다.' });
    return null;
  }
  return staff;
}

function staffScope(staff: AdminAccount) {
  if (staff.role === 'admin') return {};
  return {
    schoolName: staff.schoolName,
    grade: staff.role === 'teacher' ? staff.grade : 0,
    classNum: staff.role === 'teacher' ? staff.classNum : 0,
  };
}

app.get(
  '/api/health',
  asyncRoute(async (_req, res) => {
    res.json({ ok: true });
  })
);

app.get(
  '/api/schools',
  asyncRoute(async (_req, res) => {
    res.json({ success: true, schools: await listSchoolNames() });
  })
);

app.post(
  '/api/students',
  asyncRoute(async (req, res) => {
    const result = await registerStudent(req.body || {});
    res.status(result.success ? 200 : 400).json(result);
  })
);

app.post(
  '/api/students/login',
  asyncRoute(async (req, res) => {
    const result = await loginStudent(req.body || {});
    res.status(result.success ? 200 : 400).json(result);
  })
);

app.get(
  '/api/sessions',
  asyncRoute(async (req, res) => {
    const studentId = String(req.query.studentId || '');
    if (!studentId) {
      res.status(400).json({ success: false, message: 'studentId가 필요합니다.' });
      return;
    }
    if (!(await getStudentById(studentId))) {
      res.status(404).json({ success: false, message: '학생 계정을 찾을 수 없습니다.' });
      return;
    }
    res.json({ success: true, sessions: await listSessions(studentId) });
  })
);

app.post(
  '/api/sessions',
  asyncRoute(async (req, res) => {
    const studentId = String(req.body?.studentId || '');
    const result = req.body?.result;
    if (!studentId || !result?.id) {
      res.status(400).json({ success: false, message: 'studentId와 세션 결과가 필요합니다.' });
      return;
    }
    if (!(await getStudentById(studentId))) {
      res.status(404).json({ success: false, message: '학생 계정을 찾을 수 없습니다.' });
      return;
    }
    const sessions = await saveSession(studentId, result);
    res.json({ success: true, sessions });
  })
);

app.delete(
  '/api/sessions/:id',
  asyncRoute(async (req, res) => {
    const studentId = String(req.query.studentId || '');
    if (!studentId) {
      res.status(400).json({ success: false, message: 'studentId가 필요합니다.' });
      return;
    }
    const sessions = await deleteSession(req.params.id, studentId);
    res.json({ success: true, sessions });
  })
);

app.delete(
  '/api/sessions',
  asyncRoute(async (req, res) => {
    const studentId = String(req.query.studentId || '');
    if (!studentId) {
      res.status(400).json({ success: false, message: 'studentId가 필요합니다.' });
      return;
    }
    await clearSessions(studentId);
    res.json({ success: true, sessions: [] });
  })
);

app.get(
  '/api/reports',
  asyncRoute(async (req, res) => {
    const studentId = String(req.query.studentId || '');
    if (!studentId) {
      res.status(400).json({ success: false, message: 'studentId가 필요합니다.' });
      return;
    }
    res.json({ success: true, reports: await listReports(studentId) });
  })
);

app.post(
  '/api/reports',
  asyncRoute(async (req, res) => {
    const studentId = String(req.body?.studentId || '');
    const report = req.body?.report;
    if (!studentId || !report?.id) {
      res.status(400).json({ success: false, message: 'studentId와 독후감이 필요합니다.' });
      return;
    }
    if (!(await getStudentById(studentId))) {
      res.status(404).json({ success: false, message: '학생 계정을 찾을 수 없습니다.' });
      return;
    }
    const reports = await saveReport(studentId, report);
    res.json({ success: true, reports });
  })
);

app.delete(
  '/api/reports/:id',
  asyncRoute(async (req, res) => {
    const studentId = String(req.query.studentId || '');
    if (!studentId) {
      res.status(400).json({ success: false, message: 'studentId가 필요합니다.' });
      return;
    }
    const reports = await deleteReport(req.params.id, studentId);
    res.json({ success: true, reports });
  })
);

app.get(
  '/api/leaderboard',
  asyncRoute(async (req, res) => {
    const schoolYear = String(req.query.schoolYear || '').trim();
    const schoolName = String(req.query.schoolName || '').trim();
    const grade = Number(req.query.grade);
    const classNum = Number(req.query.classNum);
    const currentStudentId = String(req.query.currentStudentId || '');
    if (!schoolYear || !schoolName || !grade) {
      res.status(400).json({ success: false, message: '학년도, 학교명, 학년이 필요합니다.' });
      return;
    }
    const records = await getLeaderboard({
      schoolYear,
      schoolName,
      grade,
      classNum: Number.isFinite(classNum) ? classNum : 0,
      currentStudentId,
    });
    const classNums = await listClassNumbers({ schoolYear, schoolName, grade });
    res.json({ success: true, records, classNums });
  })
);

app.post(
  '/api/admin/login',
  asyncRoute(async (req, res) => {
    const result = await loginAdmin(String(req.body?.username || ''), String(req.body?.password || ''));
    res.status(result.success ? 200 : 401).json(result);
  })
);

app.post(
  '/api/teacher-login',
  asyncRoute(async (req, res) => {
    const result = await loginTeacher(String(req.body?.username || ''), String(req.body?.password || ''));
    res.status(result.success ? 200 : 401).json(result);
  })
);

app.post(
  '/api/teacher-register',
  asyncRoute(async (req, res) => {
    const result = await registerTeacher({
      schoolName: String(req.body?.schoolName || ''),
      username: String(req.body?.username || ''),
      password: String(req.body?.password || ''),
      grade: Number(req.body?.grade || 0),
      classNum: Number(req.body?.classNum || 0),
    });
    res.status(result.success ? 200 : 400).json(result);
  })
);

app.post(
  '/api/teachers/register',
  asyncRoute(async (req, res) => {
    const result = await registerTeacher({
      schoolName: String(req.body?.schoolName || ''),
      username: String(req.body?.username || ''),
      password: String(req.body?.password || ''),
      grade: Number(req.body?.grade || 0),
      classNum: Number(req.body?.classNum || 0),
    });
    res.status(result.success ? 200 : 400).json(result);
  })
);

app.post(
  '/api/admin-login',
  asyncRoute(async (req, res) => {
    const result = await loginAdmin(String(req.body?.username || ''), String(req.body?.password || ''));
    res.status(result.success ? 200 : 401).json(result);
  })
);

app.post(
  '/api/admin/logout',
  asyncRoute(async (req, res) => {
    await logoutAdmin(readToken(req));
    res.json({ success: true });
  })
);

app.get(
  '/api/admin/me',
  asyncRoute(async (req, res) => {
    const staff = await requireStaff(req, res);
    if (!staff) return;
    res.json({ success: true, admin: staff });
  })
);

app.get(
  '/api/admin-me',
  asyncRoute(async (req, res) => {
    const staff = await requireStaff(req, res);
    if (!staff) return;
    res.json({ success: true, admin: staff });
  })
);

app.get(
  '/api/admin/overview',
  asyncRoute(async (req, res) => {
    const staff = await requireStaff(req, res);
    if (!staff) return;
    res.json({ success: true, overview: await getAdminOverview(staffScope(staff)) });
  })
);

app.get(
  '/api/admin/students',
  asyncRoute(async (req, res) => {
    const staff = await requireStaff(req, res);
    if (!staff) return;
    res.json({ success: true, students: await listAllStudents(staffScope(staff)) });
  })
);

app.delete(
  '/api/admin/students/:id',
  asyncRoute(async (req, res) => {
    const staff = await requireStudentEditor(req, res);
    if (!staff) return;
    const student = await getStudentById(req.params.id);
    if (!student) {
      res.status(404).json({ success: false, message: '학생 계정을 찾을 수 없습니다.' });
      return;
    }
    if (staff.role === 'school_admin' && student.schoolName !== staff.schoolName) {
      res.status(403).json({ success: false, message: '해당 학교 학생만 삭제할 수 있습니다.' });
      return;
    }
    await deleteStudentAccount(req.params.id);
    res.json({ success: true, students: await listAllStudents(staffScope(staff)) });
  })
);

app.patch(
  '/api/admin/students/:id',
  asyncRoute(async (req, res) => {
    const staff = await requireStudentEditor(req, res);
    if (!staff) return;
    const result = await updateStudentAccount(
      req.params.id,
      {
        schoolYear: req.body?.schoolYear,
        schoolName: req.body?.schoolName,
        grade: req.body?.grade,
        classNum: req.body?.classNum,
        studentNum: req.body?.studentNum,
        name: req.body?.name,
      },
      staff.role === 'school_admin' ? staff.schoolName : undefined
    );
    res.status(result.success ? 200 : 400).json({
      ...result,
      students: result.success ? await listAllStudents(staffScope(staff)) : undefined,
    });
  })
);

app.get(
  '/api/admin/sessions',
  asyncRoute(async (req, res) => {
    const staff = await requireStaff(req, res);
    if (!staff) return;
    res.json({ success: true, sessions: await listAllSessions(200, staffScope(staff)) });
  })
);

app.delete(
  '/api/admin/sessions/:id',
  asyncRoute(async (req, res) => {
    const staff = await requireAdminOnly(req, res);
    if (!staff) return;
    const studentId = String(req.query.studentId || '');
    if (!studentId) {
      res.status(400).json({ success: false, message: 'studentId가 필요합니다.' });
      return;
    }
    await deleteSession(req.params.id, studentId);
    res.json({ success: true, sessions: await listAllSessions() });
  })
);

app.get(
  '/api/admin/reports',
  asyncRoute(async (req, res) => {
    const staff = await requireStaff(req, res);
    if (!staff) return;
    res.json({ success: true, reports: await listAllReports(200, staffScope(staff)) });
  })
);

app.delete(
  '/api/admin/reports/:id',
  asyncRoute(async (req, res) => {
    const staff = await requireAdminOnly(req, res);
    if (!staff) return;
    const studentId = String(req.query.studentId || '');
    if (!studentId) {
      res.status(400).json({ success: false, message: 'studentId가 필요합니다.' });
      return;
    }
    await deleteReport(req.params.id, studentId);
    res.json({ success: true, reports: await listAllReports() });
  })
);

app.get(
  '/api/admin/teachers',
  asyncRoute(async (req, res) => {
    const staff = await requireAdminOnly(req, res);
    if (!staff) return;
    res.json({ success: true, teachers: await listTeachers() });
  })
);

app.post(
  '/api/admin/teachers',
  asyncRoute(async (req, res) => {
    const staff = await requireAdminOnly(req, res);
    if (!staff) return;
    const rows = Array.isArray(req.body?.teachers) ? req.body.teachers : null;
    if (rows) {
      const result = await createTeachers(
        rows.map((row: Record<string, unknown>) => ({
          schoolName: String(row.schoolName || ''),
          username: String(row.username || ''),
          password: String(row.password || ''),
          grade: Number(row.grade || 0),
          classNum: Number(row.classNum || 0),
          schoolAdmin: Boolean(row.schoolAdmin),
        }))
      );
      res.status(result.success ? 200 : 400).json(result);
      return;
    }
    const result = await createTeacher({
      schoolName: String(req.body?.schoolName || ''),
      username: String(req.body?.username || ''),
      password: String(req.body?.password || ''),
      grade: Number(req.body?.grade || 0),
      classNum: Number(req.body?.classNum || 0),
      schoolAdmin: Boolean(req.body?.schoolAdmin),
    });
    res.status(result.success ? 200 : 400).json({
      ...result,
      teachers: result.success ? await listTeachers() : undefined,
    });
  })
);

app.patch(
  '/api/admin/teachers/:id',
  asyncRoute(async (req, res) => {
    const staff = await requireAdminOnly(req, res);
    if (!staff) return;
    if (req.body?.approved !== true && req.body?.approved !== 1) {
      res.status(400).json({ success: false, message: '승인 여부만 변경할 수 있습니다.' });
      return;
    }
    const result = await approveTeacher(req.params.id);
    res.status(result.success ? 200 : 400).json(result);
  })
);

app.delete(
  '/api/admin/teachers/:id',
  asyncRoute(async (req, res) => {
    const staff = await requireAdminOnly(req, res);
    if (!staff) return;
    res.json({ success: true, teachers: await deleteTeacher(req.params.id) });
  })
);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({
    success: false,
    message: error instanceof Error ? error.message : '서버 오류가 발생했습니다.',
  });
});

export default app;
