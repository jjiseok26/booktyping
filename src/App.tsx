import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { TypingArea } from './components/TypingArea';
import { BookSelector } from './components/BookSelector';
import { Dashboard } from './components/Dashboard';
import { ClassLeaderboard } from './components/ClassLeaderboard';
import { StudentProfileModal } from './components/StudentProfileModal';
import { BookReportsView } from './components/BookReportsView';
import { BookReportModal } from './components/BookReportModal';
import { StudentAuthModal } from './components/StudentAuthModal';
import { BookExcerpt, TypingSettings, TypingSessionResult, StudentProfile, BookReport, StudentAccount } from './types';
import { PUBLIC_DOMAIN_BOOKS, isWorkCompleted } from './data/books';
import {
  getStoredHistory,
  saveTypingResult,
  clearHistoryStorage,
  getStoredSettings,
  saveStoredSettings,
  getStoredStudentProfile,
  saveStoredStudentProfile,
  getStoredBookReports,
  getCurrentStudentAccount,
  setCurrentStudentAccount,
  rememberRecentAccount,
} from './utils/storage';
import {
  apiAdminReports,
  apiAdminSessions,
  apiClearSessions,
  apiDeleteSession,
  apiListReports,
  apiListSessions,
  apiSaveSession,
  setStudentToken,
} from './utils/dbClient';
import { BookOpen, ShieldCheck } from 'lucide-react';
import { AdminView } from './components/AdminView';

