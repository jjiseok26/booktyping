import React, { useState, useEffect } from 'react';
import {
  X,
  GraduationCap,
  School,
  User,
  Hash,
  Calendar,
  KeyRound,
  Check,
  AlertCircle,
  Users,
  LogIn,
  UserPlus,
  ShieldCheck,
  LogOut,
  Info,
} from 'lucide-react';
import { StudentAccount } from '../types';
import {
  getRecentStudentAccounts,
  rememberRecentAccount,
} from '../utils/storage';
import { apiListSchools, apiLoginStudent, apiRegisterStudent } from '../utils/dbClient';
import { expandSchoolName } from '../utils/schoolName';
import { SchoolNameField } from './SchoolNameField';

interface StudentAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAccount: StudentAccount | null;
  onLoginSuccess: (account: StudentAccount) => void;
  onLogout: () => void;
  initialMode?: 'login' | 'register';
}

const SCHOOL_YEAR_OPTIONS = ['2026학년도', '2027학년도', '2028학년도', '2029학년도', '2030학년도'];

export const StudentAuthModal: React.FC<StudentAuthModalProps> = ({
  isOpen,
  onClose,
  currentAccount,
  onLoginSuccess,
  onLogout,
  initialMode = 'login',
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialMode);

  // Form states
  const [schoolYear, setSchoolYear] = useState<string>('2026학년도');
  const [schoolName, setSchoolName] = useState<string>('');
  const [grade, setGrade] = useState<number>(1);
  const [classNum, setClassNum] = useState<number>(1);
  const [studentNum, setStudentNum] = useState<number>(1);
  const [name, setName] = useState<string>('');

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [savedAccounts, setSavedAccounts] = useState<StudentAccount[]>([]);
  const [registeredSchools, setRegisteredSchools] = useState<string[]>([]);

  // Refresh saved accounts and populate defaults when modal opens
  useEffect(() => {
    if (!isOpen) return;
    const accounts = getRecentStudentAccounts();
    setSavedAccounts(accounts);
    setError(null);
    setSuccessMessage(null);
    void apiListSchools().then((schools) => {
      const localNames = accounts.map((acc) => acc.schoolName).filter(Boolean);
      setRegisteredSchools(Array.from(new Set([...schools, ...localNames])));
    });

    if (currentAccount) {
      setSchoolYear(currentAccount.schoolYear || '2026학년도');
      setSchoolName(currentAccount.schoolName || '');
      setGrade(currentAccount.grade || 1);
      setClassNum(currentAccount.classNum || 1);
      setStudentNum(currentAccount.studentNum || 1);
      setName(currentAccount.name || '');
    } else if (accounts.length > 0) {
      const first = accounts[0];
      setSchoolYear(first.schoolYear);
      setSchoolName(first.schoolName);
      setGrade(first.grade);
      setClassNum(first.classNum);
      setStudentNum(first.studentNum);
      setName(first.name);
    } else {
      setSchoolYear('2026학년도');
      setSchoolName('');
      setGrade(1);
      setClassNum(1);
      setStudentNum(1);
      setName('');
    }
  }, [isOpen, currentAccount]);

  useEffect(() => {
    setActiveTab(initialMode);
    setError(null);
    setSuccessMessage(null);
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  const handleSelectSavedAccount = (acc: StudentAccount) => {
    setSchoolYear(acc.schoolYear);
    setSchoolName(acc.schoolName);
    setGrade(acc.grade);
    setClassNum(acc.classNum);
    setStudentNum(acc.studentNum);
    setName(acc.name);
    setError(null);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const trimmedSchool = expandSchoolName(schoolName);
    const trimmedName = name.trim();
    if (trimmedSchool !== schoolName) setSchoolName(trimmedSchool);

    if (!trimmedSchool) {
      setError('학교명을 입력해주세요.');
      return;
    }
    if (!trimmedName) {
      setError('학생 성명을 입력해주세요. (성명이 로그인 암호 역할을 합니다)');
      return;
    }
    if (grade < 1 || grade > 6) {
      setError('학년을 1~6학년 범위에서 입력해주세요.');
      return;
    }
    if (classNum < 1 || classNum > 30) {
      setError('반을 1~30반 범위에서 입력해주세요.');
      return;
    }
    if (studentNum < 1 || studentNum > 60) {
      setError('번호를 1~60번 범위에서 입력해주세요.');
      return;
    }

    const res = await apiRegisterStudent({
      schoolYear,
      schoolName: trimmedSchool,
      grade,
      classNum,
      studentNum,
      name: trimmedName,
    });

    if (!res.success) {
      setError(res.message);
      return;
    }

    setSuccessMessage(res.message);
    if (res.account) {
      rememberRecentAccount(res.account);
      setSavedAccounts(getRecentStudentAccounts());
      setTimeout(() => {
        onLoginSuccess(res.account!);
        onClose();
      }, 500);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const trimmedSchool = expandSchoolName(schoolName);
    const trimmedName = name.trim();
    if (trimmedSchool !== schoolName) setSchoolName(trimmedSchool);

    if (!trimmedSchool) {
      setError('학교명을 입력해주세요.');
      return;
    }
    if (!trimmedName) {
      setError('학생 성명(암호)을 입력해주세요.');
      return;
    }
    if (grade < 1 || classNum < 1 || studentNum < 1) {
      setError('학년, 반, 번호를 올바르게 입력해주세요.');
      return;
    }

    const res = await apiLoginStudent({
      schoolYear,
      schoolName: trimmedSchool,
      grade,
      classNum,
      studentNum,
      name: trimmedName,
    });

    if (!res.success) {
      setError(res.message);
      return;
    }

    setSuccessMessage(res.message);
    if (res.account) {
      rememberRecentAccount(res.account);
      setTimeout(() => {
        onLoginSuccess(res.account!);
        onClose();
      }, 500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl text-stone-100 relative my-6 overflow-visible">
        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-inner">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-stone-100 flex items-center gap-2">
                <span>학생 계정 인증</span>
                {currentAccount && (
                  <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    로그인 중
                  </span>
                )}
              </h3>
              <p className="text-xs text-stone-400">
                학교명·학년·반·번호와 성명(암호)으로 로그인
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Currently Logged In Banner */}
        {currentAccount && (
          <div className="mt-4 p-3.5 rounded-2xl bg-stone-800/80 border border-stone-700/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-stone-950 font-bold flex items-center justify-center text-sm shadow">
                {currentAccount.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-stone-100 flex items-center gap-2">
                  <span>{currentAccount.name}</span>
                  <span className="text-[11px] text-amber-300 font-mono">
                    {currentAccount.grade}학년 {currentAccount.classNum}반 {currentAccount.studentNum}번
                  </span>
                </div>
                <div className="text-[11px] text-stone-400 truncate">
                  {currentAccount.schoolYear} {currentAccount.schoolName}
                </div>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-rose-500/20 text-stone-400 hover:text-rose-300 border border-stone-700 hover:border-rose-500/30 text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>로그아웃</span>
            </button>
          </div>
        )}

        {/* 2 Tab Selector: Login vs Register */}
        <div className="mt-4 grid grid-cols-2 p-1 rounded-2xl bg-stone-950/70 border border-stone-800 text-xs font-semibold">
          <button
            id="tab-student-login"
            type="button"
            onClick={() => {
              setActiveTab('login');
              setError(null);
              setSuccessMessage(null);
            }}
            className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all text-center ${
              activeTab === 'login'
                ? 'bg-amber-500 text-stone-950 font-bold shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">학생 로그인</span>
          </button>
          <button
            id="tab-student-register"
            type="button"
            onClick={() => {
              setActiveTab('register');
              setError(null);
              setSuccessMessage(null);
            }}
            className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all text-center ${
              activeTab === 'register'
                ? 'bg-amber-500 text-stone-950 font-bold shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">신규 회원가입</span>
          </button>
        </div>

        {/* Quick Account Switcher (if local accounts exist) */}
        {savedAccounts.length > 0 && activeTab === 'login' && (
          <div className="mt-3.5 p-3 rounded-2xl bg-stone-950/40 border border-stone-800/80">
            <div className="flex items-center justify-between text-[11px] text-stone-400 mb-2">
              <span className="flex items-center gap-1 font-medium">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                이 기기에서 등록된 학생 계정 선택
              </span>
              <span className="text-[10px] text-stone-500">{savedAccounts.length}명</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {savedAccounts.map((acc) => {
                const isSelected =
                  acc.schoolYear === schoolYear &&
                  acc.schoolName === schoolName &&
                  acc.grade === grade &&
                  acc.classNum === classNum &&
                  acc.studentNum === studentNum;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => handleSelectSavedAccount(acc)}
                    className={`px-3 py-1.5 rounded-xl text-left shrink-0 text-xs transition-all border ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500/60 text-amber-200 font-semibold'
                        : 'bg-stone-800/70 border-stone-700/60 text-stone-300 hover:border-stone-600'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      <span>{acc.name}</span>
                      <span className="text-[10px] font-mono opacity-80">
                        {acc.grade}-{acc.classNum}-{acc.studentNum}
                      </span>
                    </div>
                    <div className="text-[10px] text-stone-400 truncate max-w-[130px]">
                      {acc.schoolName}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Feature Explanatory Banner */}
        <div className="mt-3.5 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200/90 text-[11px] flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            {activeTab === 'register' && '비밀번호를 따로 설정할 필요 없이 학생 본인의 성명(이름)이 암호 역할을 합니다.'}
            {activeTab === 'login' && '학교/학년/반/번호와 가입 시 등록했던 본인 성명(암호)을 입력해주세요.'}
          </span>
        </div>

        {/* Error and Success Alerts */}
        {error && (
          <div className="mt-3.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}
        {successMessage && (
          <div className="mt-3.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2">
            <Check className="w-4 h-4 shrink-0 mt-0.5" />
            <div>{successMessage}</div>
          </div>
        )}

        {/* Form Body for Login and Register */}
        {(activeTab === 'login' || activeTab === 'register') && (
          <form
            onSubmit={activeTab === 'login' ? handleLoginSubmit : handleRegisterSubmit}
            className="mt-4 space-y-3.5 text-xs"
          >
            {/* Row 1: School Year & School Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-stone-400 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>학년도</span>
                </label>
                <select
                  value={schoolYear}
                  onChange={(e) => setSchoolYear(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-400 text-xs"
                >
                  {SCHOOL_YEAR_OPTIONS.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-400 mb-1 flex items-center gap-1.5">
                  <School className="w-3.5 h-3.5 text-amber-400" />
                  <span>학교명</span>
                </label>
                <SchoolNameField
                  value={schoolName}
                  onChange={setSchoolName}
                  schools={registeredSchools}
                  placeholder="예: 가온중학교, 한빛초등학교"
                  inputClassName="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-400 text-xs"
                />
              </div>
            </div>

            {/* Row 2: Grade, Class, Student Number */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div>
                <label className="block text-[11px] font-medium text-stone-400 mb-1 flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
                  <span>학년</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={grade}
                    onChange={(e) => setGrade(parseInt(e.target.value) || 1)}
                    className="w-full pl-3 pr-7 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-400 text-xs font-mono"
                    required
                  />
                  <span className="absolute right-2.5 top-2 text-stone-400 text-[11px] pointer-events-none">
                    학년
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-400 mb-1 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  <span>반</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={classNum}
                    onChange={(e) => setClassNum(parseInt(e.target.value) || 1)}
                    className="w-full pl-3 pr-6 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-400 text-xs font-mono"
                    required
                  />
                  <span className="absolute right-2.5 top-2 text-stone-400 text-[11px] pointer-events-none">
                    반
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-400 mb-1 flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-amber-400" />
                  <span>번호</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={studentNum}
                    onChange={(e) => setStudentNum(parseInt(e.target.value) || 1)}
                    className="w-full pl-3 pr-6 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-400 text-xs font-mono"
                    required
                  />
                  <span className="absolute right-2.5 top-2 text-stone-400 text-[11px] pointer-events-none">
                    번
                  </span>
                </div>
              </div>
            </div>

            {/* Row 3: Student Name (Acts as Password) */}
            <div>
              <label className="block text-[11px] font-medium text-stone-400 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  <span>{activeTab === 'login' ? '학생 성명 (로그인 암호)' : '학생 성명 (이름이 암호로 설정됩니다)'}</span>
                </span>
                <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
                  <KeyRound className="w-3 h-3" />
                  비밀번호 없이 이름이 암호
                </span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={activeTab === 'login' ? '가입 시 등록했던 본인 성명 입력' : '학생 본인 성명 입력 (예: 김지민)'}
                required
                className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-400 text-xs font-semibold"
              />
            </div>

            {/* Submit Actions */}
            <div className="pt-2">
              <button
                id={activeTab === 'login' ? 'btn-student-submit-login' : 'btn-student-submit-register'}
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-stone-950 font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {activeTab === 'login' ? (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>{name ? `${name} 학생으로 로그인` : '학생 로그인'}</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>회원가입 완료 및 바로 로그인</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Footer Guidance */}
        <div className="mt-4 pt-3 border-t border-stone-800/80 flex items-center justify-between text-[11px] text-stone-400">
          <div className="flex items-center gap-1.5 text-stone-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>학급 순위표 및 독후감 자동 연동</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveTab(activeTab === 'login' ? 'register' : 'login');
              setError(null);
              setSuccessMessage(null);
            }}
            className="text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors"
          >
            {activeTab === 'login' ? '새로 등록하시나요? 회원가입' : '기존 계정으로 로그인'}
          </button>
        </div>
      </div>
    </div>
  );
};
