import React, { useState } from 'react';
import { BookReport, StudentProfile, BookExcerpt, TypingSessionResult } from '../types';
import { deleteStoredBookReport, getCurrentStudentAccount } from '../utils/storage';
import { apiDeleteReport } from '../utils/dbClient';
import { isWorkCompleted } from '../data/books';
import {
  FileText,
  Printer,
  Edit3,
  Trash2,
  Plus,
  Star,
  Search,
  GraduationCap,
} from 'lucide-react';

interface BookReportsViewProps {
  reports: BookReport[];
  studentProfile: StudentProfile;
  books: BookExcerpt[];
  history: TypingSessionResult[];
  onOpenReportModal: (report?: BookReport, book?: BookExcerpt) => void;
  onRefreshReports: () => void;
  onStartTyping: () => void;
}

export const BookReportsView: React.FC<BookReportsViewProps> = ({
  reports,
  studentProfile,
  books,
  history,
  onOpenReportModal,
  onRefreshReports,
  onStartTyping,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const completedBooks = books.filter((book) => isWorkCompleted(history, book.id));

  const handleNewReport = () => {
    if (completedBooks.length === 0) {
      window.alert('독후감은 작품 전편을 끝까지 필사한 뒤에 작성할 수 있습니다.');
      onStartTyping();
      return;
    }
    if (completedBooks.length === 1) {
      onOpenReportModal(undefined, completedBooks[0]);
      return;
    }
    setPickerOpen(true);
  };

  const handleDelete = (id: string, title: string) => {
    if (window.confirm(`'${title}' 독후감을 삭제하시겠습니까?`)) {
      const account = getCurrentStudentAccount();
      if (account) {
        void apiDeleteReport(account.id, id).then(() => onRefreshReports());
        return;
      }
      deleteStoredBookReport(id);
      onRefreshReports();
    }
  };

  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.bookTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.author.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const totalWords = reports.reduce((acc, r) => acc + r.content.length, 0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Top Banner */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-3">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>{studentProfile.schoolName} {studentProfile.grade}-{studentProfile.classNum}반 포트폴리오</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-100 font-batang tracking-tight">
              문학 필사 독서기록장
            </h1>
            <p className="text-sm text-stone-400 mt-1 max-w-xl">
              작품 전편을 끝까지 필사한 뒤에만 독후감을 남길 수 있습니다. 완성한 감상문은 A4 양식으로 인쇄하거나 PDF로 저장해 제출할 수 있습니다.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleNewReport}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>새 독후감 작성하기</span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-stone-800/80">
          <div className="bg-stone-800/50 border border-stone-700/60 rounded-xl p-3 text-center">
            <div className="text-xs text-stone-400 mb-0.5">작성한 독후감</div>
            <div className="text-xl font-bold font-mono text-amber-400">{reports.length}편</div>
          </div>
          <div className="bg-stone-800/50 border border-stone-700/60 rounded-xl p-3 text-center">
            <div className="text-xs text-stone-400 mb-0.5">총 감상문 글자 수</div>
            <div className="text-xl font-bold font-mono text-stone-200">{totalWords.toLocaleString()}자</div>
          </div>
          <div className="bg-stone-800/50 border border-stone-700/60 rounded-xl p-3 text-center">
            <div className="text-xs text-stone-400 mb-0.5">평균 별점</div>
            <div className="text-xl font-bold font-mono text-amber-300 flex items-center justify-center gap-1">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              {reports.length > 0
                ? (reports.reduce((acc, r) => acc + r.rating, 0) / reports.length).toFixed(1)
                : '0.0'}
            </div>
          </div>
          <div className="bg-stone-800/50 border border-stone-700/60 rounded-xl p-3 text-center">
            <div className="text-xs text-stone-400 mb-0.5">제출 규격</div>
            <div className="text-xl font-bold font-mono text-emerald-400">A4 PDF 지원</div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="도서명, 저자, 독후감 제목 검색..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        <span className="text-xs text-stone-400 self-end sm:self-center">
          총 <strong className="text-amber-400">{filteredReports.length}</strong>개의 독후감이 있습니다.
        </span>
      </div>

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <div className="bg-stone-900/60 border border-stone-800 rounded-3xl p-12 text-center text-stone-400 space-y-4">
          <FileText className="w-12 h-12 text-stone-600 mx-auto" />
          <p className="text-sm font-medium text-stone-300">
            {searchQuery ? '검색된 독후감이 없습니다.' : '아직 작성된 독후감이 없습니다.'}
          </p>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            공개 문학 작품의 모든 문장을 끝까지 필사하면 독후감을 쓸 수 있습니다. 완주 창이나 상단의 '새 독후감 작성하기'에서 기록을 남겨 보세요.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={onStartTyping}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-md transition-colors"
            >
              문학 필사하러 가기
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReports.map((report) => (
            <div
              key={report.id}
              className="bg-stone-900 border border-stone-800 hover:border-stone-700/80 rounded-2xl p-5 shadow-sm transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Header: Book Title & Date */}
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30 font-medium">
                      {report.bookTitle}
                    </span>
                    <span className="text-xs text-stone-400">{report.author}</span>
                  </div>
                  <span className="text-[11px] font-mono text-stone-500 shrink-0">
                    {new Date(report.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                </div>

                {/* Report Title */}
                <h3 className="font-bold text-stone-100 text-base font-batang line-clamp-1 mb-2 group-hover:text-amber-300 transition-colors">
                  {report.title}
                </h3>

                {/* Star Rating & Typing stats */}
                <div className="flex items-center gap-3 text-xs text-stone-400 mb-3">
                  <div className="flex items-center gap-0.5 text-amber-400">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3 h-3 ${
                          star <= report.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-700'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-mono text-stone-400">
                    타수: {report.cpm} CPM ({report.accuracy}%)
                  </span>
                </div>

                {/* Memorable Quote Preview */}
                {report.memorableQuote && (
                  <div className="bg-stone-800/60 border border-stone-800 rounded-xl p-2.5 mb-3 text-xs text-amber-200/90 font-batang italic line-clamp-2">
                    "{report.memorableQuote}"
                  </div>
                )}

                {/* Main Content Snippet */}
                <p className="text-xs text-stone-300 line-clamp-3 leading-relaxed font-batang mb-4">
                  {report.content}
                </p>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-stone-800/80 flex items-center justify-between gap-2">
                <div className="text-[11px] text-stone-500 font-mono">
                  {report.content.length}자
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenReportModal(report)}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
                    title="독후감 수정하기"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDelete(report.id, report.title)}
                    className="p-1.5 rounded-lg text-stone-500 hover:text-rose-400 hover:bg-stone-800 transition-colors"
                    title="독후감 삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onOpenReportModal(report)}
                    className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-400" />
                    <span>PDF 인쇄</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <h2 className="text-base font-bold text-stone-100 mb-1">완주한 작품 선택</h2>
            <p className="text-xs text-stone-400 mb-4">전편을 필사한 작품만 독후감을 작성할 수 있습니다.</p>
            <ul className="max-h-64 overflow-y-auto space-y-1.5">
              {completedBooks.map((book) => (
                <li key={book.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setPickerOpen(false);
                      onOpenReportModal(undefined, book);
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl border border-stone-800 hover:border-amber-500/50 hover:bg-amber-500/10 text-stone-200 text-sm"
                  >
                    <span className="font-batang font-bold">{book.title}</span>
                    <span className="block text-[11px] text-stone-400 mt-0.5">
                      《{book.bookTitle}》 · {book.author}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setPickerOpen(false)}
              className="mt-4 w-full py-2 rounded-xl bg-stone-800 text-stone-300 text-xs"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
