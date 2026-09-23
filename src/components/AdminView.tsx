import React, { useEffect, useMemo, useState } from 'react';
import {
  LogOut,
  Users,
  Keyboard,
  FileText,
  ArrowLeft,
  Trash2,
  Lock,
  LayoutDashboard,
  UserPlus,
  Pencil,
  Upload,
  Check,
  BookOpen,
} from 'lucide-react';
import { BookReport, StudentAccount, TypingSessionResult } from '../types';
import {
  apiAdminCreateTeacher,
  apiAdminCreateTeachers,
  apiAdminApproveTeacher,
  apiAdminDeleteReport,
  apiAdminDeleteSessions,
  apiAdminDeleteStudent,
  apiAdminDeleteTeacher,
  apiAdminLogin,
  apiAdminLogout,
  apiAdminMe,
  apiAdminOverview,
  apiAdminReports,
  apiAdminSessions,
  apiAdminStudents,
  apiAdminTeachers,
  apiAdminUpdateStudent,
  apiAdminUpdateTeacher,
  apiListSchools,
  apiTeacherLogin,
  apiTeacherRegister,
  getAdminToken,
  setAdminToken,
} from '../utils/dbClient';
import { expandSchoolName } from '../utils/schoolName';
import { parseTeacherSpreadsheet, TEACHER_CSV_TEMPLATE } from '../utils/teacherWorkbook';
import { SchoolNameField } from './SchoolNameField';

type AdminTab = 'overview' | 'students' | 'sessions' | 'reports' | 'teachers';
type StaffRole = 'admin' | 'teacher' | 'school_admin';
type LoginMode = 'admin' | 'teacher';
type AdminStudent = StudentAccount & { sessionCount: number; reportCount: number; totalChars: number };
type TeacherRow = {
  id: string;
  schoolName: string;
  username: string;
  grade: number;
  classNum: number;
  role: 'teacher' | 'school_admin';
  approved?: boolean;
  createdAt: number;
  lastLoginAt: number;
};

const SCHOOL_YEAR_OPTIONS = ['2026학년도', '2027학년도', '2028학년도', '2029학년도', '2030학년도'];

interface AdminViewProps {
  onBack: () => void;
  loginMode?: LoginMode;
  onBrowseStudentView?: (staff: {
    username: string;
    role: StaffRole;
    schoolName: string;
    grade: number;
    classNum: number;
  }) => void;
  onStaffLogout?: () => void;
}

function asStaffRole(role?: string): StaffRole {
  if (role === 'teacher' || role === 'school_admin') return role;
  return 'admin';
}

function sessionRecordKey(session: TypingSessionResult): string {
  return `${session.id}\t${session.studentProfile?.accountId || ''}`;
}

function parseFilterNum(value: string): number {
  const n = Number(value.trim());
  return Number.isInteger(n) && n > 0 ? n : 0;
}

function classLabel(person?: { grade?: number; classNum?: number; studentNum?: number } | null): string {
  if (!person?.grade) return '-';
  return `${person.grade}학년 ${person.classNum}반 ${person.studentNum}번`;
}

