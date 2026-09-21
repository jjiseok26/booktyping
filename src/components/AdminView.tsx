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
} from 'lucide-react';
import { BookReport, StudentAccount, TypingSessionResult } from '../types';
import {
  apiAdminCreateTeacher,
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
  apiTeacherLogin,
  getAdminToken,
  setAdminToken,
} from '../utils/dbClient';
import { expandSchoolName } from '../utils/schoolName';

type AdminTab = 'overview' | 'students' | 'sessions' | 'reports' | 'teachers';
type StaffRole = 'admin' | 'teacher';
type AdminStudent = StudentAccount & { sessionCount: number; reportCount: number; totalChars: number };
type TeacherRow = { id: string; schoolName: string; username: string; createdAt: number; lastLoginAt: number };

interface AdminViewProps {
  onBack: () => void;
  loginMode?: StaffRole;
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
  const [teacherSchool, setTeacherSchool] = useState('');
  const [teacherUsername, setTeacherUsername] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [teacherMessage, setTeacherMessage] = useState<string | null>(null);

  const isAdmin = staffRole === 'admin';

  const loadDashboard = async (role: StaffRole = staffRole) => {
    const [nextOverview, nextStudents, nextSessions, nextReports] = await Promise.all([
      apiAdminOverview(),
      apiAdminStudents(),
      apiAdminSessions(),
      apiAdminReports(),
    ]);
    setOverview(nextOverview);
    setStudents(nextStudents);
    setSessions(nextSessions);
    setReports(nextReports);
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
        setAdminName(data.admin.username);
        setStaffRole(data.admin.role === 'teacher' ? 'teacher' : 'admin');
        setStaffSchool(data.admin.schoolName || '');
        await loadDashboard(data.admin.role === 'teacher' ? 'teacher' : 'admin');
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
      const nextRole = result.admin.role === 'teacher' || result.role === 'teacher' ? 'teacher' : 'admin';
      if (loginMode === 'teacher' && nextRole !== 'teacher') {
        setAdminToken(null);
        setError('선생님 계정으로 로그인해 주세요.');
        return;
      }
      setAdminName(result.admin.username);
      setStaffRole(nextRole);
      setStaffSchool(result.admin.schoolName || '');
      setPassword('');
      try {
        await loadDashboard(result.admin.role === 'teacher' || result.role === 'teacher' ? 'teacher' : 'admin');
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
                  ? '담임교사 아이디로 로그인하면 우리 학교 학생의 필사·독후 활동만 확인할 수 있습니다.'
                  : '관리자는 학교별 담임 아이디를 만들고 전체 활동을 확인합니다.'}
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
              <p className="font-bold">{isAdmin ? '관리자 콘솔' : '담임교사 콘솔'}</p>
              <p className="text-xs text-stone-400">
                {adminName} 계정{staffSchool ? ` · ${staffSchool}` : ''}
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
            {isAdmin
              ? ' 담임교사 아이디를 학교별로 만들면 해당 학교 학생 활동만 볼 수 있습니다. 학생을 삭제하면 타자 기록과 독후감도 함께 삭제됩니다.'
              : ` ${staffSchool} 학생들의 필사·독후 활동을 조회할 수 있습니다.`}
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
              isAdmin ? (
                <button
                  key={student.id}
                  className="text-rose-600 hover:text-rose-700"
                  onClick={() => {
                    if (!window.confirm(`${student.name} 학생 계정과 기록을 삭제할까요?`)) return;
                    void apiAdminDeleteStudent(student.id).then(setStudents).then(() => loadDashboard('admin'));
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
                    void apiAdminDeleteSession(session.id, studentId).then(setSessions).then(() => loadDashboard('admin'));
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
                    void apiAdminDeleteReport(report.id, studentId).then(setReports).then(() => loadDashboard('admin'));
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
              className="bg-white border border-stone-200 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
              onSubmit={(e) => {
                e.preventDefault();
                setTeacherMessage(null);
                void apiAdminCreateTeacher({
                  schoolName: expandSchoolName(teacherSchool),
                  username: teacherUsername.trim(),
                  password: teacherPassword,
                })
                  .then((result) => {
                    setTeacherMessage(result.message || '담임교사 계정을 만들었습니다.');
                    if (result.teachers) setTeachers(result.teachers);
                    if (result.success) {
                      setTeacherSchool('');
                      setTeacherUsername('');
                      setTeacherPassword('');
                    }
                  })
                  .catch((err) => {
                    setTeacherMessage(err instanceof Error ? err.message : '담임교사 계정을 만들지 못했습니다.');
                  });
              }}
            >
              <label className="text-xs text-stone-500">
                학교명
                <input
                  value={teacherSchool}
                  onChange={(e) => setTeacherSchool(e.target.value)}
                  onBlur={() => setTeacherSchool(expandSchoolName(teacherSchool))}
                  placeholder="예: 금구중"
                  className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
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
              <button type="submit" className="rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-sm py-2">
                담임 아이디 만들기
              </button>
              {teacherMessage && <p className="sm:col-span-4 text-sm text-stone-600">{teacherMessage}</p>}
            </form>
            <AdminTable
              empty="등록된 담임교사가 없습니다."
              headers={['학교', '아이디', '최근 로그인', '']}
              rows={teachers.map((teacher) => [
                teacher.schoolName,
                teacher.username,
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
