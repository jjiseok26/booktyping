import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Award, RotateCcw, BarChart3, BookOpen, Clock, Target, Zap, AlertTriangle, ArrowRight, Trophy, Sparkles, School, FileText, Printer } from 'lucide-react';
import { TypingSessionResult, BookExcerpt, StudentProfile } from '../types';

interface SessionCompletionModalProps {
  result: TypingSessionResult;
  book: BookExcerpt;
  studentProfile?: StudentProfile;
  onRestart: () => void;
  onSelectAnotherBook: () => void;
  onGoToDashboard: () => void;
  onGoToLeaderboard?: () => void;
  onWriteBookReport?: () => void;
}

export const SessionCompletionModal: React.FC<SessionCompletionModalProps> = ({
  result,
  book,
  studentProfile,
  onRestart,
  onSelectAnotherBook,
  onGoToDashboard,
  onGoToLeaderboard,
  onWriteBookReport,
}) => {
  useEffect(() => {
    // Fire festive literary confetti
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#f59e0b', '#10b981', '#6366f1', '#ec4899', '#f97316'],
    });
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins > 0 ? `${mins}분 ` : ''}${secs}초`;
  };

  // Literary evaluation comment based on CPM and accuracy
  const getLiteraryAppraisal = (cpm: number, accuracy: number) => {
    if (accuracy >= 98 && cpm >= 400) {
      return '장인의 손끝처럼 흐트러짐 없이 유려한 필사였습니다. 원작의 운율과 완벽하게 호흡하셨습니다.';
    }
    if (accuracy >= 95 && cpm >= 300) {
      return '문장 하나하나에 깊은 정성과 안정적인 속도가 돋보이는 훌륭한 필사였습니다.';
    }
    if (accuracy >= 90) {
      return '글귀의 의미를 음미하며 차분하게 완주하셨습니다. 손끝에 문학의 여운이 맴돕니다.';
    }
    return '한 걸음씩 활자를 마주하며 끝까지 작품을 완성해낸 멋진 도전이었습니다.';
  };

  const topMistypes = Object.entries(result.mistypedLetters)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const earnedPoints = result.earnedEffortPoints || Math.round(result.totalChars * 1.2 + 150 + result.durationSeconds * 0.8);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75 backdrop-blur-md animate-fade-in">
      <div className="bg-stone-900 border border-stone-700/80 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl text-stone-100 overflow-hidden relative">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header with emblem */}
        <div className="text-center mb-5">
          <div className="inline-flex p-3 rounded-2xl bg-amber-500/20 border border-amber-400/30 text-amber-300 mb-2.5 shadow-inner">
            <Award className="w-8 h-8" />
          </div>
          <span className="block text-xs font-mono text-amber-400 tracking-wider uppercase mb-1">
            Transcription Completed
          </span>
          <h2 className="font-batang text-2xl sm:text-3xl font-bold text-stone-100">
            작품 필사를 완주하셨습니다
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-stone-400">
            《{book.bookTitle}》 · {book.title} ({book.author})
          </p>
        </div>

        {/* Class effort score celebration banner */}
        <div className="bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-500/20 border border-amber-400/30 rounded-2xl p-3.5 mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <span>노력 열정 점수 획득!</span>
                <span className="font-mono text-stone-100 text-sm">+{earnedPoints}점</span>
              </div>
              <p className="text-[11px] text-stone-400">
                {studentProfile
                  ? `${studentProfile.schoolName} ${studentProfile.grade}-${studentProfile.classNum}반 순위표에 반영되었습니다.`
                  : '우리 반 순위표에 점수가 가산되었습니다.'}
              </p>
            </div>
          </div>

          {onGoToLeaderboard && (
            <button
              onClick={onGoToLeaderboard}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold shrink-0 flex items-center gap-1 shadow-sm transition-colors"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>반 순위 보기</span>
            </button>
          )}
        </div>

        {/* Literary Appraisal Card */}
        <div className="bg-stone-800/80 border border-stone-700/70 rounded-2xl p-3.5 mb-5 text-center">
          <p className="font-batang text-xs sm:text-sm text-amber-200 leading-relaxed italic">
            "{getLiteraryAppraisal(result.cpm, result.accuracy)}"
          </p>
        </div>

        {/* Core Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
          <div className="bg-stone-800/60 border border-stone-700/60 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-stone-400 mb-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>평균 타수</span>
            </div>
            <div className="text-2xl font-bold font-mono text-amber-400">
              {result.cpm}
            </div>
            <div className="text-[10px] text-stone-500">타/분 (CPM)</div>
          </div>

          <div className="bg-stone-800/60 border border-stone-700/60 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-stone-400 mb-1">
              <Target className="w-3.5 h-3.5 text-emerald-400" />
              <span>정확도</span>
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {result.accuracy}%
            </div>
            <div className="text-[10px] text-stone-500">
              {result.errorCount === 0 ? '무결점 완주' : `오타 ${result.errorCount}회`}
            </div>
          </div>

          <div className="bg-stone-800/60 border border-stone-700/60 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-stone-400 mb-1">
              <Award className="w-3.5 h-3.5 text-sky-400" />
              <span>최고 타수</span>
            </div>
            <div className="text-2xl font-bold font-mono text-sky-400">
              {result.peakCpm}
            </div>
            <div className="text-[10px] text-stone-500">순간 최고 속도</div>
          </div>

          <div className="bg-stone-800/60 border border-stone-700/60 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-stone-400 mb-1">
              <Clock className="w-3.5 h-3.5 text-violet-400" />
              <span>소요 시간</span>
            </div>
            <div className="text-2xl font-bold font-mono text-violet-400">
              {formatTime(result.durationSeconds)}
            </div>
            <div className="text-[10px] text-stone-500">{result.totalChars}자 필사</div>
          </div>
        </div>

        {/* Mistype Analysis (if any) */}
        {topMistypes.length > 0 && (
          <div className="bg-stone-800/40 border border-stone-700/40 rounded-xl p-2.5 mb-5 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-stone-400">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>자주 헛갈린 글자:</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {topMistypes.map(([char, count]) => (
                <span
                  key={char}
                  className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono"
                >
                  '{char === ' ' ? '공백' : char}' {count}회
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Book Report CTA Card (Key Feature) */}
        {onWriteBookReport && (
          <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/25 to-amber-500/15 border border-amber-400/40 rounded-2xl p-4 mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3 text-left w-full sm:w-auto">
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center shrink-0 shadow-md">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-stone-100 flex items-center gap-2">
                  <span>《{book.bookTitle}》 독후감 작성</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-mono">
                    A4 PDF 인쇄
                  </span>
                </div>
                <p className="text-xs text-stone-300 mt-0.5">
                  전편을 모두 필사했으니 이제 독후감을 남길 수 있습니다. 감상문은 PDF로 바로 인쇄할 수 있습니다.
                </p>
              </div>
            </div>

            <button
              id="btn-modal-write-book-report"
              onClick={onWriteBookReport}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg transition-all active:scale-95 shrink-0"
            >
              <FileText className="w-4 h-4" />
              <span>독후감 작성 및 PDF 인쇄</span>
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <button
            onClick={onRestart}
            className="w-full sm:w-auto flex-1 py-3 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>이 작품 다시 쓰기</span>
          </button>

          <button
            onClick={onSelectAnotherBook}
            className="w-full sm:w-auto flex-1 py-3 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            <span>다른 책 고르기</span>
          </button>

          {onGoToLeaderboard ? (
            <button
              onClick={onGoToLeaderboard}
              className="w-full sm:w-auto flex-1 py-3 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg transition-all"
            >
              <Trophy className="w-4 h-4" />
              <span>반 순위표 확인</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onGoToDashboard}
              className="w-full sm:w-auto flex-1 py-3 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg transition-all"
            >
              <BarChart3 className="w-4 h-4" />
              <span>통계 대시보드</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

