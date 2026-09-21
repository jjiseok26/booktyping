import React, { useEffect, useState } from 'react';
import { School, User, Hash, Calendar, GraduationCap, Users, Check, X, Sparkles } from 'lucide-react';
import { StudentProfile } from '../types';
import { getRecentStudentAccounts } from '../utils/storage';
import { apiListSchools } from '../utils/dbClient';
import { SchoolNameField } from './SchoolNameField';
import { expandSchoolName } from '../utils/schoolName';

interface StudentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: StudentProfile;
  onSaveProfile: (profile: StudentProfile) => void;
}

const SCHOOL_YEAR_OPTIONS = ['2026학년도', '2027학년도', '2028학년도', '2029학년도', '2030학년도'];

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onSaveProfile,
}) => {
  const [schoolYear, setSchoolYear] = useState(currentProfile.schoolYear || '2026학년도');
  const [schoolName, setSchoolName] = useState(currentProfile.schoolName || '');
  const [grade, setGrade] = useState<number>(currentProfile.grade || 1);
  const [classNum, setClassNum] = useState<number>(currentProfile.classNum || 1);
  const [studentNum, setStudentNum] = useState<number>(currentProfile.studentNum || 1);
  const [name, setName] = useState(currentProfile.name || '');
  const [error, setError] = useState<string | null>(null);
  const [registeredSchools, setRegisteredSchools] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setSchoolYear(currentProfile.schoolYear || '2026학년도');
    setSchoolName(currentProfile.schoolName || '');
    setGrade(currentProfile.grade || 1);
    setClassNum(currentProfile.classNum || 1);
    setStudentNum(currentProfile.studentNum || 1);
    setName(currentProfile.name || '');
    setError(null);
    void apiListSchools().then((schools) => {
      const localNames = getRecentStudentAccounts().map((acc) => acc.schoolName).filter(Boolean);
      if (currentProfile.schoolName) localNames.push(currentProfile.schoolName);
      setRegisteredSchools(Array.from(new Set([...schools, ...localNames])));
    });
  }, [isOpen, currentProfile]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedSchool = expandSchoolName(schoolName);
    const trimmedName = name.trim();

    if (!trimmedSchool) {
      setError('학교명을 입력해주세요.');
      return;
    }
    if (!trimmedName) {
      setError('이름이나 닉네임을 입력해주세요.');
      return;
    }

    onSaveProfile({
      ...currentProfile,
      schoolYear,
      schoolName: trimmedSchool,
      grade,
      classNum,
      studentNum,
      name: trimmedName,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-stone-900 border border-stone-700/80 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl text-stone-100 overflow-visible relative">
        {/* Glow accent */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-stone-100 flex items-center gap-2">
                <span>학생 정보 및 학급 설정</span>
              </h3>
              <p className="text-xs text-stone-400">
                학년도·학교·학년·반·번호를 설정하여 우리 반 순위표와 독후감에 반영하세요
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* 1. 학년도 (School Year) */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-300 mb-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>학년도</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {SCHOOL_YEAR_OPTIONS.map((yr) => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setSchoolYear(yr)}
                  className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                    schoolYear === yr
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-semibold'
                      : 'bg-stone-800/80 border-stone-700 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>
          </div>

          {/* 2. 학교명 (School Name) */}
          <div>
            <label className="flex items-center justify-between text-xs font-semibold text-stone-300 mb-1.5">
              <span className="flex items-center gap-1.5">
                <School className="w-3.5 h-3.5 text-amber-400" />
                <span>학교명</span>
              </span>
              <span className="text-[11px] font-normal text-stone-500">예: 가온중학교, 한국고등학교</span>
            </label>
            <SchoolNameField
              value={schoolName}
              onChange={(next) => {
                setSchoolName(next);
                if (error) setError(null);
              }}
              schools={registeredSchools}
              placeholder="학교 이름을 입력하세요 (예: 가온중학교)"
              inputClassName="w-full px-3.5 py-2.5 rounded-xl bg-stone-800/90 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
            />
            {registeredSchools.length > 0 && (
              <p className="text-[11px] text-stone-500 mt-1.5">등록된 학교명이 입력 시 목록으로 나타납니다.</p>
            )}
          </div>

          {/* 3. 학년 & 반 (Grade & Class) */}
          <div className="grid grid-cols-2 gap-3">
            {/* 학년 */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-300 mb-1.5">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>학년</span>
              </label>
              <select
                id="select-grade"
                value={grade}
                onChange={(e) => setGrade(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2.5 rounded-xl bg-stone-800/90 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-400"
              >
                {[1, 2, 3, 4, 5, 6].map((g) => (
                  <option key={g} value={g}>
                    {g}학년
                  </option>
                ))}
              </select>
            </div>

            {/* 반 */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-300 mb-1.5">
                <Hash className="w-3.5 h-3.5 text-amber-400" />
                <span>반</span>
              </label>
              <select
                id="select-class-num"
                value={classNum}
                onChange={(e) => setClassNum(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2.5 rounded-xl bg-stone-800/90 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-400"
              >
                {Array.from({ length: 15 }, (_, i) => i + 1).map((c) => (
                  <option key={c} value={c}>
                    {c}반
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. 번호 & 이름 (Number & Name) */}
          <div className="grid grid-cols-2 gap-3">
            {/* 번호 */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-300 mb-1.5">
                <Hash className="w-3.5 h-3.5 text-amber-400" />
                <span>번호</span>
              </label>
              <select
                id="select-student-num"
                value={studentNum}
                onChange={(e) => setStudentNum(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2.5 rounded-xl bg-stone-800/90 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-400"
              >
                {Array.from({ length: 40 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}번
                  </option>
                ))}
              </select>
            </div>

            {/* 이름 / 닉네임 */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-300 mb-1.5">
                <User className="w-3.5 h-3.5 text-amber-400" />
                <span>이름 (또는 닉네임)</span>
              </label>
              <input
                type="text"
                id="input-student-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="예: 김지민"
                maxLength={12}
                className="w-full px-3 py-2.5 rounded-xl bg-stone-800/90 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Effort ranking explanation notice */}
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="text-amber-300">노력형 순위표 안내:</strong> 최고 타자 속도뿐만 아니라,
              <span className="text-stone-100 font-semibold"> 누적 필사 글자수와 완주 횟수, 성실한 연습 시간</span>이 점수로 집계되어 꾸준히 노력하는 학생이 높은 순위에 오릅니다.
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 text-sm font-medium transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              id="btn-save-student-profile"
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-sm font-bold flex items-center gap-1.5 shadow-lg transition-all"
            >
              <Check className="w-4 h-4" />
              <span>학급 정보 저장</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
