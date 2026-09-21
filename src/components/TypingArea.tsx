import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Zap,
  Target,
  AlertCircle,
  RotateCcw,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { BookExcerpt, TypingSettings, TypingSessionResult, StudentProfile } from '../types';
import { decomposeChar, countTotalStrokes, compareCharAccuracy } from '../utils/hangul';
import { playKeySound, playCompletionSound } from '../utils/sound';
import { calculateSessionEffortPoints } from '../utils/storage';
import { getTypingSentences } from '../data/books';
import { SessionCompletionModal } from './SessionCompletionModal';
import { saveParagraphNote } from '../utils/paragraphNotes';

interface TypingAreaProps {
  book: BookExcerpt;
  settings: TypingSettings;
  onUpdateSettings: (newSettings: Partial<TypingSettings>) => void;
  onSelectAnotherBook: () => void;
  onSaveSession: (result: TypingSessionResult) => void;
  onGoToDashboard: () => void;
  studentProfile?: StudentProfile;
  onGoToLeaderboard?: () => void;
  onWriteBookReport?: (book: BookExcerpt, result: TypingSessionResult) => void;
}

export const TypingArea: React.FC<TypingAreaProps> = ({
  book,
  settings,
  onUpdateSettings,
  onSelectAnotherBook,
  onSaveSession,
  onGoToDashboard,
  studentProfile,
  onGoToLeaderboard,
  onWriteBookReport,
}) => {
  const activeSentences = useMemo(() => getTypingSentences(book), [book]);

  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [paragraphPrompt, setParagraphPrompt] = useState<{ from: number; to: number } | null>(null);
  const [paragraphDraft, setParagraphDraft] = useState('');

  // Real-time analysis metrics
  const [realtimeCpm, setRealtimeCpm] = useState(0);
  const [peakCpm, setPeakCpm] = useState(0);
  const [realtimeAccuracy, setRealtimeAccuracy] = useState(100);
  const [errorCount, setErrorCount] = useState(0);

  // Session cumulative stats across sentences in this book excerpt
  const [accumulatedCorrectStrokes, setAccumulatedCorrectStrokes] = useState(0);
  const [accumulatedTotalStrokes, setAccumulatedTotalStrokes] = useState(0);
  const [accumulatedChars, setAccumulatedChars] = useState(0);
  const [totalSessionErrors, setTotalSessionErrors] = useState(0);
  const [sessionMistypedLetters, setSessionMistypedLetters] = useState<Record<string, number>>({});

  // Completed session state
  const [completedResult, setCompletedResult] = useState<TypingSessionResult | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const targetSentence = activeSentences[sentenceIndex] || '';

  // Focus input on mount or sentence change
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [sentenceIndex, book.id]);

  // Reset states when book changes
  useEffect(() => {
    setSentenceIndex(0);
    setUserInput('');
    setStartTime(null);
    setElapsedSeconds(0);
    setRealtimeCpm(0);
    setPeakCpm(0);
    setRealtimeAccuracy(100);
    setErrorCount(0);
    setAccumulatedCorrectStrokes(0);
    setAccumulatedTotalStrokes(0);
    setAccumulatedChars(0);
    setTotalSessionErrors(0);
    setSessionMistypedLetters({});
    setCompletedResult(null);
  }, [book.id]);

  // Real-time timer tick to keep CPM and duration fresh
  useEffect(() => {
    if (!startTime || completedResult) return;

    const timer = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.max(0.5, (now - startTime) / 1000);
      setElapsedSeconds(Math.floor(elapsed));

      // Calculate current sentence stroke count
      let currentSentenceStrokes = 0;
      for (let i = 0; i < userInput.length; i++) {
        currentSentenceStrokes += decomposeChar(userInput[i]).strokes;
      }
      const totalStrokesSoFar = accumulatedCorrectStrokes + currentSentenceStrokes;
      const calculatedCpm = Math.round((totalStrokesSoFar / elapsed) * 60);

      setRealtimeCpm(calculatedCpm);
      setPeakCpm((prev) => Math.max(prev, calculatedCpm));
    }, 150);

    return () => clearInterval(timer);
  }, [startTime, accumulatedCorrectStrokes, userInput, completedResult]);

  // Font family class helper
  const fontClass = useMemo(() => {
    switch (settings.font) {
      case 'batang':
        return 'font-batang';
      case 'mono':
        return 'font-mono-kr';
      case 'sans':
      default:
        return 'font-sans-kr';
    }
  }, [settings.font]);

  // Font size class helper
  const fontSizeClass = useMemo(() => {
    switch (settings.fontSize) {
      case 'sm':
        return 'text-lg sm:text-xl leading-relaxed';
      case 'md':
        return 'text-xl sm:text-2xl leading-relaxed';
      case 'xl':
        return 'text-2xl sm:text-4xl leading-loose';
      case 'lg':
      default:
        return 'text-2xl sm:text-3xl leading-relaxed';
    }
  }, [settings.fontSize]);

  // Handle sentence completion or transition to next
  const handleCompleteSentence = useCallback(() => {
    // Record current sentence stats
    let sentenceCorrectStrokes = 0;
    const sentenceTotalTargetStrokes = countTotalStrokes(targetSentence);
    const mistypes: Record<string, number> = { ...sessionMistypedLetters };
    let newErrors = 0;

    for (let i = 0; i < targetSentence.length; i++) {
      const tChar = targetSentence[i];
      const uChar = userInput[i] || '';
      const comp = compareCharAccuracy(tChar, uChar);
      sentenceCorrectStrokes += comp.correctStrokes;

      if (!comp.isExact && uChar) {
        newErrors++;
        mistypes[tChar] = (mistypes[tChar] || 0) + 1;
      }
    }

    const nextCorrect = accumulatedCorrectStrokes + sentenceCorrectStrokes;
    const nextTotalStrokes = accumulatedTotalStrokes + sentenceTotalTargetStrokes;
    const nextChars = accumulatedChars + targetSentence.length;
    const nextErrors = totalSessionErrors + newErrors;

    setAccumulatedCorrectStrokes(nextCorrect);
    setAccumulatedTotalStrokes(nextTotalStrokes);
    setAccumulatedChars(nextChars);
    setTotalSessionErrors(nextErrors);
    setSessionMistypedLetters(mistypes);

    // If this was the final sentence of the active text
    if (sentenceIndex >= activeSentences.length - 1) {
      const totalTime = Math.max(1, elapsedSeconds);
      const finalCpm = Math.round((nextCorrect / totalTime) * 60);
      const finalAccuracy = Math.min(100, Math.max(0, Math.round((nextCorrect / Math.max(1, nextTotalStrokes)) * 100)));

      const earnedPoints = calculateSessionEffortPoints({
        totalChars: nextChars,
        durationSeconds: totalTime,
        accuracy: finalAccuracy,
        cpm: finalCpm || realtimeCpm,
      });

      const sessionResult: TypingSessionResult = {
        id: 'sess-' + Date.now(),
        timestamp: Date.now(),
        excerptId: book.id,
        bookTitle: book.bookTitle,
        author: book.author,
        excerptTitle: `${book.title} (전편 필사)`,
        cpm: finalCpm || realtimeCpm,
        wpm: Math.round((finalCpm || realtimeCpm) / 5),
        peakCpm: Math.max(peakCpm, finalCpm),
        accuracy: finalAccuracy,
        errorCount: nextErrors,
        totalChars: nextChars,
        totalStrokes: nextTotalStrokes,
        durationSeconds: totalTime,
        mistypedLetters: mistypes,
        studentProfile,
        earnedEffortPoints: earnedPoints,
      };

      playCompletionSound(settings.soundVolume);
      onSaveSession(sessionResult);
      setCompletedResult(sessionResult);
    } else {
      // Proceed to next sentence
      setSentenceIndex((prev) => prev + 1);
      setUserInput('');
      setErrorCount(0);
      const nextIndex = sentenceIndex + 1;
      if (nextIndex % 10 === 0 && nextIndex < activeSentences.length) {
        setParagraphDraft('');
        setParagraphPrompt({ from: nextIndex - 9, to: nextIndex });
      }
    }
  }, [
    accumulatedChars,
    accumulatedCorrectStrokes,
    accumulatedTotalStrokes,
    activeSentences.length,
    book,
    elapsedSeconds,
    onSaveSession,
    peakCpm,
    realtimeCpm,
    sentenceIndex,
    sessionMistypedLetters,
    settings.soundVolume,
    targetSentence,
    totalSessionErrors,
    userInput,
  ]);

  // Handle live input change & Korean typing analysis
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    if (!startTime) {
      setStartTime(Date.now());
    }

    // Play tactile mechanical / typewriter sound
    playKeySound(settings.soundType, settings.soundVolume);

    setUserInput(value);

    // Real-time error detection and accuracy calculation
    let currentErrors = 0;
    let currentCorrectStrokes = 0;
    let totalTargetStrokesSoFar = 0;

    for (let i = 0; i < value.length; i++) {
      const tChar = targetSentence[i] || '';
      const uChar = value[i];
      const result = compareCharAccuracy(tChar, uChar);

      currentCorrectStrokes += result.correctStrokes;
      totalTargetStrokesSoFar += result.totalTargetStrokes;

      if (!result.isExact) {
        currentErrors++;
      }
    }

    setErrorCount(currentErrors);

    // Calculate real-time accuracy percentage
    if (value.length > 0) {
      const currentRatio = (currentCorrectStrokes / Math.max(1, totalTargetStrokesSoFar)) * 100;
      const blendedAccuracy = Math.min(100, Math.max(0, Math.round(currentRatio)));
      setRealtimeAccuracy(blendedAccuracy);
    } else {
      setRealtimeAccuracy(100);
    }

    // Check if sentence is completed perfectly
    if (value === targetSentence) {
      setTimeout(() => {
        handleCompleteSentence();
      }, 80);
    }
  };

  // Keyboard navigation & Shortcuts (Enter to advance if done, Esc to restart sentence)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (userInput.length >= targetSentence.length * 0.7) {
        handleCompleteSentence();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setUserInput('');
      setErrorCount(0);
    }
  };

  // Restart current excerpt from beginning
  const handleRestartExcerpt = () => {
    setSentenceIndex(0);
    setUserInput('');
    setStartTime(null);
    setElapsedSeconds(0);
    setRealtimeCpm(0);
    setPeakCpm(0);
    setRealtimeAccuracy(100);
    setErrorCount(0);
    setAccumulatedCorrectStrokes(0);
    setAccumulatedTotalStrokes(0);
    setAccumulatedChars(0);
    setTotalSessionErrors(0);
    setSessionMistypedLetters({});
    setCompletedResult(null);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handlePrevSentence = () => {
    if (sentenceIndex > 0) {
      setSentenceIndex((prev) => prev - 1);
      setUserInput('');
      setErrorCount(0);
    }
  };

  // Progress percentage across active sentences
  const progressPercent = Math.round(
    ((sentenceIndex + userInput.length / Math.max(1, targetSentence.length)) / activeSentences.length) * 100
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6" onClick={() => inputRef.current?.focus()}>
      {/* Book Context Header Card */}
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm p-4 sm:p-5 mb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${book.coverGradient} flex items-center justify-center text-white shadow-sm shrink-0`}>
            <BookOpen className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${book.badgeColor}`}>
                {book.category}
              </span>
              <span className="text-xs text-stone-500 font-medium">
                {book.author} · 《{book.bookTitle}》 ({book.year})
              </span>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                자유이용 만료저작물
              </span>
            </div>
            <h2 className="font-batang text-xl sm:text-2xl font-bold text-stone-900 mt-0.5">
              {book.title}
            </h2>
          </div>
        </div>

        {/* Change Book & Sentence Navigation & Full-Text Toggle */}
        <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200">
            전편 필사 {activeSentences.length}문장
          </span>

          <button
            onClick={onSelectAnotherBook}
            className="px-3 py-1.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5 text-stone-500" />
            <span>작품 변경</span>
          </button>

          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs">
            <button
              onClick={handlePrevSentence}
              disabled={sentenceIndex === 0}
              className="p-1 rounded text-stone-600 hover:bg-white disabled:opacity-30"
              title="이전 문장"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono font-medium text-stone-700">
              {sentenceIndex + 1} / {activeSentences.length}
            </span>
            <span className="p-1 rounded text-stone-400 opacity-40" title="다음 문장은 현재 문장을 모두 입력해야 이어집니다">
              <ChevronRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      </div>

      {/* Real-time Analysis HUD Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {/* Real-time Speed (CPM) */}
        <div className="bg-white rounded-2xl border border-stone-200 p-3.5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
            <span className="flex items-center gap-1 font-medium">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              현재 타수
            </span>
            <span className="text-[10px] text-stone-400">타/분</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold font-mono text-stone-900 tracking-tight">
              {realtimeCpm}
            </span>
            <span className="text-xs text-stone-500 font-mono">CPM</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-stone-400">
            <span>최고: <strong className="text-stone-600 font-mono">{peakCpm}</strong></span>
            <span>약 {Math.round(realtimeCpm / 5)} WPM</span>
          </div>
          {/* Subtle bottom indicator bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-stone-100">
            <div
              className="h-full bg-amber-500 transition-all duration-300"
              style={{ width: `${Math.min(100, (realtimeCpm / 600) * 100)}%` }}
            />
          </div>
        </div>

        {/* Real-time Accuracy */}
        <div className="bg-white rounded-2xl border border-stone-200 p-3.5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
            <span className="flex items-center gap-1 font-medium">
              <Target className="w-3.5 h-3.5 text-emerald-500" />
              실시간 정확도
            </span>
            <span className="text-[10px] text-stone-400">실시간</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-3xl font-bold font-mono tracking-tight ${
                realtimeAccuracy >= 95
                  ? 'text-emerald-600'
                  : realtimeAccuracy >= 85
                  ? 'text-amber-600'
                  : 'text-rose-600'
              }`}
            >
              {realtimeAccuracy}
            </span>
            <span className="text-xs text-stone-500 font-mono">%</span>
          </div>
          <div className="mt-1.5 text-[11px] text-stone-400 flex items-center justify-between">
            <span>기준: 95% 이상</span>
            <span className={realtimeAccuracy >= 95 ? 'text-emerald-600 font-medium' : 'text-stone-500'}>
              {realtimeAccuracy >= 95 ? '우수' : '정밀 입력 필요'}
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-stone-100">
            <div
              className={`h-full transition-all duration-300 ${
                realtimeAccuracy >= 95 ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${realtimeAccuracy}%` }}
            />
          </div>
        </div>

        {/* Errors & Mistypes */}
        <div className="bg-white rounded-2xl border border-stone-200 p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
            <span className="flex items-center gap-1 font-medium">
              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
              오타수
            </span>
            <span className="text-[10px] text-stone-400">실시간</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-3xl font-bold font-mono tracking-tight ${
                errorCount === 0 ? 'text-stone-700' : 'text-rose-600'
              }`}
            >
              {errorCount}
            </span>
            <span className="text-xs text-stone-400 font-mono">회</span>
          </div>
          <div className="mt-1.5 text-[11px] text-stone-400">
            누적 오타: <strong className="text-stone-600 font-mono">{totalSessionErrors + errorCount}회</strong>
          </div>
        </div>

        {/* Progression & Elapsed Time */}
        <div className="bg-white rounded-2xl border border-stone-200 p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
            <span className="flex items-center gap-1 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              진행률
            </span>
            <span className="font-mono text-stone-500 text-xs">
              {Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toString().padStart(2, '0')}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold font-mono text-indigo-600 tracking-tight">
              {progressPercent}
            </span>
            <span className="text-xs text-stone-400 font-mono">%</span>
          </div>
          <div className="mt-1.5 text-[11px] text-stone-400">
            {sentenceIndex + 1} / {activeSentences.length} 문장 완료 중
          </div>
        </div>
      </div>

      {/* Main Literary Typing Canvas (Parchment Paper Book Texture) */}
      <div className="bg-[#fcfbf9] rounded-3xl border border-amber-900/15 shadow-md p-6 sm:p-10 relative transition-all overflow-hidden">
        {/* Subtle decorative classic paper border line */}
        <div className="absolute top-3 left-3 right-3 bottom-3 border border-amber-900/10 rounded-2xl pointer-events-none" />

        {/* Preceding Sentences in gentle faded ink */}
        {sentenceIndex > 0 && (
          <div className="mb-6 space-y-2 opacity-40 select-none">
            {activeSentences.slice(Math.max(0, sentenceIndex - 2), sentenceIndex).map((s, idx) => (
              <p key={idx} className={`${fontClass} text-base sm:text-lg text-stone-600 line-through decoration-amber-400/40`}>
                {s}
              </p>
            ))}
          </div>
        )}

        {/* Current Active Target Sentence with live character highlight */}
        <div className="mb-8">
          <div className="text-xs font-mono text-amber-800/70 mb-3 flex items-center justify-between">
            <span>문장 {sentenceIndex + 1}</span>
            <span className="text-[11px] text-stone-400">
              {userInput.length} / {targetSentence.length}자 입력됨
            </span>
          </div>

          <div
            className={`${fontClass} ${fontSizeClass} tracking-wide text-stone-800 break-keep select-none leading-relaxed flex flex-wrap items-center`}
          >
            {targetSentence.split('').map((char, index) => {
              const typedChar = userInput[index];
              const isTyped = index < userInput.length;
              const isCurrent = index === userInput.length;
              const isCorrect = isTyped && typedChar === char;
              const isIncorrect = isTyped && typedChar !== char;

              let charStyle = 'text-stone-400';
              if (isCorrect) {
                charStyle = 'text-emerald-800 bg-emerald-100/60 rounded px-0.5 font-medium';
              } else if (isIncorrect) {
                charStyle = 'text-rose-700 bg-rose-200/80 rounded px-0.5 underline decoration-rose-500 font-semibold';
              }

              return (
                <span
                  key={index}
                  className={`relative inline-block transition-colors duration-75 ${charStyle} ${
                    isCurrent ? 'bg-amber-200/60 rounded px-0.5' : ''
                  }`}
                >
                  {/* Blinking cursor line before current char */}
                  {isCurrent && (
                    <span className="absolute -left-[1px] top-1 bottom-1 w-[2.5px] bg-amber-600 animate-pulse rounded-full" />
                  )}
                  {char === ' ' ? '\u00A0' : char}
                </span>
              );
            })}
          </div>
        </div>

        {/* Live Input Field (Clean, responsive, handles Korean IME perfectly) */}
        <div className="relative mt-4">
          <input
            ref={inputRef}
            type="text"
            value={userInput}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="위 문장을 보며 천천히 따라 타이핑해 보세요..."
            autoFocus
            className={`w-full py-4 px-5 bg-white/90 rounded-2xl border-2 transition-all shadow-inner focus:outline-none ${
              errorCount > 0
                ? 'border-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10'
                : 'border-amber-900/20 focus:border-amber-600 focus:ring-4 focus:ring-amber-500/10'
            } ${fontClass} ${fontSizeClass} text-stone-900 placeholder:text-stone-400 placeholder:text-base placeholder:font-sans`}
          />

          {/* Quick Clear / Reset button */}
          {userInput.length > 0 && (
            <button
              onClick={() => {
                setUserInput('');
                setErrorCount(0);
                inputRef.current?.focus();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 font-medium transition-colors"
            >
              지우기 (Esc)
            </button>
          )}
        </div>

        {/* Helper Hint & Shortcuts */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500 pt-3 border-t border-amber-900/10">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-stone-200/80 font-mono text-[10px] text-stone-700">Enter</span>
            <span>문장 완료 후 다음 문장으로 이동</span>
            <span className="text-stone-300">|</span>
            <span className="px-1.5 py-0.5 rounded bg-stone-200/80 font-mono text-[10px] text-stone-700">Esc</span>
            <span>현재 문장 초기화</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const next = settings.soundType === 'off' ? 'typewriter' : 'off';
                onUpdateSettings({ soundType: next });
              }}
              className="text-stone-500 hover:text-stone-800 flex items-center gap-1 transition-colors"
            >
              {settings.soundType !== 'off' ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-amber-700" />
                  <span>타자음 켜짐 ({settings.soundType})</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-stone-400" />
                  <span>타자음 꺼짐</span>
                </>
              )}
            </button>

            <button
              onClick={handleRestartExcerpt}
              className="text-stone-500 hover:text-stone-800 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>처음부터 다시 쓰기</span>
            </button>
          </div>
        </div>

        {/* Upcoming sentences preview below */}
        {sentenceIndex < activeSentences.length - 1 && (
          <div className="mt-8 pt-6 border-t border-dashed border-amber-900/15">
            <span className="text-[11px] font-mono text-stone-400 uppercase tracking-wider block mb-2">
              다음 구절
            </span>
            <p className={`${fontClass} text-sm sm:text-base text-stone-500 italic opacity-60 leading-relaxed`}>
              "{activeSentences[sentenceIndex + 1]}"
            </p>
          </div>
        )}
      </div>

      {paragraphPrompt && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-200 p-5 text-stone-800">
            <p className="text-xs font-mono text-amber-700 mb-1">
              {paragraphPrompt.from}~{paragraphPrompt.to}문장 · 한 문단 필사
            </p>
            <h3 className="text-lg font-bold mb-1">지금 읽은 부분, 한 줄로 남겨 볼까요?</h3>
            <p className="text-xs text-stone-500 mb-3">
              느낌이나 짧은 독후 내용을 적으면 책을 다 읽고 쓰는 보고서에 함께 실립니다. 건너뛰어도 됩니다.
            </p>
            <textarea
              autoFocus
              rows={3}
              value={paragraphDraft}
              onChange={(e) => setParagraphDraft(e.target.value)}
              placeholder="예: 주인공의 마음이 답답하게 느껴졌다."
              className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setParagraphPrompt(null);
                  setParagraphDraft('');
                  inputRef.current?.focus();
                }}
                className="px-3 py-2 rounded-xl text-xs text-stone-500 hover:bg-stone-100"
              >
                건너뛰기
              </button>
              <button
                type="button"
                onClick={() => {
                  saveParagraphNote(book.id, {
                    from: paragraphPrompt.from,
                    to: paragraphPrompt.to,
                    note: paragraphDraft.trim(),
                  });
                  setParagraphPrompt(null);
                  setParagraphDraft('');
                  inputRef.current?.focus();
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-stone-950"
              >
                남기고 계속하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completion Modal */}
      {completedResult && (
        <SessionCompletionModal
          result={completedResult}
          book={book}
          studentProfile={studentProfile}
          onRestart={handleRestartExcerpt}
          onSelectAnotherBook={onSelectAnotherBook}
          onGoToDashboard={onGoToDashboard}
          onGoToLeaderboard={onGoToLeaderboard}
          onWriteBookReport={
            onWriteBookReport ? () => onWriteBookReport(book, completedResult) : undefined
          }
        />
      )}
    </div>
  );
};
