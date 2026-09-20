import express from 'express';
import {
  clearSessions,
  deleteReport,
  deleteSession,
  deleteStudentAccount,
  getAdminByToken,
  getAdminOverview,
  getLeaderboard,
  getStudentById,
  listSchoolNames,
  listAllReports,
  listAllSessions,
  listAllStudents,
  listReports,
  listSessions,
  loginAdmin,
  loginStudent,
  logoutAdmin,
  registerStudent,
  saveReport,
  saveSession,
} from './db';

const app = express();
app.use(express.json({ limit: '1mb' }));

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

async function requireAdmin(req: express.Request, res: express.Response) {
  const admin = await getAdminByToken(readToken(req));
  if (!admin) {
    res.status(401).json({ success: false, message: '관리자 로그인이 필요합니다.' });
    return null;
  }
  return admin;
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
    if (!schoolYear || !schoolName || !grade || !classNum) {
      res.status(400).json({ success: false, message: '학년도, 학교명, 학년, 반이 필요합니다.' });
      return;
    }
    const records = await getLeaderboard({
      schoolYear,
      schoolName,
      grade,
      classNum,
      currentStudentId,
    });
    res.json({ success: true, records });
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
  '/api/admin/logout',
  asyncRoute(async (req, res) => {
    await logoutAdmin(readToken(req));
    res.json({ success: true });
  })
);

app.get(
  '/api/admin/me',
  asyncRoute(async (req, res) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    res.json({ success: true, admin });
  })
);

app.get(
  '/api/admin/overview',
  asyncRoute(async (req, res) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    res.json({ success: true, overview: await getAdminOverview() });
  })
);

app.get(
  '/api/admin/students',
  asyncRoute(async (req, res) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    res.json({ success: true, students: await listAllStudents() });
  })
);

app.delete(
  '/api/admin/students/:id',
  asyncRoute(async (req, res) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    await deleteStudentAccount(req.params.id);
    res.json({ success: true, students: await listAllStudents() });
  })
);

app.get(
  '/api/admin/sessions',
  asyncRoute(async (req, res) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    res.json({ success: true, sessions: await listAllSessions() });
  })
);

app.delete(
  '/api/admin/sessions/:id',
  asyncRoute(async (req, res) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
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
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    res.json({ success: true, reports: await listAllReports() });
  })
);

app.delete(
  '/api/admin/reports/:id',
  asyncRoute(async (req, res) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const studentId = String(req.query.studentId || '');
    if (!studentId) {
      res.status(400).json({ success: false, message: 'studentId가 필요합니다.' });
      return;
    }
    await deleteReport(req.params.id, studentId);
    res.json({ success: true, reports: await listAllReports() });
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
