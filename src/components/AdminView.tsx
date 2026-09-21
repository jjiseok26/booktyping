import React, { useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck,
  LogOut,
  Users,
  Keyboard,
  FileText,
  ArrowLeft,
  Trash2,
  Search,
  Lock,
  LayoutDashboard,
  UserPlus,
  Pencil,
  Upload,
} from 'lucide-react';
import { BookReport, StudentAccount, TypingSessionResult } from '../types';
import {
  apiAdminCreateTeacher,
  apiAdminCreateTeachers,
  apiAdminDeleteReport,
  apiAdminDeleteSession,
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
  apiListSchools,
  apiTeacherLogin,
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
  createdAt: number;
  lastLoginAt: number;
};

interface AdminViewProps {
  onBack: () => void;
  loginMode?: LoginMode;
}

function asStaffRole(role?: string): StaffRole {
  if (role === 'teacher' || role === 'school_admin') return role;
  return 'admin';
}

export const AdminView: React.FC<AdminViewProps> = ({ onBack, loginMode = 'admin' }) => {
  const [username, setUsername] = useState(loginMode === 'admin' ? 'admin' : '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [adminName, setAdminName] = useState<string | null>(null);
  const [staffRole, setStaffRole] = useState<StaffRole>('admin');
  const [staffSchool, setStaffSchool] = useState('');
  const [loading, setLoading] = useState(Boolean(getAdminToken()));
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<AdminTab>('overview');
  const [query, setQuery] = useState('');
  const [overview, setOverview] = useState({ studentCount: 0, sessionCount: 0, reportCount: 0 });
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [sessions, setSessions] = useState<TypingSessionResult[]>([]);
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
  const [editMessage, setEditMessage] = useState<string | null>(null);
  const [savingStudent, setSavingStudent] = useState(false);

  const isAdmin = staffRole === 'admin';
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
    if (role === 'admin') {
      setTeachers(await apiAdminTeachers());
    } else {
      setTeachers([]);
    }
  };

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
    setStudents([]);
    setSessions([]);
    setReports([]);
    setTeachers([]);
  };

  const openStudentEditor = (student: AdminStudent) => {
    setEditingStudent(student);
    setEditGrade(String(student.grade));
    setEditClassNum(String(student.classNum));
    setEditStudentNum(String(student.studentNum));
    setEditName(student.name);
    setEditMessage(null);
  };

  const saveStudentEditor = async () => {
    if (!editingStudent) return;
    setSavingStudent(true);
    setEditMessage(null);
    try {
      const next = await apiAdminUpdateStudent(editingStudent.id, {
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

  const filteredStudents = useMemo(() => {
    const q = query.trim();
    if (!q) return scopedStudents;
    return scopedStudents.filter((student) =>
      `${student.schoolName} ${student.grade} ${student.classNum} ${student.studentNum} ${student.name}`.includes(q)
    );
  }, [scopedStudents, query]);

  const filteredSessions = useMemo(() => {
    const q = query.trim();
    if (!q) return scopedSessions;
    return scopedSessions.filter((session) =>
      `${session.studentProfile?.name} ${session.bookTitle} ${session.excerptTitle}`.includes(q)
    );
  }, [scopedSessions, query]);

  const filteredReports = useMemo(() => {
    const q = query.trim();
    if (!q) return scopedReports;
    return scopedReports.filter((report) =>
      `${report.studentProfile?.name} ${report.bookTitle} ${report.title}`.includes(q)
    );
  }, [scopedReports, query]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fbfaf8] flex items-center justify-center text-stone-500">
        화면을 불러오는 중...
      </div>
    );
  }

  if (!adminName) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-3xl p-7 shadow-2xl">
          <button onClick={onBack} className="text-xs text-stone-400 hover:text-stone-200 flex items-center gap-1 mb-5">
            <ArrowLeft className="w-3.5 h-3.5" /> 학생 화면으로
          </button>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold">{loginMode === 'teacher' ? '선생님 로그인' : '관리자 로그인'}</h1>
              <p className="text-xs text-stone-400">
                {loginMode === 'teacher'
                  ? '담임교사·학교 최고관리자 아이디로 로그인하면 우리 학교 학생의 필사·독후 활동만 확인할 수 있습니다.'
                  : '관리자는 학교별 담임·최고관리자 아이디를 만들고 전체 활동을 확인합니다.'}
              </p>
            </div>
          </div>
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfaf8] text-stone-900">
      <header className="sticky top-0 z-20 bg-stone-900 text-stone-100 border-b border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-400/30 text-amber-300 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold">{consoleTitle}</p>
              <p className="text-xs text-stone-400">
                {adminName} 계정{staffSchool ? ` · ${staffSchool}` : ''}
                {staffRole === 'teacher' ? ' · 담임' : staffRole === 'school_admin' ? ' · 최고관리자' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="px-3 py-1.5 rounded-lg text-xs bg-stone-800 border border-stone-700">
              학생 화면
            </button>
            <button
              onClick={() => void handleLogout()}
              className="px-3 py-1.5 rounded-lg text-xs bg-stone-800 border border-stone-700 flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" /> 로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard icon={<Users className="w-4 h-4" />} label={isAdmin ? '등록 학생' : `${staffSchool} 학생`} value={overview.studentCount} />
          <StatCard icon={<Keyboard className="w-4 h-4" />} label="필사 기록" value={overview.sessionCount} />
          <StatCard icon={<FileText className="w-4 h-4" />} label="독후감" value={overview.reportCount} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ['overview', '개요', LayoutDashboard],
              ['students', '학생', Users],
              ['sessions', '필사 기록', Keyboard],
              ['reports', '독후감', FileText],
              ...(isAdmin ? ([['teachers', '담임교사', UserPlus]] as const) : []),
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border ${
                tab === id
                  ? 'bg-amber-500 text-stone-950 border-amber-500 font-semibold'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
          {tab !== 'overview' && (
            <div className="relative ml-auto">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="검색"
                className="pl-9 pr-3 py-1.5 rounded-lg border border-stone-200 text-sm bg-white w-56"
              />
            </div>
          )}
        </div>

        {tab === 'overview' && (
          <section className="bg-white border border-stone-200 rounded-2xl p-5 text-sm text-stone-600 leading-relaxed">
            학급 학생 계정, 필사 세션, 독후감을 한곳에서 확인합니다.
            {staffRole === 'admin'
              ? ' 담임교사와 학교 최고관리자 아이디를 만들 수 있습니다. 최고관리자는 해당 학교 학생의 반·번호·성명(로그인 암호)을 수정하거나 삭제할 수 있습니다.'
              : staffRole === 'school_admin'
                ? ` ${staffSchool} 학생의 반·번호·성명(로그인 암호)을 수정하거나 삭제할 수 있습니다.`
                : ` ${staffSchool} 담당 학급 학생들의 필사·독후 활동을 조회할 수 있습니다.`}
          </section>
        )}

        {tab === 'students' && (
          <AdminTable
            empty="등록된 학생이 없습니다."
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
          <AdminTable
            empty="필사 기록이 없습니다."
            headers={['학생', '작품', '타수', '정확도', '글자 수', '']}
            rows={filteredSessions.map((session) => [
              session.studentProfile?.name || '-',
              `${session.bookTitle} · ${session.excerptTitle}`,
              `${session.cpm}`,
              `${session.accuracy}%`,
              String(session.totalChars),
              isAdmin ? (
                <button
                  key={session.id}
                  className="text-rose-600 hover:text-rose-700"
                  onClick={() => {
                    const studentId = session.studentProfile?.accountId;
                    if (!studentId || !window.confirm('이 필사 기록을 삭제할까요?')) return;
                    void apiAdminDeleteSession(session.id, studentId)
                      .then(setSessions)
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

        {tab === 'reports' && (
          <AdminTable
            empty="독후감이 없습니다."
            headers={['학생', '작품', '제목', '별점', '']}
            rows={filteredReports.map((report) => [
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
        {tab === 'teachers' && isAdmin && (
          <section className="space-y-4">
            <form
              className="bg-white border border-stone-200 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end"
              onSubmit={(e) => {
                e.preventDefault();
                setTeacherMessage(null);
                void apiAdminCreateTeacher({
                  schoolName: expandSchoolName(teacherSchool),
                  username: teacherUsername.trim(),
                  password: teacherPassword,
                  grade: Number(teacherGrade),
                  classNum: Number(teacherClassNum),
                  schoolAdmin: teacherIsSchoolAdmin,
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
                <SchoolNameField
                  value={teacherSchool}
                  onChange={setTeacherSchool}
                  schools={schools}
                  variant="light"
                  placeholder="예: 금구중"
                  inputClassName="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm bg-white"
                />
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
              <label className="text-xs text-stone-500 flex items-center gap-2 lg:col-span-2 py-2">
                <input
                  type="checkbox"
                  checked={teacherIsSchoolAdmin}
                  onChange={(e) => setTeacherIsSchoolAdmin(e.target.checked)}
                />
                학교 최고관리자 (학년·반 없이 학교 전체 학생 수정)
              </label>
              <button type="submit" className="rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-sm py-2">
                계정 만들기
              </button>
              {teacherMessage && <p className="sm:col-span-2 lg:col-span-6 text-sm text-stone-600 whitespace-pre-wrap">{teacherMessage}</p>}
            </form>

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

            <AdminTable
              empty="등록된 담임교사가 없습니다."
              headers={['학교', '아이디', '역할', '학급', '최근 로그인', '']}
              rows={teachers.map((teacher) => [
                teacher.schoolName,
                teacher.username,
                teacher.role === 'school_admin' ? '학교 최고관리자' : '담임교사',
                teacher.role === 'school_admin' ? '학교 전체' : `${teacher.grade}학년 ${teacher.classNum}반`,
                new Date(teacher.lastLoginAt).toLocaleString('ko-KR'),
                <button
                  key={teacher.id}
                  className="text-rose-600 hover:text-rose-700"
                  onClick={() => {
                    if (!window.confirm(`${teacher.username} 계정을 삭제할까요?`)) return;
                    void apiAdminDeleteTeacher(teacher.id).then(setTeachers);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>,
              ])}
            />
          </section>
        )}
      </main>

      {editingStudent && (
        <div className="fixed inset-0 z-40 bg-stone-950/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-stone-200 p-5 space-y-3">
            <h2 className="font-semibold">학생 정보 수정</h2>
            <p className="text-xs text-stone-500">
              {editingStudent.schoolName} · 성명은 로그인 암호와 같습니다.
            </p>
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
    </div>
  );
};

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">{icon}</div>
      <div>
        <p className="text-xs text-stone-500">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
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
