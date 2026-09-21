import { mkdirSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import {
  clearSessions,
  getLeaderboard,
  listSessions,
  loginStudent,
  registerStudent,
  resetSchemaCache,
  saveSession,
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_ADMIN_USERNAME,
  loginAdmin,
  getAdminByToken,
  getAdminOverview,
} from './db';

const dbFile = path.join(process.cwd(), 'data', 'booktyping.check.sqlite');

async function main() {
  mkdirSync(path.dirname(dbFile), { recursive: true });
  try {
    unlinkSync(dbFile);
  } catch {
    // first run
  }

  process.env.SQLITE_PATH = dbFile;
  delete process.env.DATABASE_URL;
  delete process.env.POSTGRES_URL;
  resetSchemaCache();

  const created = await registerStudent({
    schoolYear: '2026학년도',
    schoolName: '가온중학교',
    grade: 2,
    classNum: 3,
    studentNum: 15,
    name: '김지민',
  });
  if (!created.success || !created.account) throw new Error(created.message);

  const duplicate = await registerStudent({
    schoolYear: '2026학년도',
    schoolName: '가온중학교',
    grade: 2,
    classNum: 3,
    studentNum: 15,
    name: '다른이름',
  });
  if (duplicate.success) throw new Error('duplicate register should fail');

  const wrongName = await loginStudent({
    schoolYear: '2026학년도',
    schoolName: '가온중학교',
    grade: 2,
    classNum: 3,
    studentNum: 15,
    name: '홍길동',
  });
  if (wrongName.success) throw new Error('wrong name login should fail');

  const login = await loginStudent({
    schoolYear: '2026학년도',
    schoolName: '가온중학교',
    grade: 2,
    classNum: 3,
    studentNum: 15,
    name: '김지민',
  });
  if (!login.success || !login.account) throw new Error(login.message);

  await saveSession(login.account.id, {
    id: 'session-1',
    timestamp: Date.now(),
    excerptId: 'yoon-seosi',
    bookTitle: '하늘과 바람과 별과 시',
    author: '윤동주',
    excerptTitle: '서시 (序詩)',
    cpm: 320,
    wpm: 64,
    peakCpm: 360,
    accuracy: 98,
    errorCount: 1,
    totalChars: 120,
    totalStrokes: 280,
    durationSeconds: 40,
    mistypedLetters: { ㄹ: 1 },
    earnedEffortPoints: 200,
  });

  const sessions = await listSessions(login.account.id);
  if (sessions.length !== 1) throw new Error(`expected 1 session, got ${sessions.length}`);

  const board = await getLeaderboard({
    schoolYear: '2026학년도',
    schoolName: '가온중학교',
    grade: 2,
    classNum: 3,
    currentStudentId: login.account.id,
  });
  if (board.length !== 1 || !board[0].isCurrentUser || board[0].totalChars !== 120) {
    throw new Error('leaderboard did not include the saved session');
  }

  await clearSessions(login.account.id);
  const emptied = await listSessions(login.account.id);
  if (emptied.length !== 0) throw new Error('sessions were not cleared');

  const adminWrong = await loginAdmin(DEFAULT_ADMIN_USERNAME, 'wrong');
  if (adminWrong.success) throw new Error('wrong admin password should fail');

  const adminOk = await loginAdmin(DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_PASSWORD);
  if (!adminOk.success || !adminOk.token) throw new Error(adminOk.message);
  const adminMe = await getAdminByToken(adminOk.token);
  if (!adminMe || adminMe.username !== DEFAULT_ADMIN_USERNAME) {
    throw new Error('signed admin token was not accepted');
  }

  const expanded = await registerStudent({
    schoolYear: '2026학년도',
    schoolName: '금구중',
    grade: 1,
    classNum: 1,
    studentNum: 1,
    name: '박민수',
  });
  if (!expanded.success || expanded.account?.schoolName !== '금구중학교') {
    throw new Error(`school short name was not expanded: ${expanded.account?.schoolName || expanded.message}`);
  }
  const expandedLogin = await loginStudent({
    schoolYear: '2026학년도',
    schoolName: '금구중',
    grade: 1,
    classNum: 1,
    studentNum: 1,
    name: '박민수',
  });
  if (!expandedLogin.success) throw new Error(expandedLogin.message);

  const overview = await getAdminOverview();
  if (overview.studentCount < 1) throw new Error('admin overview missing students');

  resetSchemaCache();
  try {
    unlinkSync(dbFile);
  } catch {
    // ignore
  }

  console.log('db check passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