function formatSessionWhen(timestamp: number): string {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '-';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}.${m}.${d} ${h}:${min}`;
}

function matchesRoster(
  person: { name?: string; grade?: number; classNum?: number; studentNum?: number } | undefined,
  filters: { grade: string; classNum: string; studentNum: string; text: string },
  extraText = ''
): boolean {
  const grade = parseFilterNum(filters.grade);
  const classNum = parseFilterNum(filters.classNum);
  const studentNum = parseFilterNum(filters.studentNum);
  if (grade && person?.grade !== grade) return false;
  if (classNum && person?.classNum !== classNum) return false;
  if (studentNum && person?.studentNum !== studentNum) return false;
  const q = filters.text.trim();
  if (!q) return true;
  return `${person?.name || ''} ${classLabel(person)} ${extraText}`.includes(q);
}

export const AdminView: React.FC<AdminViewProps> = ({ onBack, loginMode = 'admin', onBrowseStudentView, onStaffLogout }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [adminName, setAdminName] = useState<string | null>(null);
  const [staffRole, setStaffRole] = useState<StaffRole>('admin');
  const [staffSchool, setStaffSchool] = useState('');
  const [staffGrade, setStaffGrade] = useState(0);
  const [staffClassNum, setStaffClassNum] = useState(0);
  const [teacherFormMode, setTeacherFormMode] = useState<'login' | 'register'>('login');
  const [signupSchool, setSignupSchool] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupGrade, setSignupGrade] = useState('1');
  const [signupClassNum, setSignupClassNum] = useState('1');
  const [loading, setLoading] = useState(Boolean(getAdminToken()));
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<AdminTab>('overview');
  const [query, setQuery] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterClassNum, setFilterClassNum] = useState('');
  const [filterStudentNum, setFilterStudentNum] = useState('');
  const [overview, setOverview] = useState({ studentCount: 0, sessionCount: 0, reportCount: 0 });
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [sessions, setSessions] = useState<TypingSessionResult[]>([]);
  const [selectedSessionKeys, setSelectedSessionKeys] = useState<string[]>([]);
  const [reports, setReports] = useState<BookReport[]>([]);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [schools, setSchools] = useState<string[]>([]);
  const [teacherSchool, setTeacherSchool] = useState('');
  const [teacherUsername, setTeacherUsername] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [teacherGrade, setTeacherGrade] = useState('1');
  const [teacherClassNum, setTeacherClassNum] = useState('1');
  const [teacherIsSchoolAdmin, setTeacherIsSchoolAdmin] = useState(false);
  const [teacherMessage, setTeacherMessage] = useState<string | null>(null);
  const [uploadingTeachers, setUploadingTeachers] = useState(false);
  const [editingStudent, setEditingStudent] = useState<AdminStudent | null>(null);
  const [editGrade, setEditGrade] = useState('1');
  const [editClassNum, setEditClassNum] = useState('1');
  const [editStudentNum, setEditStudentNum] = useState('1');
  const [editName, setEditName] = useState('');
  const [editSchoolYear, setEditSchoolYear] = useState('2026학년도');
  const [editSchoolName, setEditSchoolName] = useState('');
  const [editMessage, setEditMessage] = useState<string | null>(null);
  const [savingStudent, setSavingStudent] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherRow | null>(null);
  const [editTeacherSchool, setEditTeacherSchool] = useState('');
  const [editTeacherUsername, setEditTeacherUsername] = useState('');
  const [editTeacherPassword, setEditTeacherPassword] = useState('');
  const [editTeacherGrade, setEditTeacherGrade] = useState('1');
  const [editTeacherClassNum, setEditTeacherClassNum] = useState('1');
  const [editTeacherSchoolAdmin, setEditTeacherSchoolAdmin] = useState(false);
  const [editTeacherMessage, setEditTeacherMessage] = useState<string | null>(null);
  const [savingTeacher, setSavingTeacher] = useState(false);

  const isAdmin = staffRole === 'admin';
  const canManageTeachers = staffRole === 'admin' || staffRole === 'school_admin';
  const canEditStudents = staffRole === 'admin' || staffRole === 'school_admin';
  const consoleTitle =
    staffRole === 'admin' ? '관리자 콘솔' : staffRole === 'school_admin' ? '학교 최고관리자 콘솔' : '담임교사 콘솔';

  const loadDashboard = async (role: StaffRole = staffRole) => {
    const [nextOverview, nextStudents, nextSessions, nextReports, nextSchools] = await Promise.all([
      apiAdminOverview(),
      apiAdminStudents(),
      apiAdminSessions(),
      apiAdminReports(),
      apiListSchools(),
    ]);
    setOverview(nextOverview);
    setStudents(nextStudents);
    setSessions(nextSessions);
    setReports(nextReports);
    setSchools(nextSchools);
    if (role === 'admin' || role === 'school_admin') {
      setTeachers(await apiAdminTeachers());
    } else {
      setTeachers([]);
    }
  };

  useEffect(() => {
    void apiListSchools().then(setSchools);
  }, []);

  useEffect(() => {
    if (!getAdminToken()) {
      setLoading(false);
      return;
    }
    void apiAdminMe()
      .then(async (data) => {
        const nextRole = asStaffRole(data.admin.role);
        setAdminName(data.admin.username);
        setStaffRole(nextRole);
        setStaffSchool(data.admin.schoolName || '');
        setStaffGrade(Number(data.admin.grade || 0));
        setStaffClassNum(Number(data.admin.classNum || 0));
        await loadDashboard(nextRole);
      })
      .catch(() => {
        setAdminToken(null);
        setAdminName(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    const nextUsername = (username || String(form.get('username') || '')).trim();
    const nextPassword = password || String(form.get('password') || '');
    try {
      const result = loginMode === 'teacher' ? await apiTeacherLogin(nextUsername, nextPassword) : await apiAdminLogin(nextUsername, nextPassword);
      if (!result.success || !result.admin) {
        setError(result.message || '로그인에 실패했습니다.');
        return;
      }
      const nextRole = asStaffRole(result.admin.role || result.role);
      if (loginMode === 'teacher' && nextRole === 'admin') {
        setAdminToken(null);
        setError('선생님 계정으로 로그인해 주세요.');
        return;
      }
      setAdminName(result.admin.username);
      setStaffRole(nextRole);
      setStaffSchool(result.admin.schoolName || '');
      setStaffGrade(Number(result.admin.grade || 0));
      setStaffClassNum(Number(result.admin.classNum || 0));
      setPassword('');
      try {
        await loadDashboard(nextRole);
      } catch (err) {
        setError(err instanceof Error ? err.message : '관리자 데이터를 불러오지 못했습니다.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await apiAdminLogout();
    setAdminName(null);
    setStaffRole('admin');
    setStaffSchool('');
    setStaffGrade(0);
    setStaffClassNum(0);
    setStudents([]);
    setSessions([]);
    setReports([]);
    setTeachers([]);
    onStaffLogout?.();
  };

  const handleTeacherRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await apiTeacherRegister({
        schoolName: expandSchoolName(signupSchool),
        username: signupUsername.trim(),
        password: signupPassword,
        grade: Number(signupGrade),
        classNum: Number(signupClassNum),
      });
      if (!result.success) {
        setError(result.message || '회원가입에 실패했습니다.');
        return;
      }
      setTeacherFormMode('login');
      setUsername(signupUsername.trim());
      setPassword('');
      setSignupPassword('');
      setError(result.message || '관리자 승인 후 로그인할 수 있습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const openTeacherEditor = (teacher: TeacherRow) => {
    setEditingTeacher(teacher);
    setEditTeacherSchool(teacher.schoolName);
    setEditTeacherUsername(teacher.username);
    setEditTeacherPassword('');
    setEditTeacherGrade(String(teacher.grade || 1));
    setEditTeacherClassNum(String(teacher.classNum || 1));
    setEditTeacherSchoolAdmin(teacher.role === 'school_admin');
    setEditTeacherMessage(null);
  };

  const saveTeacherEditor = async () => {
    if (!editingTeacher) return;
    setSavingTeacher(true);
    setEditTeacherMessage(null);
    try {
      const next = await apiAdminUpdateTeacher(editingTeacher.id, {
        schoolName: expandSchoolName(editTeacherSchool) || staffSchool,
        username: editTeacherUsername.trim(),
        password: editTeacherPassword || undefined,
        grade: Number(editTeacherGrade),
        classNum: Number(editTeacherClassNum),
        schoolAdmin: isAdmin ? editTeacherSchoolAdmin : undefined,
      });
      setTeachers(next);
      setEditingTeacher(null);
    } catch (err) {
      setEditTeacherMessage(err instanceof Error ? err.message : '교사 정보를 수정하지 못했습니다.');
    } finally {
      setSavingTeacher(false);
    }
  };

  const openStudentEditor = (student: AdminStudent) => {
    setEditingStudent(student);
    setEditGrade(String(student.grade));
    setEditClassNum(String(student.classNum));
    setEditStudentNum(String(student.studentNum));
    setEditName(student.name);
    setEditSchoolYear(student.schoolYear);
    setEditSchoolName(student.schoolName);
    setEditMessage(null);
  };

  const saveStudentEditor = async () => {
    if (!editingStudent) return;
    setSavingStudent(true);
    setEditMessage(null);
    try {
      const next = await apiAdminUpdateStudent(editingStudent.id, {
        schoolYear: editSchoolYear,
        schoolName: expandSchoolName(editSchoolName),
        grade: Number(editGrade),
        classNum: Number(editClassNum),
        studentNum: Number(editStudentNum),
        name: editName.trim(),
      });
      setStudents(next);
      setEditingStudent(null);
      await loadDashboard(staffRole);
    } catch (err) {
      setEditMessage(err instanceof Error ? err.message : '학생 정보를 수정하지 못했습니다.');
    } finally {
      setSavingStudent(false);
    }
  };

  const uploadTeacherFile = async (file: File) => {
    setTeacherMessage(null);
    setUploadingTeachers(true);
    try {
      const drafts = await parseTeacherSpreadsheet(file);
      if (drafts.length === 0) {
        setTeacherMessage('엑셀에서 교사 행을 찾지 못했습니다. 양식의 열 이름을 확인해 주세요.');
        return;
      }
      const result = await apiAdminCreateTeachers(drafts);
      if (result.teachers) setTeachers(result.teachers);
      const failed = result.failed?.length ? `\n${result.failed.join('\n')}` : '';
      setTeacherMessage(`${result.message || '교사 계정을 등록했습니다.'}${failed}`);
      setSchools(await apiListSchools());
    } catch (err) {
      setTeacherMessage(err instanceof Error ? err.message : '엑셀 파일을 읽지 못했습니다.');
    } finally {
      setUploadingTeachers(false);
    }
  };

  const downloadTeacherTemplate = () => {
    const blob = new Blob([TEACHER_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '담임교사_등록양식.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const toggleSessionSelected = (key: string) => {
    setSelectedSessionKeys((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
  };

  const deleteSelectedSessions = async () => {
    const items = selectedSessionKeys
      .map((key) => {
        const [id, studentId] = key.split('\t');
        return id && studentId ? { id, studentId } : null;
      })
      .filter((item): item is { id: string; studentId: string } => Boolean(item));
    if (items.length === 0) return;
    if (!window.confirm(`선택한 필사 기록 ${items.length}건을 삭제할까요?`)) return;
    try {
      const next = await apiAdminDeleteSessions(items);
      setSessions(next);
      setSelectedSessionKeys([]);
      await loadDashboard(staffRole);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '필사 기록을 삭제하지 못했습니다.');
    }
  };

  const scopedStudents = useMemo(
    () => (isAdmin || !staffSchool ? students : students.filter((student) => student.schoolName === staffSchool)),
    [isAdmin, staffSchool, students]
  );
  const scopedSessions = useMemo(
    () =>
      isAdmin || !staffSchool
        ? sessions
        : sessions.filter((session) => session.studentProfile?.schoolName === staffSchool),
    [isAdmin, staffSchool, sessions]
  );
  const scopedReports = useMemo(
    () =>
      isAdmin || !staffSchool ? reports : reports.filter((report) => report.studentProfile?.schoolName === staffSchool),
    [isAdmin, staffSchool, reports]
  );

  const rosterFilters = { grade: filterGrade, classNum: filterClassNum, studentNum: filterStudentNum, text: query };
  const hasRosterFilter = Boolean(
    filterGrade.trim() || filterClassNum.trim() || filterStudentNum.trim() || query.trim()
  );

  const filteredStudents = useMemo(
    () => scopedStudents.filter((student) => matchesRoster(student, rosterFilters, student.schoolName)),
    [scopedStudents, filterGrade, filterClassNum, filterStudentNum, query]
  );

  const filteredSessions = useMemo(
    () =>
      scopedSessions.filter((session) =>
        matchesRoster(session.studentProfile, rosterFilters, `${session.bookTitle} ${session.excerptTitle}`)
      ),
    [scopedSessions, filterGrade, filterClassNum, filterStudentNum, query]
  );

  const filteredReports = useMemo(
    () =>
      scopedReports.filter((report) =>
        matchesRoster(report.studentProfile, rosterFilters, `${report.bookTitle} ${report.title}`)
      ),
    [scopedReports, filterGrade, filterClassNum, filterStudentNum, query]
  );

  const clearRosterFilters = () => {
    setQuery('');
    setFilterGrade('');
    setFilterClassNum('');
    setFilterStudentNum('');
  };

  if (loading) {
    return (
      <StaffShell title={loginMode === 'teacher' ? '선생님' : '관리자'} onBack={onBack} dark>
        <div className="min-h-screen flex items-center justify-center text-stone-400">화면을 불러오는 중...</div>
      </StaffShell>
    );
  }

  if (!adminName) {
    return (
      <StaffShell
        title={loginMode === 'teacher' ? '선생님' : '관리자'}
        subtitle={loginMode === 'teacher' ? '담임교사·학교 최고관리자 로그인' : '관리자 로그인'}
        onBack={onBack}
        dark
      >
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-16 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-3xl p-7 shadow-2xl relative z-10">
          <button onClick={onBack} className="text-xs text-stone-400 hover:text-stone-200 flex items-center gap-1 mb-5">
            <ArrowLeft className="w-3.5 h-3.5" /> 학생 화면으로
          </button>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold">
                {loginMode === 'teacher'
                  ? teacherFormMode === 'register'
                    ? '선생님 회원가입'
                    : '선생님 로그인'
                  : '관리자 로그인'}
              </h1>
              <p className="text-xs text-stone-400">
                {loginMode === 'teacher'
                  ? teacherFormMode === 'register'
                    ? '담임교사로 가입하면 관리자 승인 후 로그인할 수 있습니다.'
                    : '담임교사·학교 최고관리자 아이디로 로그인하면 우리 학교 학생의 필사·독후 활동만 확인할 수 있습니다.'
                  : '관리자는 학교별 담임·최고관리자 아이디를 만들고 전체 활동을 확인합니다.'}
              </p>
            </div>
          </div>
          {loginMode === 'teacher' && (
            <div className="grid grid-cols-2 gap-1 p-1 mb-4 rounded-xl bg-stone-800">
              <button
                type="button"
                onClick={() => {
                  setTeacherFormMode('login');
                  setError(null);
                }}
                className={`py-1.5 rounded-lg text-xs font-semibold ${
                  teacherFormMode === 'login' ? 'bg-amber-500 text-stone-950' : 'text-stone-400'
                }`}
              >
                로그인
              </button>
              <button
                type="button"
                onClick={() => {
                  setTeacherFormMode('register');
                  setError(null);
                }}
                className={`py-1.5 rounded-lg text-xs font-semibold ${
                  teacherFormMode === 'register' ? 'bg-amber-500 text-stone-950' : 'text-stone-400'
                }`}
              >
                회원가입
              </button>
            </div>
          )}
          {loginMode === 'teacher' && teacherFormMode === 'register' ? (
            <form onSubmit={handleTeacherRegister} className="space-y-3">
              <label className="block text-xs text-stone-400">
                학교명
                <SchoolNameField
                  value={signupSchool}
                  onChange={setSignupSchool}
                  schools={schools}
                  placeholder="예: 금구중"
                  inputClassName="mt-1 w-full rounded-xl bg-stone-800 border border-stone-700 px-3 py-2.5 text-sm text-stone-100"
                />
              </label>
              <label className="block text-xs text-stone-400">
                아이디
                <input
                  value={signupUsername}
                  onChange={(e) => setSignupUsername(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-stone-800 border border-stone-700 px-3 py-2.5 text-sm text-stone-100"
                  autoComplete="username"
                />
              </label>
              <label className="block text-xs text-stone-400">
                비밀번호
                <input
                  type="password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-stone-800 border border-stone-700 px-3 py-2.5 text-sm text-stone-100"
                  autoComplete="new-password"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-xs text-stone-400">
                  학년
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={signupGrade}
                    onChange={(e) => setSignupGrade(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-stone-800 border border-stone-700 px-3 py-2.5 text-sm text-stone-100"
                  />
                </label>
                <label className="block text-xs text-stone-400">
                  반
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={signupClassNum}
                    onChange={(e) => setSignupClassNum(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-stone-800 border border-stone-700 px-3 py-2.5 text-sm text-stone-100"
                  />
                </label>
              </div>
              {error && <p className="text-sm text-rose-400">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-stone-950 font-semibold text-sm"
              >
                {submitting ? '신청 중...' : '가입 신청'}
              </button>
            </form>
          ) : (
          <form onSubmit={handleLogin} className="space-y-3">
            <label className="block text-xs text-stone-400">
              아이디
              <input
                name="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 w-full rounded-xl bg-stone-800 border border-stone-700 px-3 py-2.5 text-sm text-stone-100"
                autoComplete="username"
              />
            </label>
            <label className="block text-xs text-stone-400">
              비밀번호
              <input
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl bg-stone-800 border border-stone-700 px-3 py-2.5 text-sm text-stone-100"
                autoComplete="current-password"
              />
            </label>
            {error && <p className="text-sm text-rose-400">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-stone-950 font-semibold text-sm"
            >
              {submitting ? '로그인 중...' : loginMode === 'teacher' ? '선생님 로그인' : '로그인'}
            </button>
          </form>
          )}
        </div>
      </div>
      </StaffShell>
    );
  }

  return (
    <StaffShell
      title={consoleTitle}
      subtitle={`${adminName} 계정${staffSchool ? ` · ${staffSchool}` : ''}`}
      onBack={() => {
      if ((staffRole === 'teacher' || staffRole === 'school_admin') && onBrowseStudentView && adminName) {
        onBrowseStudentView({
          username: adminName,
          role: staffRole,
          schoolName: staffSchool,
          grade: staffGrade,
          classNum: staffClassNum,
        });
        return;
      }
      onBack();
    }}
      bar={
        <>
          <button
            type="button"
            onClick={() => {
              if ((staffRole === 'teacher' || staffRole === 'school_admin') && onBrowseStudentView && adminName) {
                onBrowseStudentView({
                  username: adminName,
                  role: staffRole,
                  schoolName: staffSchool,
                  grade: staffGrade,
                  classNum: staffClassNum,
                });
                return;
              }
              onBack();
            }}
            className="px-3 py-1.5 rounded-lg text-xs bg-stone-800 border border-stone-700"
          >
            학생 화면
          </button>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="px-3 py-1.5 rounded-lg text-xs bg-stone-800 border border-stone-700 flex items-center gap-1"
          >
            <LogOut className="w-3.5 h-3.5" /> 로그아웃
          </button>
        </>
      }
    >
    <div className="min-h-screen bg-[#fbfaf8] text-stone-900">

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard icon={<Users className="w-4 h-4" />} label={isAdmin ? '등록 학생' : `${staffSchool} 학생`} value={overview.studentCount} onClick={() => setTab('students')} />
          <StatCard icon={<Keyboard className="w-4 h-4" />} label="필사 기록" value={overview.sessionCount} onClick={() => setTab('sessions')} />
          <StatCard icon={<FileText className="w-4 h-4" />} label="독후감" value={overview.reportCount} onClick={() => setTab('reports')} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ['overview', '개요', LayoutDashboard],
              ['students', '학생', Users],
              ['sessions', '필사 기록', Keyboard],
              ['reports', '독후감', FileText],
              ...(canManageTeachers ? ([['teachers', '담임교사', UserPlus]] as const) : []),
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border ${
                tab === id
                  ? 'bg-amber-500 text-stone-950 border-amber-500 font-semibold'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {(tab === 'students' || tab === 'sessions' || tab === 'reports') && (
          <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-stone-800">
                {tab === 'sessions' ? '필사 기록 조회' : tab === 'reports' ? '독후감 조회' : '학생 조회'}
              </p>
              <p className="text-xs text-stone-500">
                {tab === 'students'
                  ? `${filteredStudents.length}명`
                  : tab === 'sessions'
                    ? `${filteredSessions.length}건`
                    : `${filteredReports.length}건`}
                {hasRosterFilter ? ' · 조건 적용됨' : ''}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-end">
              <label className="block text-[11px] text-stone-500">
                학년
                <input
                  value={filterGrade}
                  onChange={(e) => setFilterGrade(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder="예: 2"
                  inputMode="numeric"
                  className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm bg-white"
                />
              </label>
              <label className="block text-[11px] text-stone-500">
                반
                <input
                  value={filterClassNum}
                  onChange={(e) => setFilterClassNum(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder="예: 3"
                  inputMode="numeric"
                  className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm bg-white"
                />
              </label>
              <label className="block text-[11px] text-stone-500">
                번호
                <input
                  value={filterStudentNum}
                  onChange={(e) => setFilterStudentNum(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder="예: 15"
                  inputMode="numeric"
                  className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm bg-white"
                />
              </label>
              <label className="block text-[11px] text-stone-500 col-span-2">
                {tab === 'sessions' ? '학생 이름 또는 작품' : tab === 'reports' ? '학생 이름 또는 제목' : '학생 이름'}
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={tab === 'sessions' ? '이름이나 작품명' : '이름'}
                  className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm bg-white"
                />
              </label>
              <button
                type="button"
                disabled={!hasRosterFilter}
                onClick={clearRosterFilters}
                className="px-3 py-2 rounded-lg text-xs border border-stone-200 bg-stone-50 text-stone-600 disabled:opacity-40"
              >
                조건 지우기
              </button>
            </div>
          </div>
        )}

        {tab === 'overview' && (
          <section className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4">
            <p className="text-sm text-stone-600 leading-relaxed">
              학년·반·번호 또는 이름으로 학생을 찾은 뒤, 필사 기록과 독후감을 확인할 수 있습니다.
              {staffRole === 'admin'
                ? ' 담임교사와 학교 최고관리자 아이디를 만들 수 있습니다.'
                : staffRole === 'school_admin'
                  ? ` ${staffSchool} 학생의 반·번호·성명(로그인 암호)을 수정하거나 삭제할 수 있습니다.`
                  : ` ${staffSchool} 담당 학급 학생들의 필사·독후 활동만 보입니다.`}
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setTab('students')} className="px-3 py-2 rounded-xl text-sm bg-amber-500 text-stone-950 font-semibold">
                학생 찾기
              </button>
              <button type="button" onClick={() => setTab('sessions')} className="px-3 py-2 rounded-xl text-sm bg-white border border-stone-200 text-stone-700">
                필사 기록 조회
              </button>
              <button type="button" onClick={() => setTab('reports')} className="px-3 py-2 rounded-xl text-sm bg-white border border-stone-200 text-stone-700">
                독후감 보기
              </button>
            </div>
          </section>
        )}

        {tab === 'students' && (
          <AdminTable
            empty={hasRosterFilter ? '조건에 맞는 학생이 없습니다. 학년·반·번호를 확인해 주세요.' : '등록된 학생이 없습니다.'}
            headers={['학교', '학급', '이름', '필사', '독후감', '글자 수', '']}
            rows={filteredStudents.map((student) => [
              student.schoolName,
              `${student.grade}학년 ${student.classNum}반 ${student.studentNum}번`,
              student.name,
              String(student.sessionCount),
              String(student.reportCount),
              String(student.totalChars),
              canEditStudents ? (
                <span key={student.id} className="flex items-center justify-end gap-2">
                  <button
                    className="text-stone-500 hover:text-amber-700"
                    onClick={() => openStudentEditor(student)}
                    title="학생 정보 수정"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    className="text-rose-600 hover:text-rose-700"
                    onClick={() => {
                      if (!window.confirm(`${student.name} 학생 계정과 기록을 삭제할까요?`)) return;
                      void apiAdminDeleteStudent(student.id)
                        .then(setStudents)
                        .then(() => loadDashboard(staffRole));
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </span>
              ) : (
                ''
              ),
            ])}
          />
        )}

        {tab === 'sessions' && (
          <section className="space-y-3">
            {filteredSessions.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg text-xs border border-stone-200 bg-white"
                  onClick={() => {
                    const keys = filteredSessions.map(sessionRecordKey).filter((key) => !key.endsWith('\t'));
                    const allOn = keys.length > 0 && keys.every((key) => selectedSessionKeys.includes(key));
                    setSelectedSessionKeys(allOn ? [] : keys);
                  }}
                >
                  {filteredSessions
                    .map(sessionRecordKey)
                    .filter((key) => !key.endsWith('\t'))
                    .every((key) => selectedSessionKeys.includes(key)) && selectedSessionKeys.length > 0
                    ? '선택 해제'
                    : '전체 선택'}
                </button>
                <button
                  type="button"
                  disabled={selectedSessionKeys.length === 0}
                  className="px-3 py-1.5 rounded-lg text-xs bg-rose-600 text-white disabled:opacity-40"
                  onClick={() => void deleteSelectedSessions()}
                >
                  선택 삭제{selectedSessionKeys.length ? ` (${selectedSessionKeys.length})` : ''}
                </button>
              </div>
            )}
            <AdminTable
              empty={hasRosterFilter ? '조건에 맞는 필사 기록이 없습니다. 학생 이름이나 학년·반·번호를 바꿔 보세요.' : '필사 기록이 없습니다.'}
              headers={['선택', '일시', '학급', '학생', '작품', '타수', '정확도', '글자 수']}
              rows={filteredSessions.map((session) => {
                const studentId = session.studentProfile?.accountId || '';
                const key = sessionRecordKey(session);
                return [
                  <input
                    key={key}
                    type="checkbox"
                    checked={selectedSessionKeys.includes(key)}
                    disabled={!studentId}
                    onChange={() => toggleSessionSelected(key)}
                    aria-label={`${session.studentProfile?.name || '학생'} 필사 기록 선택`}
                  />,
                  formatSessionWhen(session.timestamp),
                  classLabel(session.studentProfile),
                  session.studentProfile?.name || '-',
                  `${session.bookTitle} · ${session.excerptTitle}`,
                  `${session.cpm}`,
                  `${session.accuracy}%`,
                  String(session.totalChars),
                ];
              })}
            />
          </section>
        )}

        {tab === 'reports' && (
          <AdminTable
            empty={hasRosterFilter ? '조건에 맞는 독후감이 없습니다.' : '독후감이 없습니다.'}
            headers={['학급', '학생', '작품', '제목', '별점', '']}
            rows={filteredReports.map((report) => [
              classLabel(report.studentProfile),
              report.studentProfile?.name || '-',
              report.bookTitle,
              report.title,
              `${report.rating}점`,
              isAdmin ? (
                <button
                  key={report.id}
                  className="text-rose-600 hover:text-rose-700"
                  onClick={() => {
                    const studentId = report.studentProfile?.accountId;
                    if (!studentId || !window.confirm('이 독후감을 삭제할까요?')) return;
                    void apiAdminDeleteReport(report.id, studentId)
                      .then(setReports)
                      .then(() => loadDashboard('admin'));
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              ) : (
                ''
              ),
            ])}
          />
        )}
        {tab === 'teachers' && canManageTeachers && (
          <section className="space-y-4">
            <form
              className="bg-white border border-stone-200 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end"
              onSubmit={(e) => {
                e.preventDefault();
                setTeacherMessage(null);
                void apiAdminCreateTeacher({
                  schoolName: isAdmin ? expandSchoolName(teacherSchool) : staffSchool,
                  username: teacherUsername.trim(),
                  password: teacherPassword,
                  grade: Number(teacherGrade),
                  classNum: Number(teacherClassNum),
                  schoolAdmin: isAdmin && teacherIsSchoolAdmin,
                })
                  .then(async (result) => {
                    setTeacherMessage(result.message || '교사 계정을 만들었습니다.');
                    if (result.teachers) setTeachers(result.teachers);
                    if (result.success) {
                      setTeacherSchool('');
                      setTeacherUsername('');
                      setTeacherPassword('');
                      setTeacherGrade('1');
                      setTeacherClassNum('1');
                      setTeacherIsSchoolAdmin(false);
                      setSchools(await apiListSchools());
                    }
                  })
                  .catch((err) => {
                    setTeacherMessage(err instanceof Error ? err.message : '교사 계정을 만들지 못했습니다.');
                  });
              }}
            >
              <label className="text-xs text-stone-500 lg:col-span-2">
                학교명
                {isAdmin ? (
                <SchoolNameField
                  value={teacherSchool}
                  onChange={setTeacherSchool}
                  schools={schools}
                  variant="light"
                  placeholder="예: 금구중"
                  inputClassName="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm bg-white"
                />
                ) : (
                  <input
                    value={staffSchool}
                    readOnly
                    className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm bg-stone-50"
                  />
                )}
              </label>
              <label className="text-xs text-stone-500">
                교사 아이디
                <input
                  value={teacherUsername}
                  onChange={(e) => setTeacherUsername(e.target.value)}
                  placeholder="예: geumgu1"
                  className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-stone-500">
                비밀번호
                <input
                  type="password"
                  value={teacherPassword}
                  onChange={(e) => setTeacherPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-stone-500">
                학년
                <input
                  type="number"
                  min={1}
                  max={6}
                  disabled={teacherIsSchoolAdmin}
                  value={teacherIsSchoolAdmin ? '' : teacherGrade}
                  onChange={(e) => setTeacherGrade(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm disabled:bg-stone-50"
                />
              </label>
              <label className="text-xs text-stone-500">
                반
                <input
                  type="number"
                  min={1}
                  max={20}
                  disabled={teacherIsSchoolAdmin}
                  value={teacherIsSchoolAdmin ? '' : teacherClassNum}
                  onChange={(e) => setTeacherClassNum(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm disabled:bg-stone-50"
                />
              </label>
              {isAdmin && (
              <label className="text-xs text-stone-500 flex items-center gap-2 lg:col-span-2 py-2">
                <input
                  type="checkbox"
                  checked={teacherIsSchoolAdmin}
                  onChange={(e) => setTeacherIsSchoolAdmin(e.target.checked)}
                />
                학교 최고관리자 (학년·반 없이 학교 전체 학생 수정)
              </label>
              )}
              <button type="submit" className="rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-sm py-2">
                계정 만들기
              </button>
              {teacherMessage && <p className="sm:col-span-2 lg:col-span-6 text-sm text-stone-600 whitespace-pre-wrap">{teacherMessage}</p>}
            </form>

            {isAdmin && (
            <div className="bg-white border border-stone-200 rounded-2xl p-4 flex flex-wrap items-center gap-3">
              <p className="text-sm text-stone-600">엑셀/CSV로 여러 교사 계정을 한 번에 만들 수 있습니다.</p>
              <button
                type="button"
                onClick={downloadTeacherTemplate}
                className="px-3 py-1.5 rounded-lg text-xs border border-stone-200 bg-stone-50 hover:bg-stone-100"
              >
                양식 받기
              </button>
              <label className="px-3 py-1.5 rounded-lg text-xs border border-amber-300 bg-amber-50 text-amber-800 cursor-pointer flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" />
                {uploadingTeachers ? '등록 중...' : '엑셀 업로드'}
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,text/csv"
                  className="hidden"
                  disabled={uploadingTeachers}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file) void uploadTeacherFile(file);
                  }}
                />
              </label>
              <p className="text-xs text-stone-400">열: 학교명, 아이디, 비밀번호, 학년, 반, 구분(담임교사/학교최고관리자)</p>
            </div>
            )}

            <AdminTable
              empty="등록된 담임교사가 없습니다."
              headers={['학교', '아이디', '역할', '학급', '상태', '최근 로그인', '']}
              rows={teachers.map((teacher) => [
                teacher.schoolName,
                teacher.username,
                teacher.role === 'school_admin' ? '학교 최고관리자' : '담임교사',
                teacher.role === 'school_admin' ? '학교 전체' : `${teacher.grade}학년 ${teacher.classNum}반`,
                teacher.approved === false ? '승인 대기' : '승인됨',
                new Date(teacher.lastLoginAt).toLocaleString('ko-KR'),
                <div key={teacher.id} className="flex items-center justify-end gap-2">
                  <button
                    className="text-stone-600 hover:text-stone-800"
                    title="교사 정보 수정"
                    onClick={() => openTeacherEditor(teacher)}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  {isAdmin && teacher.approved === false && (
                    <button
                      className="text-emerald-600 hover:text-emerald-700"
                      title="가입 승인"
                      onClick={() => {
                        void apiAdminApproveTeacher(teacher.id).then(setTeachers);
                      }}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  {isAdmin && (
                  <button
                    className="text-rose-600 hover:text-rose-700"
                    onClick={() => {
                      if (!window.confirm(`${teacher.username} 계정을 삭제할까요?`)) return;
                      void apiAdminDeleteTeacher(teacher.id).then(setTeachers);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  )}
                </div>,
              ])}
            />
          </section>
        )}
      </main>

      {editingStudent && (
        <div className="fixed inset-0 z-40 bg-stone-950/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-stone-200 p-5 space-y-3">
            <h2 className="font-semibold">학생 정보 수정</h2>
            <p className="text-xs text-stone-500">성명은 로그인 암호와 같습니다.</p>
            <label className="block text-xs text-stone-500">
              학년도
              <select
                value={editSchoolYear}
                onChange={(e) => setEditSchoolYear(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm bg-white"
              >
                {SCHOOL_YEAR_OPTIONS.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-stone-500">
              학교명
              <SchoolNameField
                value={editSchoolName}
                onChange={setEditSchoolName}
                schools={schools}
                variant="light"
                placeholder="예: 금구중"
                inputClassName="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm bg-white"
              />
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label className="text-xs text-stone-500">
                학년
                <input
                  type="number"
                  min={1}
                  value={editGrade}
                  onChange={(e) => setEditGrade(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-stone-500">
                반
                <input
                  type="number"
                  min={1}
                  value={editClassNum}
                  onChange={(e) => setEditClassNum(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-stone-500">
                번호
                <input
                  type="number"
                  min={1}
                  value={editStudentNum}
                  onChange={(e) => setEditStudentNum(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
                />
              </label>
            </div>
            <label className="block text-xs text-stone-500">
              성명 (로그인 암호)
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
              />
            </label>
            {editMessage && <p className="text-sm text-rose-600">{editMessage}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg text-sm border border-stone-200"
                onClick={() => setEditingStudent(null)}
              >
                취소
              </button>
              <button
                type="button"
                disabled={savingStudent}
                className="px-3 py-1.5 rounded-lg text-sm bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold disabled:opacity-60"
                onClick={() => void saveStudentEditor()}
              >
                {savingStudent ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingTeacher && (
        <div className="fixed inset-0 z-40 bg-stone-950/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-stone-200 p-5 space-y-3">
            <h2 className="font-semibold">교사 정보 수정</h2>
            <p className="text-xs text-stone-500">비밀번호를 비워두면 기존 비밀번호를 유지합니다.</p>
            <label className="block text-xs text-stone-500">
              학교명
              {isAdmin ? (
                <SchoolNameField
                  value={editTeacherSchool}
                  onChange={setEditTeacherSchool}
                  schools={schools}
                  variant="light"
                  inputClassName="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm bg-white"
                />
              ) : (
                <input
                  value={editTeacherSchool}
                  readOnly
                  className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm bg-stone-50"
                />
              )}
            </label>
            <label className="block text-xs text-stone-500">
              아이디
              <input
                value={editTeacherUsername}
                onChange={(e) => setEditTeacherUsername(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs text-stone-500">
              새 비밀번호
              <input
                type="password"
                value={editTeacherPassword}
                onChange={(e) => setEditTeacherPassword(e.target.value)}
                placeholder="8자 이상, 변경 시에만 입력"
                className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
              />
            </label>
            {!(isAdmin && editTeacherSchoolAdmin) && (
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-stone-500">
                  학년
                  <input
                    type="number"
                    min={1}
                    value={editTeacherGrade}
                    onChange={(e) => setEditTeacherGrade(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs text-stone-500">
                  반
                  <input
                    type="number"
                    min={1}
                    value={editTeacherClassNum}
                    onChange={(e) => setEditTeacherClassNum(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
                  />
                </label>
              </div>
            )}
            {isAdmin && (
              <label className="text-xs text-stone-500 flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  checked={editTeacherSchoolAdmin}
                  onChange={(e) => setEditTeacherSchoolAdmin(e.target.checked)}
                />
                학교 최고관리자
              </label>
            )}
            {editTeacherMessage && <p className="text-sm text-rose-600">{editTeacherMessage}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg text-sm border border-stone-200"
                onClick={() => setEditingTeacher(null)}
              >
                취소
              </button>
              <button
                type="button"
                disabled={savingTeacher}
                className="px-3 py-1.5 rounded-lg text-sm bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold disabled:opacity-60"
                onClick={() => void saveTeacherEditor()}
              >
                {savingTeacher ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </StaffShell>
  );
};

function StaffShell({
  title,
  subtitle,
  onBack,
  dark,
  bar,
  children,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  dark?: boolean;
  bar?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={`min-h-screen ${dark ? 'bg-stone-950 text-stone-100' : 'bg-[#fbfaf8] text-stone-900'}`}>
      {bar ? (
        <header className="fixed top-0 left-0 right-0 z-[60] h-16 bg-stone-900 text-stone-100 border-b border-stone-800">
          <div className="h-full md:pl-56 px-4 sm:px-6 flex items-center justify-end gap-2">{bar}</div>
        </header>
      ) : null}
      <aside
        className={`hidden md:flex fixed left-0 inset-y-0 z-50 w-56 bg-stone-900 text-stone-100 border-r border-stone-800 flex-col shadow-xl ${
          bar ? 'pt-16' : ''
        }`}
      >
        <div className="px-4 pt-5 pb-4 border-b border-stone-800">
          <button type="button" onClick={onBack} className="text-left group w-full">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 group-hover:scale-105 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="font-batang text-base font-bold tracking-tight">문학 타자연습</p>
                <p className="text-[11px] text-amber-300">공개명작</p>
              </div>
            </div>
          </button>
          {subtitle && <p className="mt-3 text-[11px] text-stone-400 leading-relaxed">{subtitle}</p>}
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <button
            type="button"
            onClick={onBack}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-stone-300 hover:text-stone-100 hover:bg-stone-800"
          >
            <ArrowLeft className="w-4 h-4" />
            학생 화면
          </button>
          <div className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 text-stone-950">
            <Lock className="w-4 h-4" />
            {title}
          </div>
        </nav>
      </aside>
      <div className={`${bar ? 'pt-16' : ''} md:pl-56`}>
        {children}
        <p className={`text-center text-xs py-6 ${dark ? 'text-stone-500' : 'text-stone-400'}`}>© jiseok</p>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-white border border-stone-200 rounded-2xl p-4 flex items-center gap-3 text-left hover:border-amber-300 hover:shadow-sm transition-all"
    >
      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">{icon}</div>
      <div>
        <p className="text-xs text-stone-500">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </button>
  );
}

function AdminTable({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: Array<Array<React.ReactNode>>;
  empty: string;
}) {
  if (rows.length === 0) {
    return <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center text-stone-500">{empty}</div>;
  }
  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-stone-50 text-stone-500 text-left">
          <tr>
            {headers.map((header) => (
              <th key={header || 'action'} className="px-4 py-3 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-stone-100">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-3">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
