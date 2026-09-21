import React, { useState } from 'react';
import { BookOpen, BarChart3, Keyboard, Trophy, Volume2, VolumeX, Type, Sparkles, HelpCircle, GraduationCap, FileText, UserCheck, LogOut, Settings, ChevronDown, LogIn, UserPlus, School } from 'lucide-react';
import { FontFamily, FontSize, SoundType, TypingSettings, StudentProfile, StudentAccount } from '../types';

interface HeaderProps {
  currentView: 'typing' | 'books' | 'dashboard' | 'leaderboard' | 'reports';
  setCurrentView: (view: 'typing' | 'books' | 'dashboard' | 'leaderboard' | 'reports') => void;
  settings: TypingSettings;
  onUpdateSettings: (newSettings: Partial<TypingSettings>) => void;
  activeBookTitle?: string;
  activeExcerptTitle?: string;
  studentProfile?: StudentProfile;
  currentAccount?: StudentAccount | null;
  onOpenAuthModal?: (mode?: 'login' | 'register') => void;
  onLogoutAccount?: () => void;
  onOpenTeacherLogin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  setCurrentView,
  settings,
  onUpdateSettings,
  activeBookTitle,
  activeExcerptTitle,
  studentProfile,
  currentAccount,
  onOpenAuthModal,
  onLogoutAccount,
  onOpenTeacherLogin,
}) => {
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [showCopyrightModal, setShowCopyrightModal] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 bg-stone-900/95 text-stone-100 backdrop-blur-md border-b border-stone-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Logo & Literary Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentView('typing')}
              className="flex items-center gap-2.5 text-left group"
              title="문학 타자연습 홈"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 group-hover:scale-105 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-batang text-lg font-bold tracking-tight text-stone-100">문학 타자연습</span>
                  <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20">
                    공개명작
                  </span>
                </div>
                <p className="text-xs text-stone-400 hidden sm:block">
                  {activeBookTitle ? `${activeBookTitle} · ${activeExcerptTitle}` : '고전 명작을 필사하며 기르는 손끝의 감각'}
                </p>
              </div>
            </button>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-stone-800/80 p-1 rounded-xl border border-stone-700/60 overflow-x-auto max-w-full">
            <button
              id="nav-btn-typing"
              onClick={() => setCurrentView('typing')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                currentView === 'typing'
                  ? 'bg-amber-500 text-stone-950 shadow-sm font-semibold'
                  : 'text-stone-300 hover:text-stone-100 hover:bg-stone-700/50'
              }`}
            >
              <Keyboard className="w-4 h-4" />
              <span>타자 필사</span>
            </button>
            <button
              id="nav-btn-books"
              onClick={() => setCurrentView('books')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                currentView === 'books'
                  ? 'bg-amber-500 text-stone-950 shadow-sm font-semibold'
                  : 'text-stone-300 hover:text-stone-100 hover:bg-stone-700/50'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>작품 서재</span>
            </button>
            <button
              id="nav-btn-leaderboard"
              onClick={() => setCurrentView('leaderboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                currentView === 'leaderboard'
                  ? 'bg-amber-500 text-stone-950 shadow-sm font-semibold'
                  : 'text-stone-300 hover:text-stone-100 hover:bg-stone-700/50'
              }`}
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>반별 순위표</span>
            </button>
            <button
              id="nav-btn-reports"
              onClick={() => setCurrentView('reports')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                currentView === 'reports'
                  ? 'bg-amber-500 text-stone-950 shadow-sm font-semibold'
                  : 'text-stone-300 hover:text-stone-100 hover:bg-stone-700/50'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>독서기록장</span>
            </button>
            <button
              id="nav-btn-dashboard"
              onClick={() => setCurrentView('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                currentView === 'dashboard'
                  ? 'bg-amber-500 text-stone-950 shadow-sm font-semibold'
                  : 'text-stone-300 hover:text-stone-100 hover:bg-stone-700/50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>통계</span>
            </button>
          </nav>

          {/* Right Controls: Student Account Badge & Auth, Sound, Font, Copyright */}
          <div className="flex items-center gap-2">
            {/* Student Account Menu or Login Button */}
            {currentAccount ? (
              <div className="relative">
                <button
                  id="btn-header-student-menu"
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-stone-800/90 hover:bg-stone-750 border border-stone-700/80 text-stone-200 text-xs transition-all active:scale-95"
                >
                  <div className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 font-bold flex items-center justify-center text-[10px]">
                    {currentAccount.name.charAt(0)}
                  </div>
                  <span className="font-semibold text-stone-100 max-w-[90px] sm:max-w-[120px] truncate">
                    {currentAccount.name}
                  </span>
                  <span className="hidden lg:inline-block text-[11px] text-amber-300 font-mono">
                    {currentAccount.grade}-{currentAccount.classNum}반 {currentAccount.studentNum}번
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                </button>

                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-stone-800 border border-stone-700 rounded-2xl shadow-2xl p-3 text-stone-200 text-xs z-50 animate-fade-in">
                    <div className="flex items-center gap-2.5 pb-2.5 border-b border-stone-700/80">
                      <div className="w-9 h-9 rounded-full bg-amber-500 text-stone-950 font-bold flex items-center justify-center text-sm shadow">
                        {currentAccount.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-stone-100 truncate flex items-center gap-1.5">
                          <span>{currentAccount.name} 학생</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            로그인됨
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-400 truncate">
                          {currentAccount.schoolYear} {currentAccount.schoolName}
                        </div>
                      </div>
                    </div>

                    <div className="my-2.5 p-2 rounded-xl bg-stone-900/60 border border-stone-700/60 text-[11px] space-y-1">
                      <div className="text-stone-400 font-medium flex items-center gap-1">
                        <School className="w-3.5 h-3.5 text-amber-400" />
                        <span>소속 학급 정보</span>
                      </div>
                      <div className="text-stone-200 font-semibold pl-4">
                        {currentAccount.schoolName}
                      </div>
                      <div className="text-amber-300 pl-4 font-mono">
                        {currentAccount.grade}학년 {currentAccount.classNum}반 {currentAccount.studentNum}번
                      </div>
                    </div>

                    <div className="space-y-1 pt-1 border-t border-stone-700/80">
                      {onOpenAuthModal && (
                        <>
                          <button
                            onClick={() => {
                              setShowUserDropdown(false);
                              onOpenAuthModal('login');
                            }}
                            className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-stone-700/70 text-stone-200 flex items-center gap-2 transition-colors"
                          >
                            <Settings className="w-3.5 h-3.5 text-amber-400" />
                            <span>다른 학생으로 로그인 / 전환</span>
                          </button>
                          <button
                            onClick={() => {
                              setShowUserDropdown(false);
                              onOpenAuthModal('register');
                            }}
                            className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-stone-700/70 text-stone-200 flex items-center gap-2 transition-colors"
                          >
                            <UserPlus className="w-3.5 h-3.5 text-amber-400" />
                            <span>신규 학생 회원가입</span>
                          </button>
                        </>
                      )}

                      {onLogoutAccount && (
                        <button
                          onClick={() => {
                            setShowUserDropdown(false);
                            onLogoutAccount();
                          }}
                          className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 flex items-center gap-2 transition-colors"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>로그아웃</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              onOpenAuthModal && (
                <div className="flex items-center gap-1.5">
                  <button
                    id="btn-header-student-login"
                    onClick={() => onOpenAuthModal('login')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-sm transition-all active:scale-95 shrink-0"
                    title="학교/학년/반/번호/성명으로 로그인"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>학생 로그인</span>
                  </button>
                  <button
                    id="btn-header-student-register"
                    onClick={() => onOpenAuthModal('register')}
                    className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold border border-stone-700 transition-all active:scale-95 shrink-0"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-amber-400" />
                    <span>회원가입</span>
                  </button>
                </div>
              )
            )}

            {onOpenTeacherLogin && (
              <button
                id="btn-header-teacher-login"
                onClick={onOpenTeacherLogin}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold border border-stone-700 transition-all active:scale-95 shrink-0"
              >
                <School className="w-3.5 h-3.5 text-amber-400" />
                <span>선생님 로그인</span>
              </button>
            )}

            {/* Sound toggle quick button */}
            <button
              id="btn-quick-sound"
              onClick={() => {
                const nextType: SoundType = settings.soundType === 'off' ? 'typewriter' : 'off';
                onUpdateSettings({ soundType: nextType });
              }}
              title={settings.soundType === 'off' ? '타자 소리 켜기' : `타자음: ${settings.soundType}`}
              className={`p-2 rounded-lg border transition-colors ${
                settings.soundType !== 'off'
                  ? 'bg-stone-800 border-amber-500/40 text-amber-300'
                  : 'bg-stone-800/60 border-stone-700 text-stone-400 hover:text-stone-200'
              }`}
            >
              {settings.soundType !== 'off' ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Settings dropdown toggle */}
            <div className="relative">
              <button
                id="btn-settings-toggle"
                onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 hover:text-stone-100 hover:border-stone-600 text-xs font-medium"
              >
                <Type className="w-4 h-4 text-amber-300" />
                <span className="hidden md:inline">보기 설정</span>
              </button>

              {showSettingsDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-stone-800 border border-stone-700 rounded-xl shadow-xl p-4 text-stone-200 text-sm z-50">
                  <div className="flex items-center justify-between pb-3 border-b border-stone-700">
                    <span className="font-semibold text-stone-100 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      타자 환경 설정
                    </span>
                    <button
                      onClick={() => setShowSettingsDropdown(false)}
                      className="text-stone-400 hover:text-stone-200 text-xs"
                    >
                      닫기
                    </button>
                  </div>

                  {/* Font selection */}
                  <div className="py-3 border-b border-stone-700">
                    <label className="block text-xs font-medium text-stone-400 mb-2">글꼴 스타일</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['batang', 'sans', 'mono'] as FontFamily[]).map((f) => (
                        <button
                          key={f}
                          onClick={() => onUpdateSettings({ font: f })}
                          className={`py-1.5 px-2 rounded text-xs text-center border transition-all ${
                            settings.font === f
                              ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-semibold'
                              : 'bg-stone-900/50 border-stone-700 text-stone-300 hover:border-stone-600'
                          }`}
                        >
                          {f === 'batang' ? '고운명조' : f === 'sans' ? '고딕' : '고정폭'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font Size */}
                  <div className="py-3 border-b border-stone-700">
                    <label className="block text-xs font-medium text-stone-400 mb-2">글자 크기</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(['sm', 'md', 'lg', 'xl'] as FontSize[]).map((size) => (
                        <button
                          key={size}
                          onClick={() => onUpdateSettings({ fontSize: size })}
                          className={`py-1 px-2 rounded text-xs text-center border transition-all ${
                            settings.fontSize === size
                              ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-semibold'
                              : 'bg-stone-900/50 border-stone-700 text-stone-300 hover:border-stone-600'
                          }`}
                        >
                          {size.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sound Type */}
                  <div className="py-3 border-b border-stone-700">
                    <label className="block text-xs font-medium text-stone-400 mb-2">타자음 효과음</label>
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { id: 'typewriter', label: '타자기' },
                        { id: 'mechanical', label: '기계식' },
                        { id: 'soft', label: '부드러움' },
                        { id: 'off', label: '음소거' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => onUpdateSettings({ soundType: item.id as SoundType })}
                          className={`py-1 px-1.5 rounded text-[11px] text-center border transition-all ${
                            settings.soundType === item.id
                              ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-semibold'
                              : 'bg-stone-900/50 border-stone-700 text-stone-400 hover:border-stone-600'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sound Volume Slider */}
                  {settings.soundType !== 'off' && (
                    <div className="pt-3">
                      <div className="flex items-center justify-between text-xs text-stone-400 mb-1.5">
                        <span>효과음 음량</span>
                        <span className="font-mono">{Math.round(settings.soundVolume * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.05"
                        value={settings.soundVolume}
                        onChange={(e) => onUpdateSettings({ soundVolume: parseFloat(e.target.value) })}
                        className="w-full accent-amber-500 cursor-pointer h-1.5 bg-stone-700 rounded-lg appearance-none"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Public Domain Copyright Info modal button */}
            <button
              id="btn-copyright-info"
              onClick={() => setShowCopyrightModal(true)}
              title="저작권 안내 (공공누리/공유마당)"
              className="p-2 rounded-lg bg-stone-800/60 border border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-600 transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Copyright dialog */}
      {showCopyrightModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-stone-200">
            <div className="flex items-center justify-between pb-4 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-stone-100">저작권 준수 및 자유이용 안내</h3>
              </div>
              <button
                onClick={() => setShowCopyrightModal(false)}
                className="text-stone-400 hover:text-stone-100 text-sm p-1"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-stone-300">
              <p>
                본 타자연습 웹앱에 수록된 모든 문학 작품은 대한민국 저작권법 제39조 및 제40조에 의거하여,
                <strong className="text-amber-300 font-medium"> 저작권 보호기간(저작자 사후 70년)이 만료된 퍼블릭 도메인(Public Domain)</strong> 저작물입니다.
              </p>
              <div className="bg-stone-800/80 p-3.5 rounded-xl border border-stone-700/80 space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">•</span>
                  <span><strong>윤동주, 김유정, 이효석, 이상, 한용운, 현진건:</strong> 저작자 사후 70년 이상 경과하여 자유로운 이용이 보장된 한국 근현대 고전 문학.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">•</span>
                  <span><strong>생텍쥐페리, 프란츠 카프카:</strong> 원작 저작권 만료 및 만료 번역본 기반 문학 발췌.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>국립중앙도서관 공유마당 및 공공누리(제1유형) 자유이용 가이드라인을 엄격히 준수합니다.</span>
                </div>
              </div>
              <p className="text-xs text-stone-400">
                아름다운 우리 문학과 세계 고전의 숨결을 느끼며 순수한 필사의 즐거움과 타자 실력을 함께 키워보세요.
              </p>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowCopyrightModal(false)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-sm transition-colors"
              >
                확인했습니다
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
