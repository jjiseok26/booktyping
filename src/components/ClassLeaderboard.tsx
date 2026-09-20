import React, { useState, useMemo, useEffect } from 'react';
import {
  Trophy,
  Award,
  Zap,
  BookOpen,
  Target,
  Sparkles,
  Users,
  Flame,
  ArrowUpRight,
  TrendingUp,
  SlidersHorizontal,
  ChevronRight,
  CheckCircle2,
  Calendar,
  School,
  GraduationCap,
  LogIn,
  Eye,
} from 'lucide-react';
import { StudentProfile, StudentRankRecord, RankSortMode, TypingSessionResult, StudentAccount } from '../types';
import { getClassLeaderboard, getSampleClassLeaderboard, sortLeaderboard } from '../utils/storage';
import { apiGetLeaderboard } from '../utils/dbClient';

interface ClassLeaderboardProps {
  currentProfile: StudentProfile;
  userHistory: TypingSessionResult[];
  onOpenProfileModal: () => void;
  onStartTyping: () => void;
  currentAccount?: StudentAccount | null;
  onOpenAuthModal?: (mode?: 'login' | 'register') => void;
}

export const ClassLeaderboard: React.FC<ClassLeaderboardProps> = ({
  currentProfile,
  userHistory,
  onOpenProfileModal,
  onStartTyping,
  currentAccount,
  onOpenAuthModal,
}) => {
  const [selectedClassNum, setSelectedClassNum] = useState<number>(currentProfile.classNum);
  const [sortMode, setSortMode] = useState<RankSortMode>('effort');
  const [showSamplePeers, setShowSamplePeers] = useState<boolean>(false);
  const [dbRecords, setDbRecords] = useState<StudentRankRecord[] | null>(null);

  useEffect(() => {
    if (!currentProfile.schoolName) {
      setDbRecords([]);
      return;
    }
    let cancelled = false;
    void apiGetLeaderboard({
      schoolYear: currentProfile.schoolYear,
      schoolName: currentProfile.schoolName,
      grade: currentProfile.grade,
      classNum: selectedClassNum,
      currentStudentId: currentAccount?.id || currentProfile.accountId,
    })
      .then((records) => {
        if (!cancelled) setDbRecords(records);
      })
      .catch(() => {
        if (!cancelled) setDbRecords(null);
      });
    return () => {
      cancelled = true;
    };
  }, [
    currentProfile.schoolYear,
    currentProfile.schoolName,
    currentProfile.grade,
    currentProfile.accountId,
    selectedClassNum,
    currentAccount?.id,
  ]);

  // Compute leaderboard records for the active class
  const rawRecords = useMemo(() => {
    const liveRecords = dbRecords ?? getClassLeaderboard(currentProfile, userHistory, selectedClassNum);
    if (showSamplePeers) {
      return getSampleClassLeaderboard(currentProfile, userHistory, selectedClassNum, liveRecords);
    }
    return liveRecords;
  }, [currentProfile, userHistory, selectedClassNum, showSamplePeers, dbRecords]);

  // Sort according to active mode
  const sortedRecords = useMemo(() => {
    return sortLeaderboard(rawRecords, sortMode);
  }, [rawRecords, sortMode]);

  // Find current user's rank
  const currentUserIndex = sortedRecords.findIndex((r) => r.isCurrentUser);
  const currentUserRank = currentUserIndex !== -1 ? currentUserIndex + 1 : null;
  const currentUserRecord = currentUserIndex !== -1 ? sortedRecords[currentUserIndex] : null;

  // Next rank target points calculation
  const pointsToNextRank =
    currentUserIndex > 0
      ? sortedRecords[currentUserIndex - 1].effortScore - (currentUserRecord?.effortScore || 0)
      : null;

  // Class overall summary stats
  const classSummary = useMemo(() => {
    const totalClassChars = rawRecords.reduce((sum, r) => sum + r.totalChars, 0);
    const totalClassSessions = rawRecords.reduce((sum, r) => sum + r.completedSessions, 0);
    const avgClassCpm =
      rawRecords.length > 0 ? Math.round(rawRecords.reduce((sum, r) => sum + r.avgCpm, 0) / rawRecords.length) : 0;
    const maxClassCpm =
      rawRecords.length > 0 ? Math.max(...rawRecords.map((r) => r.peakCpm), 0) : 0;
    return {
      studentCount: rawRecords.length,
      totalChars: totalClassChars,
      totalSessions: totalClassSessions,
      avgCpm: avgClassCpm,
      maxCpm: maxClassCpm,
    };
  }, [rawRecords]);

  // Max effort score for progress bar scaling
  const maxEffortScore = Math.max(...sortedRecords.map((r) => r.effortScore), 1000);

  const topThree = sortedRecords.slice(0, 3);
  const remainingStudents = sortedRecords.slice(3);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Banner: School & Class Info + Switcher */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 mb-8 text-stone-100 shadow-xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold">
                <Calendar className="w-3.5 h-3.5" />
                {currentProfile.schoolYear}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-800 text-stone-300 border border-stone-700 text-xs font-medium">
                <School className="w-3.5 h-3.5 text-stone-400" />
                {currentProfile.schoolName}
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-400/10 text-amber-200 border border-amber-400/20 text-xs font-medium">
                {currentProfile.grade}학년 {selectedClassNum}반
              </span>
              {currentAccount ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-medium">
                  <GraduationCap className="w-3.5 h-3.5" />
                  학생 로그인됨 ({currentAccount.name})
                </span>
              ) : (
                onOpenAuthModal && (
                  <button
                    onClick={() => onOpenAuthModal('login')}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-all shadow-sm active:scale-95"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    학생 로그인
                  </button>
                )
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold font-batang tracking-tight text-stone-100 flex items-center gap-3">
              <span>{currentProfile.schoolName} {currentProfile.grade}학년 {selectedClassNum}반 순위표</span>
              <Trophy className="w-6 h-6 text-amber-400 shrink-0" />
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-stone-400">
              학급 친구들과 문학 작품을 함께 필사하며 타자 실력과 성실한 노력을 겨루는 우리 반 순위표입니다.
            </p>
          </div>

          {/* Profile pill & Edit button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            <div className="bg-stone-800/90 border border-stone-700/80 rounded-2xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center justify-center font-bold font-mono">
                {currentProfile.studentNum}번
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm text-stone-100">{currentProfile.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-medium">본인</span>
                </div>
                <div className="text-xs text-stone-400">
                  {currentUserRank ? (
                    <span className="text-amber-300 font-semibold">우리 반 {currentUserRank}위</span>
                  ) : (
                    '순위 집계 중'
                  )}{' '}
                  · 노력점수 {currentUserRecord?.effortScore.toLocaleString()}점
                </div>
              </div>
            </div>

            <button
              id="btn-open-profile-edit"
              onClick={onOpenProfileModal}
              className="px-4 py-3 rounded-2xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4 text-amber-400" />
              <span>내 학급 정보 수정</span>
            </button>
          </div>
        </div>

        {/* Class Selection Chips (1반 ~ 8반) */}
        <div className="mt-6 pt-5 border-t border-stone-800 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-stone-400 mr-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-stone-400" />
              <span>반 둘러보기:</span>
            </span>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((cNum) => (
              <button
                key={cNum}
                onClick={() => setSelectedClassNum(cNum)}
                className={`px-3 py-1 rounded-xl text-xs font-medium transition-all ${
                  selectedClassNum === cNum
                    ? 'bg-amber-500 text-stone-950 font-bold shadow-md'
                    : 'bg-stone-800/80 text-stone-400 hover:text-stone-200 hover:bg-stone-800 border border-stone-700/60'
                }`}
              >
                {cNum}반 {cNum === currentProfile.classNum ? '(우리반)' : ''}
              </button>
            ))}
          </div>

          <div className="text-xs text-stone-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>최신 연습 데이터 실시간 반영 중</span>
          </div>
        </div>
      </div>

      {/* Class Overview Statistics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-8">
        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1.5">
            <span className="flex items-center gap-1.5 font-medium">
              <BookOpen className="w-3.5 h-3.5 text-amber-600" />
              우리 반 총 필사량
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-stone-900">
            {classSummary.totalChars.toLocaleString()}
            <span className="text-xs font-normal text-stone-500 ml-1">자</span>
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">총 {classSummary.totalSessions}편 완주</div>
        </div>

        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1.5">
            <span className="flex items-center gap-1.5 font-medium">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              우리 반 평균 타수
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-stone-900">
            {classSummary.avgCpm}
            <span className="text-xs font-normal text-stone-500 ml-1">CPM</span>
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">분당 타자 속도</div>
        </div>

        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1.5">
            <span className="flex items-center gap-1.5 font-medium">
              <Award className="w-3.5 h-3.5 text-sky-600" />
              우리 반 최고 타수
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-stone-900">
            {classSummary.maxCpm}
            <span className="text-xs font-normal text-stone-500 ml-1">CPM</span>
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">학급 내 순간 최고 속도</div>
        </div>

        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1.5">
            <span className="flex items-center gap-1.5 font-medium">
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              참여 학급 학생
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-stone-900">
            {classSummary.studentCount}
            <span className="text-xs font-normal text-stone-500 ml-1">명</span>
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">열정적으로 연습 중</div>
        </div>
      </div>

      {/* Effort-Centric Philosophy Callout */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border border-amber-300/40 rounded-2xl p-4 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-700 shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
              <span>노력 중심 열정 순위표 (Effort-First Ranking)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-stone-950 font-bold">
                추천 방식
              </span>
            </h2>
            <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
              본 순위표는 순간 속도뿐만 아니라, <strong className="text-amber-800">성실하게 필사한 누적 글자수(1자당 1점)</strong>와{' '}
              <strong className="text-amber-800">완주 횟수(1편당 150점)</strong>, <strong className="text-amber-800">정확도 가산점</strong>을 가중 반영하여{' '}
              <strong>열심히 노력한 학생이 가장 높은 순위에 오르도록</strong> 설계되었습니다.
            </p>
          </div>
        </div>

        <button
          onClick={onStartTyping}
          className="shrink-0 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
        >
          <span>지금 필사하고 점수 올리기</span>
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      {/* Leaderboard Sorting Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6 pb-2 border-b border-stone-200">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="tab-sort-effort"
            onClick={() => setSortMode('effort')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              sortMode === 'effort'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>🌟 종합 노력왕 (열정 점수순)</span>
          </button>

          <button
            id="tab-sort-volume"
            onClick={() => setSortMode('volume')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              sortMode === 'volume'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>📚 누적 필사왕 (글자수순)</span>
          </button>

          <button
            id="tab-sort-speed"
            onClick={() => setSortMode('speed')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              sortMode === 'speed'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>⚡ 최고 타수왕 (속도순)</span>
          </button>

          <button
            id="tab-sort-accuracy"
            onClick={() => setSortMode('accuracy')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              sortMode === 'accuracy'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>🎯 정확도 장인 (정확도순)</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSamplePeers((prev) => !prev)}
            className={`text-xs px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all ${
              showSamplePeers
                ? 'bg-amber-500/15 border-amber-400/40 text-amber-800 font-medium'
                : 'bg-stone-50 border-stone-200 text-stone-600 hover:text-stone-900'
            }`}
            title="기록이 없을 때 화면 구성을 미리 살펴볼 수 있는 가상 급우 데이터입니다."
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{showSamplePeers ? '실제 데이터만 보기' : '예시 급우 데이터로 미리보기'}</span>
          </button>
          <div className="text-xs text-stone-500 font-mono">
            총 {sortedRecords.length}명의 학생 집계
          </div>
        </div>
      </div>

      {/* When no records exist in this class */}
      {sortedRecords.length === 0 && (
        <div className="bg-white border border-stone-200 rounded-3xl p-8 mb-8 text-center max-w-xl mx-auto shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200/60 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-stone-900 mb-1">
            {currentProfile.schoolName || '우리 학교'} {currentProfile.grade}학년 {selectedClassNum}반의 첫 기록을 남겨보세요!
          </h3>
          <p className="text-xs text-stone-500 leading-relaxed mb-6">
            아직 필사를 완료한 학생이나 등록된 학급 계정이 없습니다. 학생 본인 성명으로 가입하거나 타자 연습을 완료하면 순위표에 실시간으로 반영됩니다.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {onOpenAuthModal && (
              <button
                onClick={() => onOpenAuthModal('register')}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
              >
                <LogIn className="w-4 h-4" />
                <span>학생 회원가입 / 로그인</span>
              </button>
            )}
            <button
              onClick={onStartTyping}
              className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-100 font-semibold text-xs shadow-sm transition-all flex items-center gap-1.5"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>타자 연습 시작하기</span>
            </button>
            <button
              onClick={() => setShowSamplePeers(true)}
              className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium transition-all flex items-center gap-1"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>예시 급우 데이터로 살펴보기</span>
            </button>
          </div>
        </div>
      )}

      {/* Top 3 Podium (Honor Roll) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* 2nd Place */}
        {topThree[1] && (
          <div
            className={`bg-white border rounded-3xl p-5 shadow-sm order-2 md:order-1 transition-all ${
              topThree[1].isCurrentUser ? 'border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/20' : 'border-stone-200'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold font-mono text-sm flex items-center justify-center border border-slate-300">
                2위
              </span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                🥈 은메달
              </span>
            </div>
            <div className="text-center py-2">
              <div className="text-lg font-bold text-stone-900 flex items-center justify-center gap-1.5">
                <span>{topThree[1].profile.name}</span>
                <span className="text-xs font-normal text-stone-500">({topThree[1].profile.studentNum}번)</span>
                {topThree[1].isCurrentUser && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-stone-950 font-bold">나</span>
                )}
              </div>
              <div className="mt-1 inline-block text-xs text-amber-700 font-semibold bg-amber-100/60 px-2.5 py-0.5 rounded-full">
                {topThree[1].titleBadge}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-stone-100 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-stone-500">노력 열정점수</span>
                <span className="font-bold font-mono text-amber-600 text-sm">
                  {topThree[1].effortScore.toLocaleString()}점
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">누적 필사</span>
                <span className="font-mono text-stone-700">
                  {topThree[1].totalChars.toLocaleString()}자 ({topThree[1].completedSessions}편)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">최고 타수 / 정확도</span>
                <span className="font-mono text-stone-700">
                  {topThree[1].peakCpm} CPM / {topThree[1].avgAccuracy}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 1st Place (Champion) */}
        {topThree[0] && (
          <div
            className={`bg-gradient-to-b from-amber-500/10 to-amber-500/5 border-2 rounded-3xl p-6 shadow-md order-1 md:order-2 transform md:-translate-y-2 relative overflow-hidden ${
              topThree[0].isCurrentUser
                ? 'border-amber-500 ring-4 ring-amber-400/20'
                : 'border-amber-400'
            }`}
          >
            <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-amber-400/20 rounded-full blur-xl pointer-events-none" />

            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <span className="w-9 h-9 rounded-full bg-amber-400 text-stone-950 font-bold font-mono text-base flex items-center justify-center shadow-md">
                  1위
                </span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500 text-stone-950 shadow-sm">
                  🏆 학급 챔피언
                </span>
              </div>
              <span className="text-xs font-semibold text-amber-800">🥇 금메달</span>
            </div>

            <div className="text-center py-2">
              <div className="text-xl font-bold text-stone-950 flex items-center justify-center gap-1.5">
                <span>{topThree[0].profile.name}</span>
                <span className="text-xs font-normal text-stone-600">({topThree[0].profile.studentNum}번)</span>
                {topThree[0].isCurrentUser && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-900 text-amber-400 font-bold">나</span>
                )}
              </div>
              <div className="mt-1.5 inline-block text-xs text-amber-900 font-bold bg-amber-300/80 px-3 py-0.5 rounded-full shadow-xs">
                {topThree[0].titleBadge}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-amber-300/40 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-stone-600 font-medium">노력 열정점수</span>
                <span className="font-bold font-mono text-amber-700 text-base">
                  {topThree[0].effortScore.toLocaleString()}점
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-600">누적 필사</span>
                <span className="font-mono text-stone-800 font-semibold">
                  {topThree[0].totalChars.toLocaleString()}자 ({topThree[0].completedSessions}편)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-600">최고 타수 / 정확도</span>
                <span className="font-mono text-stone-800 font-semibold">
                  {topThree[0].peakCpm} CPM / {topThree[0].avgAccuracy}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 3rd Place */}
        {topThree[2] && (
          <div
            className={`bg-white border rounded-3xl p-5 shadow-sm order-3 md:order-3 transition-all ${
              topThree[2].isCurrentUser ? 'border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/20' : 'border-stone-200'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-900 font-bold font-mono text-sm flex items-center justify-center border border-amber-300">
                3위
              </span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
                🥉 동메달
              </span>
            </div>
            <div className="text-center py-2">
              <div className="text-lg font-bold text-stone-900 flex items-center justify-center gap-1.5">
                <span>{topThree[2].profile.name}</span>
                <span className="text-xs font-normal text-stone-500">({topThree[2].profile.studentNum}번)</span>
                {topThree[2].isCurrentUser && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-stone-950 font-bold">나</span>
                )}
              </div>
              <div className="mt-1 inline-block text-xs text-amber-700 font-semibold bg-amber-100/60 px-2.5 py-0.5 rounded-full">
                {topThree[2].titleBadge}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-stone-100 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-stone-500">노력 열정점수</span>
                <span className="font-bold font-mono text-amber-600 text-sm">
                  {topThree[2].effortScore.toLocaleString()}점
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">누적 필사</span>
                <span className="font-mono text-stone-700">
                  {topThree[2].totalChars.toLocaleString()}자 ({topThree[2].completedSessions}편)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">최고 타수 / 정확도</span>
                <span className="font-mono text-stone-700">
                  {topThree[2].peakCpm} CPM / {topThree[2].avgAccuracy}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Full Leaderboard Table */}
      <div className="bg-white border border-stone-200/90 rounded-3xl shadow-sm overflow-hidden mb-12">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-sm text-stone-900">학급 전체 학생 순위 상세</h3>
          </div>
          <span className="text-xs text-stone-400">기준: {sortMode === 'effort' ? '열정 점수 (노력+완주)' : sortMode === 'speed' ? '최고 타수' : sortMode === 'volume' ? '누적 글자수' : '정확도'}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-stone-100/75 text-stone-500 font-medium text-[11px] sm:text-xs border-b border-stone-200">
                <th className="py-3 px-4 text-center w-14">순위</th>
                <th className="py-3 px-4">학생 정보</th>
                <th className="py-3 px-4">노력 열정 점수</th>
                <th className="py-3 px-4 text-right">누적 필사량</th>
                <th className="py-3 px-4 text-right">최고 / 평균 타수</th>
                <th className="py-3 px-4 text-right">정확도</th>
                <th className="py-3 px-4 text-center">칭호</th>
                <th className="py-3 px-4 text-right text-stone-400">최근 활동</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {sortedRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 px-4 text-center">
                    <div className="max-w-sm mx-auto space-y-2">
                      <p className="text-sm font-semibold text-stone-800">
                        아직 집계된 학급 필사 기록이 없습니다
                      </p>
                      <p className="text-xs text-stone-500">
                        학생 로그인 후 필사를 완료하거나 [예시 급우 데이터로 미리보기]를 켜서 순위표 예시를 확인하실 수 있습니다.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedRecords.map((record, index) => {
                const rank = index + 1;
                const effortPercentage = Math.min(100, Math.round((record.effortScore / maxEffortScore) * 100));

                return (
                  <tr
                    key={record.id}
                    className={`transition-colors ${
                      record.isCurrentUser
                        ? 'bg-amber-50/70 font-semibold border-l-4 border-l-amber-500'
                        : 'hover:bg-stone-50/80'
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-3.5 px-4 text-center">
                      {rank === 1 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-stone-950 font-bold text-xs shadow-xs">
                          1
                        </span>
                      ) : rank === 2 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-800 font-bold text-xs">
                          2
                        </span>
                      ) : rank === 3 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-200 text-amber-900 font-bold text-xs">
                          3
                        </span>
                      ) : (
                        <span className="font-mono text-stone-500 font-medium">{rank}</span>
                      )}
                    </td>

                    {/* Student Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-stone-400 w-7">{record.profile.studentNum}번</span>
                        <span className="font-medium text-stone-900">{record.profile.name}</span>
                        {record.isCurrentUser && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500 text-stone-950 font-bold text-[10px]">
                            나
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Effort Score & Progress Bar */}
                    <td className="py-3.5 px-4">
                      <div className="w-full max-w-[140px]">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold font-mono text-amber-700">
                            {record.effortScore.toLocaleString()}점
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-stone-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              record.isCurrentUser ? 'bg-amber-500' : 'bg-stone-400'
                            }`}
                            style={{ width: `${effortPercentage}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Volume: Chars & Sessions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-mono font-medium text-stone-800">
                        {record.totalChars.toLocaleString()}자
                      </div>
                      <div className="text-[11px] text-stone-400">{record.completedSessions}회 완주</div>
                    </td>

                    {/* CPM: Peak / Avg */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-mono font-bold text-amber-600">{record.peakCpm} CPM</div>
                      <div className="text-[11px] text-stone-400 font-mono">평균 {record.avgCpm} CPM</div>
                    </td>

                    {/* Accuracy */}
                    <td className="py-3.5 px-4 text-right">
                      <span
                        className={`font-mono font-semibold ${
                          record.avgAccuracy >= 98
                            ? 'text-emerald-600'
                            : record.avgAccuracy >= 95
                            ? 'text-stone-800'
                            : 'text-stone-600'
                        }`}
                      >
                        {record.avgAccuracy}%
                      </span>
                    </td>

                    {/* Title Badge */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 text-[11px] font-medium border border-stone-200/60">
                        {record.titleBadge}
                      </span>
                    </td>

                    {/* Last active */}
                    <td className="py-3.5 px-4 text-right text-stone-400 text-xs">
                      {record.lastActive}
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Bottom Bar: Quick summary of current user's standing */}
      {currentUserRecord && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-11/12 max-w-4xl z-30 bg-stone-900/95 text-stone-100 backdrop-blur-md border border-stone-700 rounded-2xl p-3.5 sm:px-6 shadow-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-stone-950 font-bold flex items-center justify-center font-mono text-base shrink-0 shadow">
              {currentUserRank}위
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-stone-100">
                  {currentProfile.name} ({currentProfile.studentNum}번)
                </span>
                <span className="text-xs text-amber-400 font-mono font-semibold">
                  {currentUserRecord.effortScore.toLocaleString()}점
                </span>
              </div>
              <p className="text-xs text-stone-400">
                {pointsToNextRank !== null && pointsToNextRank > 0 ? (
                  <>
                    다음 순위까지 <strong className="text-amber-300 font-mono">{pointsToNextRank.toLocaleString()}점</strong> 남았습니다. 문학 작품을 완주해보세요!
                  </>
                ) : (
                  <span className="text-emerald-400 font-semibold">현재 우리 반 1위 챔피언입니다! 축하합니다! 🎉</span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onStartTyping}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 shrink-0 transition-colors shadow"
          >
            <span>타자 연습하기</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
