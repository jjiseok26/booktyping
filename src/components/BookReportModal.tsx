import React, { useState, useEffect } from 'react';
import {
  BookReport,
  BookExcerpt,
  TypingSessionResult,
  StudentProfile,
} from '../types';
import { BookReportPrintSheet } from './BookReportPrintSheet';
import { saveStoredBookReport } from '../utils/storage';
import {
  BookOpen,
  Printer,
  Save,
  X,
  Star,
  Sparkles,
  Quote,
  FileText,
  Eye,
  Edit3,
  CheckCircle2,
  HelpCircle,
  Clock,
  Zap,
  Target,
  GraduationCap,
} from 'lucide-react';

interface BookReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  book?: BookExcerpt;
  typingResult?: TypingSessionResult;
  studentProfile: StudentProfile;
  initialReport?: BookReport;
  onSaveSuccess?: (savedReport: BookReport) => void;
}

export const BookReportModal: React.FC<BookReportModalProps> = ({
  isOpen,
  onClose,
  book,
  typingResult,
  studentProfile,
  initialReport,
  onSaveSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [showHelperTips, setShowHelperTips] = useState(false);
  const [isSavedToast, setIsSavedToast] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [rating, setRating] = useState(5);
  const [memorableQuote, setMemorableQuote] = useState('');
  const [quoteReason, setQuoteReason] = useState('');
  const [content, setContent] = useState('');
  const [personalTakeaway, setPersonalTakeaway] = useState('');

  // Initialize data on open
  useEffect(() => {
    if (!isOpen) return;

    if (initialReport) {
      setTitle(initialReport.title);
      setRating(initialReport.rating || 5);
      setMemorableQuote(initialReport.memorableQuote || '');
      setQuoteReason(initialReport.quoteReason || '');
      setContent(initialReport.content || '');
      setPersonalTakeaway(initialReport.personalTakeaway || '');
    } else if (book) {
      // Pre-fill with reasonable starting points
      const defaultTitle = `《${book.bookTitle}》을 필사하며 느낀 우리말의 울림과 생각`;
      setTitle(defaultTitle);
      setRating(5);
      // Pick first or prominent sentence if available
      const availableSentences = (book.fullSentences && book.fullSentences.length > 0)
        ? book.fullSentences
        : book.sentences;
      const sampleQuote = availableSentences.length > 0 ? availableSentences[0] : '';
      setMemorableQuote(sampleQuote);
      setQuoteReason('');
      setContent('');
      setPersonalTakeaway('');
    }
    setActiveTab('edit');
    setIsSavedToast(false);
  }, [isOpen, initialReport, book]);

  if (!isOpen) return null;

  const currentBookTitle = initialReport?.bookTitle || book?.bookTitle || '고전 문학 도서';
  const currentAuthor = initialReport?.author || book?.author || '작가';
  const currentExcerptTitle = initialReport?.excerptTitle || book?.title || '';
  const currentExcerptId = initialReport?.excerptId || book?.id || 'book-custom';
  const currentCpm = initialReport?.cpm || typingResult?.cpm || 320;
  const currentAccuracy = initialReport?.accuracy || typingResult?.accuracy || 98;
  const currentDuration = initialReport?.durationSeconds || typingResult?.durationSeconds || 120;

  const currentReportObject: BookReport = {
    id: initialReport?.id || 'report-' + Date.now(),
    createdAt: initialReport?.createdAt || Date.now(),
    excerptId: currentExcerptId,
    bookTitle: currentBookTitle,
    author: currentAuthor,
    excerptTitle: currentExcerptTitle,
    studentProfile: initialReport?.studentProfile || studentProfile,
    cpm: currentCpm,
    accuracy: currentAccuracy,
    durationSeconds: currentDuration,
    title: title.trim() || `《${currentBookTitle}》 독후감`,
    rating,
    memorableQuote: memorableQuote.trim(),
    quoteReason: quoteReason.trim(),
    content: content.trim(),
    personalTakeaway: personalTakeaway.trim(),
  };

  const handleSave = () => {
    const saved = saveStoredBookReport(currentReportObject);
    setIsSavedToast(true);
    setTimeout(() => setIsSavedToast(false), 3000);
    if (onSaveSuccess) {
      onSaveSuccess(currentReportObject);
    }
  };

  const handlePrintPdf = () => {
    // Save current changes first
    saveStoredBookReport(currentReportObject);
    if (onSaveSuccess) {
      onSaveSuccess(currentReportObject);
    }
    // Switch to preview view for cleanest presentation and trigger native browser print
    setActiveTab('preview');
    setTimeout(() => {
      window.print();
    }, 200);
  };

  return (
    <div
      id="modal-backdrop-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-stone-950/80 backdrop-blur-md overflow-y-auto"
    >
      <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl text-stone-100 overflow-hidden my-auto">
        {/* Modal Top Nav (No-Print) */}
        <div className="no-print p-4 sm:px-6 border-b border-stone-800 bg-stone-900/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-stone-100 font-batang">
                  문학 필사 독서기록장 · 독후감
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {currentBookTitle}
                </span>
              </div>
              <p className="text-xs text-stone-400 flex items-center gap-1.5 mt-0.5">
                <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {studentProfile.schoolName} {studentProfile.grade}-{studentProfile.classNum}반{' '}
                  {studentProfile.studentNum}번 {studentProfile.name}
                </span>
              </p>
            </div>
          </div>

          {/* Action Tabs & Buttons */}
          <div className="flex items-center gap-2">
            {/* Tab switch between Editor and A4 Sheet Preview */}
            <div className="flex items-center bg-stone-800 p-1 rounded-xl border border-stone-700">
              <button
                onClick={() => setActiveTab('edit')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'edit'
                    ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                    : 'text-stone-300 hover:text-stone-100'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>작성하기</span>
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'preview'
                    ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                    : 'text-stone-300 hover:text-stone-100'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>A4 인쇄 미리보기</span>
              </button>
            </div>

            {/* Print to PDF button */}
            <button
              id="btn-print-report-pdf"
              onClick={handlePrintPdf}
              title="브라우저 인쇄 창에서 [PDF로 저장] 선택"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-stone-100 hover:bg-white text-stone-950 font-bold text-xs shadow-md transition-all active:scale-95"
            >
              <Printer className="w-4 h-4 text-stone-900" />
              <span>PDF 인쇄 / 저장</span>
            </button>

            {/* Save button */}
            <button
              id="btn-save-report"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-md transition-all active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>저장</span>
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Toast */}
        {isSavedToast && (
          <div className="no-print bg-emerald-500/20 border-b border-emerald-500/40 text-emerald-300 text-xs px-6 py-2 flex items-center justify-between animate-fade-in">
            <span className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              독후감이 성공적으로 저장되었습니다! 언제든 독서기록장에서 다시 열거나 인쇄할 수 있습니다.
            </span>
            <button
              onClick={() => setIsSavedToast(false)}
              className="text-emerald-400 hover:text-emerald-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-stone-950/50">
          {activeTab === 'edit' ? (
            <div className="space-y-5 max-w-3xl mx-auto">
              {/* Typing Performance Summary Banner */}
              <div className="bg-stone-800/80 border border-stone-700/80 rounded-xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-400 font-batang text-sm">
                    {currentBookTitle}
                  </span>
                  <span className="text-stone-400">| {currentAuthor} 저</span>
                </div>
                <div className="flex items-center gap-3 text-stone-300 font-mono">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    {currentCpm} CPM
                  </span>
                  <span className="flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-emerald-400" />
                    {currentAccuracy}%
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    {Math.floor(currentDuration / 60)}분 {currentDuration % 60}초 완주
                  </span>
                </div>
              </div>

              {/* Form Input: Title & Rating */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-stone-300 mb-1.5">
                    독후감 제목 <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="예: 《서시》를 필사하며 다짐한 순수한 삶의 태도"
                    className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors font-batang"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1.5">
                    나만의 책 별점
                  </label>
                  <div className="flex items-center gap-1 bg-stone-900 border border-stone-700 rounded-xl p-2.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRating(star)}
                        className="text-stone-600 hover:text-amber-400 transition-colors p-0.5"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            star <= rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-stone-600'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs text-stone-300 ml-1 font-mono font-bold">
                      {rating}점
                    </span>
                  </div>
                </div>
              </div>

              {/* Form Input: Memorable Quote Picker */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-stone-300 flex items-center gap-1.5">
                    <Quote className="w-3.5 h-3.5 text-amber-400" />
                    <span>가장 마음에 와닿은 문장 (필사 구절에서 선택 또는 직접 입력)</span>
                  </label>
                  {book && book.sentences.length > 0 && (
                    <span className="text-[11px] text-stone-400">
                      아래 문장을 클릭하면 바로 입력됩니다.
                    </span>
                  )}
                </div>

                {/* Quick sentence selector chips */}
                {book && (
                  (() => {
                    const allCandidateSentences = (book.fullSentences && book.fullSentences.length > 0)
                      ? book.fullSentences
                      : book.sentences;
                    if (allCandidateSentences.length === 0) return null;
                    return (
                      <div className="flex flex-wrap gap-1.5 mb-2 max-h-28 overflow-y-auto p-2 bg-stone-900/60 rounded-xl border border-stone-800">
                        {allCandidateSentences.slice(0, 12).map((sent, idx) => (
                          <button
                            type="button"
                            key={idx}
                            onClick={() => setMemorableQuote(sent)}
                            className="text-[11px] text-left px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-amber-500/20 hover:text-amber-300 border border-stone-700/70 text-stone-300 transition-colors truncate max-w-full font-batang"
                            title={sent}
                          >
                            "{sent}"
                          </button>
                        ))}
                      </div>
                    );
                  })()
                )}

                <textarea
                  rows={2}
                  value={memorableQuote}
                  onChange={(e) => setMemorableQuote(e.target.value)}
                  placeholder="작품 속에서 가장 감명 깊었던 문장을 적어보세요."
                  className="w-full bg-stone-900 border border-stone-700 rounded-xl p-3 text-sm text-amber-200 placeholder-stone-500 focus:outline-none focus:border-amber-500 font-batang italic leading-relaxed"
                />
              </div>

              {/* Form Input: Reason for choosing quote */}
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1.5">
                  이 문장이 마음에 와닿은 까닭
                </label>
                <input
                  type="text"
                  value={quoteReason}
                  onChange={(e) => setQuoteReason(e.target.value)}
                  placeholder="예: 바람 하나에도 양심의 가책을 느끼며 정직하게 살고자 한 시인의 마음에 깊이 공감했기 때문입니다."
                  className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Form Input: Main Content & Writing Helper */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-stone-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>책을 읽고 느낀 점 및 독서 감상 (독후감 본문)</span>
                    <span className="text-amber-400">*</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowHelperTips(!showHelperTips)}
                      className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 underline underline-offset-2"
                    >
                      <HelpCircle className="w-3 h-3" />
                      <span>{showHelperTips ? '작성 도움말 닫기' : '무엇을 쓸지 막막할 때?'}</span>
                    </button>
                    <span className="text-[11px] font-mono text-stone-400">
                      {content.length}자
                    </span>
                  </div>
                </div>

                {/* Helper Tips Box */}
                {showHelperTips && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 mb-2.5 text-xs text-amber-200 space-y-1.5 animate-fade-in font-sans-kr">
                    <p className="font-bold flex items-center gap-1 text-amber-300">
                      <Sparkles className="w-3.5 h-3.5" />
                      선생님이 알려주는 좋은 독후감 작성 팁:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-stone-300 text-[11px] leading-relaxed">
                      <li>
                        <strong>손끝으로 느낀 생각:</strong> 눈으로 읽을 때와 타자로 한 글자씩 칠 때 문장의 느낌이 어떻게 달랐나요?
                      </li>
                      <li>
                        <strong>인물의 감정 공감:</strong> 작품 속 인물이나 시적 화자가 처한 상황에서 나라면 어땠을지 상상해 보세요.
                      </li>
                      <li>
                        <strong>나의 경험과 연결:</strong> 최근 학교생활이나 친구 관계에서 이 글과 비슷한 감정을 느낀 적이 있나요?
                      </li>
                    </ul>
                  </div>
                )}

                <textarea
                  rows={8}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="키보드로 한 글자씩 문장을 따라 쓰며 마음속에 떠오른 생각, 인물의 감정에 공감한 내용, 나에게 주는 의미 등을 자유롭게 적어보세요. (권장: 200자~800자)"
                  className="w-full bg-stone-900 border border-stone-700 rounded-xl p-3.5 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 font-batang leading-relaxed resize-y"
                />
              </div>

              {/* Form Input: Takeaway / Lesson */}
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1.5">
                  나에게 주는 교훈 및 앞으로의 다짐
                </label>
                <textarea
                  rows={2}
                  value={personalTakeaway}
                  onChange={(e) => setPersonalTakeaway(e.target.value)}
                  placeholder="예: 어려운 상황에서도 타협하지 않고, 학업과 일상에서 나의 꿈을 향해 성실하게 한 걸음씩 나아가겠습니다."
                  className="w-full bg-stone-900 border border-stone-700 rounded-xl p-3 text-xs sm:text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500 leading-relaxed font-batang"
                />
              </div>

              {/* Action Buttons in footer */}
              <div className="pt-2 flex items-center justify-between gap-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span>A4 보고서 양식 미리보기</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSave}
                    className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    <span>임시 저장</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintPdf}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-2 shadow-lg transition-all active:scale-95"
                  >
                    <Printer className="w-4 h-4" />
                    <span>저장 후 PDF로 인쇄</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* A4 Print Sheet Preview */
            <div className="space-y-4">
              <div className="no-print bg-stone-800/80 border border-stone-700 rounded-xl p-3 text-xs text-stone-300 flex items-center justify-between">
                <span>
                  💡 <strong>A4 독서기록장 양식</strong>입니다. 인쇄 창에서 대상을{' '}
                  <span className="text-amber-300 font-bold">[PDF로 저장]</span>으로 선택하시면 파일로 내려받을 수 있습니다.
                </span>
                <button
                  onClick={handlePrintPdf}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold flex items-center gap-1 text-xs shrink-0"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>지금 PDF 인쇄하기</span>
                </button>
              </div>

              {/* Printable sheet element */}
              <div className="bg-stone-700/20 p-2 sm:p-6 rounded-2xl flex justify-center">
                <BookReportPrintSheet report={currentReportObject} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