export default function App() {
  const [currentView, setCurrentView] = useState<'typing' | 'books' | 'dashboard' | 'leaderboard' | 'reports' | 'admin'>(
    window.location.hash === '#admin' || window.location.hash === '#teacher' ? 'admin' : 'typing'
  );
  const [staffLoginMode, setStaffLoginMode] = useState<'admin' | 'teacher'>(
    window.location.hash === '#teacher' ? 'teacher' : 'admin'
  );
  const [staffBrowse, setStaffBrowse] = useState<{
    username: string;
    role: 'admin' | 'teacher' | 'school_admin';
    schoolName: string;
    grade: number;
    classNum: number;
  } | null>(null);

  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash;
      if (hash === '#teacher') {
        setStaffLoginMode('teacher');
        setCurrentView('admin');
      } else if (hash === '#admin') {
        setStaffLoginMode('admin');
        setCurrentView('admin');
      }
    };
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, []);
  const [selectedBook, setSelectedBook] = useState<BookExcerpt>(PUBLIC_DOMAIN_BOOKS[0]);
  const [history, setHistory] = useState<TypingSessionResult[]>([]);
  const [settings, setSettings] = useState<TypingSettings>(getStoredSettings());
  const [studentProfile, setStudentProfile] = useState<StudentProfile>(getStoredStudentProfile());
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Student Account Authentication State (학교명/학년도/학년/반/번호/성명)
  const [currentAccount, setCurrentAccount] = useState<StudentAccount | null>(getCurrentStudentAccount());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  // Book Reports State
  const [reports, setReports] = useState<BookReport[]>([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportModalData, setReportModalData] = useState<{
    book?: BookExcerpt;
    typingResult?: TypingSessionResult;
    initialReport?: BookReport;
  }>({});

  // Load history, profile, account & reports on initial render
  useEffect(() => {
    const acc = getCurrentStudentAccount();
    setSettings(getStoredSettings());
    setCurrentAccount(acc);
    if (acc) {
      const synchedProfile: StudentProfile = {
        schoolYear: acc.schoolYear,
        schoolName: acc.schoolName,
        grade: acc.grade,
        classNum: acc.classNum,
        studentNum: acc.studentNum,
        name: acc.name,
        accountId: acc.id,
      };
      setStudentProfile(synchedProfile);
      saveStoredStudentProfile(synchedProfile);
      rememberRecentAccount(acc);
      void Promise.all([apiListSessions(acc.id), apiListReports(acc.id)])
        .then(([sessions, dbReports]) => {
          setHistory(sessions);
          setReports(dbReports);
        })
        .catch(() => {
          setHistory(getStoredHistory());
          setReports(getStoredBookReports());
        });
    } else {
      setStudentProfile(getStoredStudentProfile());
      setHistory(getStoredHistory());
      setReports(getStoredBookReports());
    }
  }, []);

  const handleSelectBook = (book: BookExcerpt) => {
    setSelectedBook(book);
    setCurrentView('typing');
  };

  const handleSaveSession = (result: TypingSessionResult) => {
    if (staffBrowse) return;
    const sessionWithProfile: TypingSessionResult = {
      ...result,
      studentProfile,
    };
    if (currentAccount) {
      void apiSaveSession(currentAccount.id, sessionWithProfile)
        .then(setHistory)
        .catch(() => setHistory(saveTypingResult(sessionWithProfile)));
      return;
    }
    setHistory(saveTypingResult(sessionWithProfile));
  };

  const handleSaveProfile = (newProfile: StudentProfile) => {
    setStudentProfile(newProfile);
    saveStoredStudentProfile(newProfile);
  };

  // Student Auth Handlers
  const handleLoginSuccess = (account: StudentAccount) => {
    setStaffBrowse(null);
    setCurrentStudentAccount(account);
    setCurrentAccount(account);
    rememberRecentAccount(account);
    const updatedProfile: StudentProfile = {
      schoolYear: account.schoolYear,
      schoolName: account.schoolName,
      grade: account.grade,
      classNum: account.classNum,
      studentNum: account.studentNum,
      name: account.name,
      accountId: account.id,
    };
    setStudentProfile(updatedProfile);
    saveStoredStudentProfile(updatedProfile);
    void Promise.all([apiListSessions(account.id), apiListReports(account.id)])
      .then(([sessions, dbReports]) => {
        setHistory(sessions);
        setReports(dbReports);
      })
      .catch(() => {
        setHistory(getStoredHistory());
        setReports(getStoredBookReports());
      });
  };

  const handleLogoutAccount = () => {
    setCurrentStudentAccount(null);
    setCurrentAccount(null);
    setStudentToken(null);
    setHistory(getStoredHistory());
    setReports(getStoredBookReports());
  };

  const handleOpenAuthModal = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  // Open Book Report Modal
  const handleOpenReportModal = (
    initialReport?: BookReport,
    bookToReport?: BookExcerpt,
    resultToReport?: TypingSessionResult
  ) => {
    const targetBook = bookToReport || (initialReport ? PUBLIC_DOMAIN_BOOKS.find(b => b.id === initialReport.excerptId) || selectedBook : selectedBook);
    const canWrite =
      Boolean(initialReport) ||
      Boolean(resultToReport) ||
      (targetBook ? isWorkCompleted(history, targetBook.id) : false);
    if (!canWrite) {
      window.alert('독후감은 작품 전편을 끝까지 필사한 뒤에 작성할 수 있습니다.');
      setCurrentView('typing');
      return;
    }
    setReportModalData({
      initialReport,
      book: targetBook,
      typingResult: resultToReport,
    });
    setIsReportModalOpen(true);
  };

  const handleSaveReportSuccess = (savedReport: BookReport) => {
    if (currentAccount) {
      setReports((prev) => {
        const idx = prev.findIndex((item) => item.id === savedReport.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = savedReport;
          return next;
        }
        return [savedReport, ...prev];
      });
      return;
    }
    setReports(getStoredBookReports());
  };

  const handleClearHistory = () => {
    if (staffBrowse) return;
    if (window.confirm('정말 모든 필사 통계 기록을 삭제하시겠습니까?')) {
      if (currentAccount) {
        void apiClearSessions(currentAccount.id).then(() => setHistory([])).catch(() => setHistory([]));
        return;
      }
      clearHistoryStorage();
      setHistory([]);
    }
  };

  const handleDeleteRecord = (id: string) => {
    if (staffBrowse) return;
    if (currentAccount) {
      void apiDeleteSession(currentAccount.id, id).then(setHistory).catch(() => {
        setHistory(history.filter((h) => h.id !== id));
      });
      return;
    }
    const updated = history.filter((h) => h.id !== id);
    localStorage.setItem('literary_typing_history_v2', JSON.stringify(updated));
    setHistory(updated);
  };

  const handleUpdateSettings = (newSettings: Partial<TypingSettings>) => {
    const merged = { ...settings, ...newSettings };
    setSettings(merged);
    saveStoredSettings(merged);
  };

  return (
    <div className={`min-h-screen flex flex-col bg-[#fbfaf8] text-stone-900 font-sans-kr selection:bg-amber-100 selection:text-amber-950 ${currentView === 'admin' ? '' : 'md:pl-56'}`}>
      {currentView === 'admin' ? (
        <div className="fixed inset-0 z-[60]">
        <AdminView
          loginMode={staffLoginMode}
          onBrowseStudentView={(staff) => {
            const profile: StudentProfile = {
              schoolYear: studentProfile.schoolYear || '2026학년도',
              schoolName: staff.schoolName,
              grade: staff.grade > 0 ? staff.grade : 1,
              classNum: staff.classNum > 0 ? staff.classNum : 0,
              studentNum: 0,
              name: `${staff.username} 선생님`,
            };
            setStudentProfile(profile);
            setStaffBrowse(staff);
            window.location.hash = '';
            setCurrentView('leaderboard');
            void Promise.all([apiAdminSessions(), apiAdminReports()])
              .then(([sessions, classReports]) => {
                setHistory(sessions);
                setReports(classReports);
              })
              .catch(() => {
                setHistory([]);
                setReports([]);
              });
          }}
          onStaffLogout={() => {
            setStaffBrowse(null);
            const acc = getCurrentStudentAccount();
            if (acc) {
              setStudentProfile({
                schoolYear: acc.schoolYear,
                schoolName: acc.schoolName,
                grade: acc.grade,
                classNum: acc.classNum,
                studentNum: acc.studentNum,
                name: acc.name,
                accountId: acc.id,
              });
            } else {
              setStudentProfile(getStoredStudentProfile());
            }
          }}
          onBack={() => {
            window.location.hash = '';
            setStaffLoginMode('admin');
            setCurrentView('typing');
          }}
        />
        </div>
      ) : (
        <>
      {/* Top Navigation & Controls Bar */}
      <Header
        currentView={currentView}
        setCurrentView={setCurrentView}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        activeBookTitle={selectedBook.bookTitle}
        activeExcerptTitle={selectedBook.title}
        studentProfile={studentProfile}
        currentAccount={staffBrowse ? null : currentAccount}
        onOpenAuthModal={handleOpenAuthModal}
        onLogoutAccount={handleLogoutAccount}
        teacherConsole={Boolean(staffBrowse)}
        onOpenTeacherLogin={() => {
          window.location.hash = 'teacher';
          setStaffLoginMode('teacher');
          setCurrentView('admin');
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {currentView === 'typing' && (
          <TypingArea
            book={selectedBook}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onSelectAnotherBook={() => setCurrentView('books')}
            onSaveSession={handleSaveSession}
            onGoToDashboard={() => setCurrentView('dashboard')}
            studentProfile={studentProfile}
            onGoToLeaderboard={() => setCurrentView('leaderboard')}
            onWriteBookReport={(book, result) => handleOpenReportModal(undefined, book, result)}
            studentId={staffBrowse ? undefined : currentAccount?.id}
          />
        )}

        {currentView === 'books' && (
          <BookSelector
            activeExcerptId={selectedBook.id}
            onSelectExcerpt={handleSelectBook}
          />
        )}

        {currentView === 'leaderboard' && (
          <ClassLeaderboard
            currentProfile={studentProfile}
            userHistory={history}
            onOpenProfileModal={() => setIsProfileModalOpen(true)}
            onStartTyping={() => setCurrentView('typing')}
            currentAccount={staffBrowse ? null : currentAccount}
            onOpenAuthModal={handleOpenAuthModal}
          />
        )}

        {currentView === 'reports' && (
          <BookReportsView
            reports={reports}
            studentProfile={studentProfile}
            books={PUBLIC_DOMAIN_BOOKS}
            history={history}
            onOpenReportModal={(report, book) => handleOpenReportModal(report, book)}
            onRefreshReports={() => {
              if (staffBrowse) {
                void apiAdminReports().then(setReports).catch(() => setReports([]));
                return;
              }
              if (currentAccount) {
                void apiListReports(currentAccount.id).then(setReports).catch(() => setReports(getStoredBookReports()));
                return;
              }
              setReports(getStoredBookReports());
            }}
            onStartTyping={() => setCurrentView('typing')}
          />
        )}

        {currentView === 'dashboard' && (
          <Dashboard
            history={history}
            onClearHistory={handleClearHistory}
            onDeleteRecord={handleDeleteRecord}
            onStartTyping={() => setCurrentView('typing')}
            onWriteReport={(record) => {
              const matchedBook = PUBLIC_DOMAIN_BOOKS.find((b) => b.id === record.excerptId);
              handleOpenReportModal(undefined, matchedBook, record);
            }}
          />
        )}
      </main>

      {/* Student Authentication Modal (학교명/학년도/학년/반/번호/성명 로그인 및 회원가입) */}
      <StudentAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentAccount={currentAccount}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogoutAccount}
        initialMode={authModalMode}
      />

      {/* Student Profile Setup/Edit Modal */}
      <StudentProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentProfile={studentProfile}
        onSaveProfile={handleSaveProfile}
      />

      {/* Book Report Writing & PDF Print Modal */}
      <BookReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        book={reportModalData.book || selectedBook}
        typingResult={reportModalData.typingResult}
        studentProfile={studentProfile}
        initialReport={reportModalData.initialReport}
        onSaveSuccess={handleSaveReportSuccess}
      />

      {/* Literary & Copyright Footer */}
      <footer className="bg-stone-900 text-stone-400 text-xs py-8 border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
            <span className="font-batang font-bold text-stone-200 text-sm">문학 타자연습</span>
            <span className="text-stone-500">|</span>
            <span>공개 고전 문학 필사 및 학급 노력 순위 프로젝트</span>
          </div>

          <div className="flex items-center gap-2 text-center sm:text-right flex-wrap justify-center sm:justify-end">
            <span className="text-stone-200 font-medium">© jiseok</span>
            <span className="text-stone-600">|</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-stone-400">수록작은 저작권 만료 퍼블릭 도메인입니다.</span>
            <span className="text-stone-600">|</span>
            <button
              onClick={() => {
                window.location.hash = 'teacher';
                setStaffLoginMode('teacher');
                setCurrentView('admin');
              }}
              className="text-stone-500 hover:text-amber-300"
            >
              {staffBrowse ? '선생님 콘솔' : '선생님 로그인'}
            </button>
            <span className="text-stone-600">|</span>
            <button
              onClick={() => {
                window.location.hash = 'admin';
                setStaffLoginMode('admin');
                setCurrentView('admin');
              }}
              className="text-stone-500 hover:text-amber-300"
            >
              관리자
            </button>
          </div>
        </div>
      </footer>
        </>
      )}
    </div>
  );
}
