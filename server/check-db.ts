import { mkdirSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import {
  clearSessions,
  deleteSession,
  getLeaderboard,
  listSessions,
  loginStudent,
  registerStudent,
  approveStudent,
  resetSchemaCache,
  saveSession,
  saveReport,
  listReports,
  getTypingProgress,
  saveTypingProgress,
  clearTypingProgress,
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_ADMIN_USERNAME,
  loginAdmin,
  getAdminByToken,
  getAdminOverview,
  createTeacher,
  createTeachers,
  loginTeacher,
  listAllStudents,
  listSchoolNames,
  approveTeacher,
  updateTeacher,
  updateStudentAccount,
  deleteStudentAccount,
  getStudentById,
  createSchoolWork,
  updateSchoolWork,
  unlockSchoolWork,
  listTeachers,
  downloadSchoolWorkText,
} from './db';
import { rowsToTeachers } from '../src/utils/teacherWorkbook';
import { readStaffToken, readStudentToken, signStudentToken } from './adminAuth.js';
import { isSealed, open, seal } from './crypto.js';
import { expandSchoolName } from '../src/utils/schoolName';
import { normalizeTypingText } from '../src/utils/hangul';

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

  if (normalizeTypingText('\u201C안녕\u201D') !== '"안녕"') {
    throw new Error('curly quotes should become keyboard quotes');
  }
  if (normalizeTypingText('\u{1F65D}\u{1F65F} 비') !== '비') {
    throw new Error('broken dingbat quotes should be removed');
  }
  if (normalizeTypingText('그렇다\u2026') !== '그렇다...') {
    throw new Error('ellipsis should become three periods');
  }

  const created = await registerStudent({
    schoolYear: '2026학년도',
    schoolName: '가온중학교',
    grade: 2,
    classNum: 3,
    studentNum: 15,
    name: '김지민',
  });
  if (!created.success || !created.account) throw new Error(created.message);
  if (created.account.approved !== false) throw new Error('new student should wait for approval');

  const pendingStudentLogin = await loginStudent({
    schoolYear: '2026학년도',
    schoolName: '가온중학교',
    grade: 2,
    classNum: 3,
    studentNum: 15,
    name: '김지민',
  });
  if (pendingStudentLogin.success) throw new Error('unapproved student should not login');

  const approvedStudent = await approveStudent(created.account.id);
  if (!approvedStudent.success) throw new Error(approvedStudent.message);

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

  const updatedSameWork = await saveSession(login.account.id, {
    id: 'session-same-work',
    timestamp: Date.now() + 1,
    excerptId: 'yoon-seosi',
    bookTitle: '하늘과 바람과 별과 시',
    author: '윤동주',
    excerptTitle: '서시 (序詩)',
    cpm: 340,
    wpm: 68,
    peakCpm: 380,
    accuracy: 99,
    errorCount: 0,
    totalChars: 150,
    totalStrokes: 300,
    durationSeconds: 35,
    mistypedLetters: {},
    earnedEffortPoints: 220,
  });
  if (updatedSameWork.length !== 1 || updatedSameWork[0].id !== 'session-1') {
    throw new Error('same work should update the existing session');
  }
  if (updatedSameWork[0].totalChars !== 150 || updatedSameWork[0].accuracy !== 99) {
    throw new Error('existing session was not updated');
  }
  if (Number(updatedSameWork[0].repeatCount) !== 2) {
    throw new Error('repeat count should increase');
  }
  await saveSession(login.account.id, {
    id: 'session-low-accuracy',
    timestamp: Date.now() + 2,
    excerptId: 'yoon-byeol',
    bookTitle: '하늘과 바람과 별과 시',
    author: '윤동주',
    excerptTitle: '별 헤는 밤',
    cpm: 400,
    wpm: 80,
    peakCpm: 420,
    accuracy: 70,
    errorCount: 20,
    totalChars: 900,
    totalStrokes: 900,
    durationSeconds: 40,
    mistypedLetters: {},
    earnedEffortPoints: 10,
  });
  const boardAfterLow = await getLeaderboard({
    schoolYear: '2026학년도',
    schoolName: '가온중학교',
    grade: 2,
    classNum: 3,
    currentStudentId: login.account.id,
  });
  if (boardAfterLow[0]?.totalChars !== 105) {
    throw new Error(`accuracy below 80% should not count toward ranking: ${boardAfterLow[0]?.totalChars}`);
  }
  const afterOneDelete = await deleteSession('session-low-accuracy', login.account.id);
  if (afterOneDelete.length !== 1 || afterOneDelete[0].id !== 'session-1') {
    throw new Error('selected session was not deleted');
  }
  await saveTypingProgress(login.account.id, {
    excerptId: 'work-1',
    sentenceIndex: 4,
    userInput: '이어서',
    accumulatedCorrectStrokes: 20,
    accumulatedTotalStrokes: 22,
    accumulatedChars: 18,
    totalSessionErrors: 1,
    sessionMistypedLetters: {},
    elapsedSeconds: 30,
    peakCpm: 180,
  });
  const resumed = await getTypingProgress(login.account.id, 'work-1');
  if (!resumed || resumed.sentenceIndex !== 4 || resumed.userInput !== '이어서') {
    throw new Error('typing progress was not restored');
  }
  await clearTypingProgress(login.account.id, 'work-1');
  if (await getTypingProgress(login.account.id, 'work-1')) {
    throw new Error('typing progress was not cleared');
  }

  await clearSessions(login.account.id);
  const emptied = await listSessions(login.account.id);
  if (emptied.length !== 0) throw new Error('sessions were not cleared');

  const reportProfile = {
    schoolYear: login.account.schoolYear,
    schoolName: login.account.schoolName,
    grade: login.account.grade,
    classNum: login.account.classNum,
    studentNum: login.account.studentNum,
    name: login.account.name,
    accountId: login.account.id,
  };
  const firstReport = await saveReport(login.account.id, {
    id: 'report-first',
    createdAt: Date.now(),
    excerptId: 'work-1',
    bookTitle: '책',
    author: '작가',
    excerptTitle: '작품',
    studentProfile: reportProfile,
    cpm: 120,
    accuracy: 90,
    durationSeconds: 40,
    title: '처음 독후감',
    rating: 4,
    memorableQuote: '',
    quoteReason: '',
    content: '처음 내용',
    personalTakeaway: '',
    paragraphNotes: [],
  });
  if (firstReport.length !== 1 || firstReport[0].content !== '처음 내용') {
    throw new Error('book report was not saved');
  }
  const updatedReport = await saveReport(login.account.id, {
    id: 'report-second',
    createdAt: Date.now() + 1,
    excerptId: 'work-1',
    bookTitle: '책',
    author: '작가',
    excerptTitle: '작품',
    studentProfile: reportProfile,
    cpm: 210,
    accuracy: 95,
    durationSeconds: 30,
    title: '갱신 독후감',
    rating: 5,
    memorableQuote: '',
    quoteReason: '',
    content: '갱신된 내용',
    personalTakeaway: '',
    paragraphNotes: [],
  });
  if (updatedReport.length !== 1) {
    throw new Error(`one book should keep a single report: ${updatedReport.length}`);
  }
  if (updatedReport[0].id !== firstReport[0].id) {
    throw new Error('existing report id should be reused');
  }
  if (
    updatedReport[0].content !== '갱신된 내용' ||
    updatedReport[0].cpm !== 210 ||
    updatedReport[0].title !== '갱신 독후감'
  ) {
    throw new Error('existing report was not updated');
  }
  const listedReports = await listReports(login.account.id);
  if (listedReports.length !== 1) {
    throw new Error('listReports should return one report per book');
  }

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
  const approvedExpanded = await approveStudent(expanded.account?.id || '');
  if (!approvedExpanded.success) throw new Error(approvedExpanded.message);
  const expandedLogin = await loginStudent({
    schoolYear: '2026학년도',
    schoolName: '금구중',
    grade: 1,
    classNum: 1,
    studentNum: 1,
    name: '박민수',
  });
  if (!expandedLogin.success) throw new Error(expandedLogin.message);

  const teacherDenied = await loginTeacher(DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_PASSWORD);
  if (teacherDenied.success) throw new Error('admin credentials should not work on teacher login');

  const teacherMissingClass = await createTeacher({
    schoolName: '금구중',
    username: 'geumgu-teacher',
    password: 'class1234',
  });
  if (teacherMissingClass.success) throw new Error('homeroom teacher without grade/class should fail');

  const teacherCreated = await createTeacher({
    schoolName: '금구중',
    username: 'geumgu-teacher',
    password: 'class1234',
    grade: 1,
    classNum: 1,
  });
  if (!teacherCreated.success || teacherCreated.teacher?.schoolName !== '금구중학교' || teacherCreated.teacher.grade !== 1) {
    throw new Error(teacherCreated.message);
  }
  const teacherOk = await loginTeacher('geumgu-teacher', 'class1234');
  if (
    !teacherOk.success ||
    teacherOk.role !== 'teacher' ||
    teacherOk.admin?.schoolName !== '금구중학교' ||
    teacherOk.admin.grade !== 1 ||
    teacherOk.admin.classNum !== 1
  ) {
    throw new Error(teacherOk.message);
  }
  const teacherRows = await listAllStudents({
    schoolName: teacherOk.admin?.schoolName,
    grade: teacherOk.admin?.grade,
    classNum: teacherOk.admin?.classNum,
  });
  if (teacherRows.some((row) => row.schoolName !== '금구중학교' || row.grade !== 1 || row.classNum !== 1)) {
    throw new Error('teacher class scope leaked other students');
  }

  const teacherEdited = await updateTeacher(teacherCreated.teacher?.id || '', {
    username: 'geumgu-homeroom',
    password: 'class5678',
    schoolName: '금구중',
  });
  if (!teacherEdited.success) throw new Error(teacherEdited.message);
  const teacherRenamedLogin = await loginTeacher('geumgu-homeroom', 'class5678');
  if (!teacherRenamedLogin.success || teacherRenamedLogin.admin?.schoolName !== '금구중학교') {
    throw new Error(teacherRenamedLogin.message);
  }
  const blockedMove = await updateTeacher(
    teacherCreated.teacher?.id || '',
    { schoolName: '가온중' },
    '금구중학교'
  );
  if (blockedMove.success) throw new Error('school admin should not move a teacher to another school');

  const studentTok = signStudentToken('student-1');
  if (readStudentToken(studentTok)?.studentId !== 'student-1') throw new Error('student token did not round-trip');
  if (readStaffToken(studentTok)) throw new Error('student token must not be accepted as staff');

  const schoolAdminCreated = await createTeacher({
    schoolName: '금구중',
    username: 'geumgu-admin',
    password: 'admin1234',
    schoolAdmin: true,
  });
  if (!schoolAdminCreated.success || schoolAdminCreated.teacher?.role !== 'school_admin') {
    throw new Error(schoolAdminCreated.message);
  }
  const schoolAdminOk = await loginTeacher('geumgu-admin', 'admin1234');
  if (!schoolAdminOk.success || schoolAdminOk.role !== 'school_admin' || schoolAdminOk.admin?.schoolName !== '금구중학교') {
    throw new Error(schoolAdminOk.message);
  }
  const schoolAdminRows = await listAllStudents({ schoolName: schoolAdminOk.admin?.schoolName });
  if (schoolAdminRows.some((row) => row.schoolName !== '금구중학교')) {
    throw new Error('school admin scope leaked other schools');
  }

  const otherClass = await registerStudent({
    schoolYear: '2026학년도',
    schoolName: '금구중',
    grade: 1,
    classNum: 2,
    studentNum: 1,
    name: '최하나',
  });
  if (!otherClass.success || !otherClass.account) throw new Error(otherClass.message);
  const teacherStillScoped = await listAllStudents({
    schoolName: '금구중학교',
    grade: 1,
    classNum: 1,
  });
  if (teacherStillScoped.some((row) => row.classNum !== 1)) {
    throw new Error('homeroom teacher saw another class');
  }

  const renamed = await updateStudentAccount(
    expanded.account?.id || '',
    { name: '박민수수정', classNum: 3, studentNum: 8 },
    '금구중학교'
  );
  if (!renamed.success || renamed.account?.name !== '박민수수정' || renamed.account.classNum !== 3) {
    throw new Error(renamed.message);
  }
  const renamedLogin = await loginStudent({
    schoolYear: '2026학년도',
    schoolName: '금구중',
    grade: 1,
    classNum: 3,
    studentNum: 8,
    name: '박민수수정',
  });
  if (!renamedLogin.success) throw new Error(renamedLogin.message);
  const blockedSchool = await updateStudentAccount(renamed.account?.id || '', { name: '차단' }, '다른학교');
  if (blockedSchool.success) throw new Error('school admin of another school should not edit student');

  const pending = await createTeacher({
    schoolName: '금구중',
    username: 'pending-teacher',
    password: 'wait1234',
    grade: 2,
    classNum: 3,
    approved: false,
  });
  if (!pending.success || pending.teacher?.approved) {
    throw new Error(pending.message || 'pending teacher should not be approved');
  }
  const pendingLogin = await loginTeacher('pending-teacher', 'wait1234');
  if (pendingLogin.success) throw new Error('unapproved teacher should not login');
  if (!pendingLogin.message.includes('승인')) throw new Error(pendingLogin.message);
  const approvedTeacher = await approveTeacher(pending.teacher?.id || '');
  if (!approvedTeacher.success) throw new Error(approvedTeacher.message);
  const pendingOk = await loginTeacher('pending-teacher', 'wait1234');
  if (!pendingOk.success) throw new Error(pendingOk.message);

  const moved = await updateStudentAccount(
    renamed.account?.id || '',
    { schoolName: '가온중', schoolYear: '2027학년도' },
    '금구중학교'
  );
  if (!moved.success || moved.account?.schoolName !== '가온중학교' || moved.account.schoolYear !== '2027학년도') {
    throw new Error(moved.message);
  }
  const movedLogin = await loginStudent({
    schoolYear: '2027학년도',
    schoolName: '가온중',
    grade: 1,
    classNum: 3,
    studentNum: 8,
    name: '박민수수정',
  });
  if (!movedLogin.success) throw new Error(movedLogin.message);

  const batch = await createTeachers([
    {
      schoolName: '가온중',
      username: 'gaon1',
      password: 'pass1234',
      grade: 2,
      classNum: 3,
    },
    {
      schoolName: '가온중',
      username: 'gaon-admin',
      password: 'pass1234',
      schoolAdmin: true,
    },
  ]);
  if (!batch.success || batch.created !== 2) throw new Error(batch.message);
  const names = await listSchoolNames();
  if (!names.includes('금구중학교') || !names.includes('가온중학교')) {
    throw new Error(`school names missing: ${names.join(',')}`);
  }
  await deleteStudentAccount(otherClass.account.id);

  const sealedName = seal('학생이름');
  if (!isSealed(sealedName) || open(sealedName) !== '학생이름' || seal('학생이름') !== sealedName) {
    throw new Error('stored values must round-trip through deterministic encryption');
  }
  if (
    expandSchoolName('금구중') !== '금구중학교' ||
    expandSchoolName('가온초') !== '가온초등학교' ||
    expandSchoolName('가온고') !== '가온고등학교'
  ) {
    throw new Error('school short names should expand only by appending 학교/등학교');
  }

  const lockStudent = await registerStudent({
    schoolYear: '2026학년도',
    schoolName: '가온중학교',
    grade: 3,
    classNum: 1,
    studentNum: 99,
    name: '잠금학생',
  });
  if (!lockStudent.success || !lockStudent.account) throw new Error(lockStudent.message);
  const approvedLock = await approveStudent(lockStudent.account.id);
  if (!approvedLock.success) throw new Error(approvedLock.message);
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const fail = await loginStudent({
      schoolYear: '2026학년도',
      schoolName: '가온중학교',
      grade: 3,
      classNum: 1,
      studentNum: 99,
      name: '틀린이름',
    });
    if (fail.success) throw new Error('wrong student name should fail');
    if (attempt < 5 && !fail.message.includes('남은 횟수')) throw new Error(fail.message);
    if (attempt === 5 && !fail.message.includes('잠겨')) throw new Error(fail.message);
  }
  if (!(await getStudentById(lockStudent.account.id))) {
    throw new Error('student should remain after 5 failed logins');
  }
  const stillLocked = await loginStudent({
    schoolYear: '2026학년도',
    schoolName: '가온중학교',
    grade: 3,
    classNum: 1,
    studentNum: 99,
    name: '잠금학생',
  });
  if (stillLocked.success) throw new Error('locked student should not log in yet');
  const unlocked = await updateStudentAccount(lockStudent.account.id, { name: '잠금해제' });
  if (!unlocked.success) throw new Error(unlocked.message);
  const afterUnlock = await loginStudent({
    schoolYear: '2026학년도',
    schoolName: '가온중학교',
    grade: 3,
    classNum: 1,
    studentNum: 99,
    name: '잠금해제',
  });
  if (!afterUnlock.success) throw new Error(afterUnlock.message);

  const lockTeacher = await createTeacher({
    schoolName: '가온중',
    username: 'lock-teacher',
    password: 'pass1234',
    grade: 1,
    classNum: 1,
  });
  if (!lockTeacher.success) throw new Error(lockTeacher.message);
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const fail = await loginTeacher('lock-teacher', 'wrong-pass');
    if (fail.success) throw new Error('wrong teacher password should fail');
  }
  const deletedTeacherLogin = await loginTeacher('lock-teacher', 'pass1234');
  if (deletedTeacherLogin.success) throw new Error('teacher should stay locked after 5 failed logins');

  const parsedTeachers = rowsToTeachers([
    ['학교명', '아이디', '비밀번호', '학년', '반', '구분'],
    ['금구중', 'excel1', 'pass1234', '2', '4', '담임교사'],
    ['금구중', 'excel-admin', 'pass1234', '', '', '학교최고관리자'],
  ]);
  if (
    parsedTeachers.length !== 2 ||
    parsedTeachers[0].schoolName !== '금구중학교' ||
    parsedTeachers[0].grade !== 2 ||
    parsedTeachers[0].classNum !== 4 ||
    parsedTeachers[1].schoolAdmin !== true
  ) {
    throw new Error('excel teacher rows were not parsed');
  }

  const overview = await getAdminOverview();
  if (overview.studentCount < 1) throw new Error('admin overview missing students');

  const uploaded = await createSchoolWork({
    schoolName: '가온중학교',
    teacherUsername: 'lock-teacher',
    title: '우리반 글',
    author: '담임',
    password: 'open-sesame',
    text: '첫 문장입니다.\n두 번째 문장입니다.',
  });
  if (!uploaded.success || !uploaded.works?.[0]) throw new Error(uploaded.message);
  const wrongUnlock = await unlockSchoolWork(uploaded.works[0].id, 'nope');
  if (wrongUnlock.success) throw new Error('wrong work password should fail');
  const opened = await unlockSchoolWork(uploaded.works[0].id, 'open-sesame');
  if (!opened.success || opened.book?.sentences.length !== 2) throw new Error('school work did not unlock');
  const downloaded = await downloadSchoolWorkText(uploaded.works[0].id);
  if (!downloaded.success || downloaded.text !== '첫 문장입니다.\n두 번째 문장입니다.') {
    throw new Error(downloaded.message || 'school work download failed');
  }
  const edited = await updateSchoolWork(uploaded.works[0].id, '가온중학교', { text: '고친 문장입니다.' });
  if (!edited.success) throw new Error(edited.message || 'school work edit failed');
  const reopened = await unlockSchoolWork(uploaded.works[0].id, 'open-sesame');
  if (!reopened.success || reopened.book?.sentences.join('\n') !== '고친 문장입니다.') {
    throw new Error('school work text was not updated');
  }
  const noTeacherDump = await listTeachers();
  if (noTeacherDump.length !== 0) throw new Error('teacher list should stay empty until search filters are set');
  const byUsernameOnly = await listTeachers(undefined, { username: 'geumgu-homeroom' });
  if (!byUsernameOnly.some((row) => row.username === 'geumgu-homeroom')) {
    throw new Error('teacher lookup should work without school name');
  }
  const bySchoolScope = await listTeachers('금구중학교');
  if (!bySchoolScope.some((row) => row.username === 'geumgu-homeroom')) {
    throw new Error('school-scoped teacher list should not require extra filters');
  }

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
