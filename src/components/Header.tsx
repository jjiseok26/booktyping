import React, { useState } from 'react';
import {
  BookOpen,
  BarChart3,
  Keyboard,
  Trophy,
  Volume2,
  VolumeX,
  Type,
  Sparkles,
  HelpCircle,
  FileText,
  LogOut,
  ChevronDown,
  LogIn,
  UserPlus,
  School,
  Menu,
  X,
} from 'lucide-react';
import { FontFamily, FontSize, SoundType, TypingSettings, StudentProfile, StudentAccount } from '../types';

type AppView = 'typing' | 'books' | 'dashboard' | 'leaderboard' | 'reports';

interface HeaderProps {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
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

const NAV_ITEMS: Array<{ id: AppView; label: string; Icon: typeof Keyboard }> = [
  { id: 'typing', label: '타자 필사', Icon: Keyboard },
  { id: 'books', label: '작품 서재', Icon: BookOpen },
  { id: 'leaderboard', label: '반별 순위표', Icon: Trophy },
  { id: 'reports', label: '독서기록장', Icon: FileText },
  { id: 'dashboard', label: '통계', Icon: BarChart3 },
];

export const Header: React.FC<HeaderProps> = ({
  currentView,
  setCurrentView,
  settings,
  onUpdateSettings,
  activeBookTitle,
  activeExcerptTitle,
  currentAccount,
  onOpenAuthModal,
  onLogoutAccount,
  onOpenTeacherLogin,
}) => {
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [showCopyrightModal, setShowCopyrightModal] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const goTo = (view: AppView) => {
    setCurrentView(view);
    setMobileOpen(false);
  };

  return (
    <>
      <div className="md:hidden sticky top-0 z-30 bg-stone-900 text-stone-100 border-b border-stone-800 px-3 h-14 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg bg-stone-800 border border-stone-700"
          aria-label="메뉴 열기"
        >
          <Menu className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => goTo('typing')} className="font-batang font-bold">
          문학 타자연습
        </button>
        {currentAccount ? (
          <span className="text-xs text-amber-300 truncate max-w-[88px]">{currentAccount.name}</span>
        ) : (
          <span className="w-8" />
        )}
      </div>

      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-stone-950/50 md:hidden"
          aria-label="메뉴 닫기"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-56 bg-stone-900 text-stone-100 border-r border-stone-800 flex flex-col shadow-xl transition-transform md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="px-4 pt-5 pb-4 border-b border-stone-800">
          <div className="flex items-start justify-between gap-2">
            <button onClick={() => goTo('typing')} className="text-left group">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 group-hover:scale-105 transition-transform">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-batang text-base font-bold tracking-tight">문학 타자연습</p>
                  <p className="text-[11px] text-amber-300">공개명작</p>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-stone-400 leading-relaxed">
                {activeBookTitle ? `${activeBookTitle} · ${activeExcerptTitle}` : '고전 명작을 필사하며 기르는 손끝의 감각'}
              </p>
            </button>
            <button type="button" className="md:hidden p-1 text-stone-400" onClick={() => setMobileOpen(false)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ id, label, Icon }) => (
            <button
              key={id}
              id={`nav-btn-${id}`}
              onClick={() => goTo(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                currentView === id
                  ? 'bg-amber-500 text-stone-950 shadow-sm font-semibold'
                  : 'text-stone-300 hover:text-stone-100 hover:bg-stone-800'
              }`}
            >
              <Icon className={`w-4 h-4 ${currentView === id ? '' : id === 'leaderboard' ? 'text-amber-400' : ''}`} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-stone-800 space-y-2">
          {currentAccount ? (
            <div className="relative">
              <button
                id="btn-header-student-menu"
                onClick={() => {
                  setShowSettingsDropdown(false);
                  setShowUserDropdown(!showUserDropdown);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-750 border border-stone-700 text-stone-200 text-xs"
              >
                <div className="w-7 h-7 rounded-full bg-amber-500 text-stone-950 font-bold flex items-center justify-center text-[11px]">
                  {currentAccount.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="font-semibold text-stone-100 truncate">{currentAccount.name}</p>
                  <p className="text-[11px] text-amber-300 font-mono">
                    {currentAccount.grade}-{currentAccount.classNum}반 {currentAccount.studentNum}번
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              </button>

              {showUserDropdown && (
                <div className="absolute left-0 right-0 bottom-full mb-2 bg-stone-800 border border-stone-700 rounded-2xl shadow-2xl p-3 text-stone-200 text-xs z-50">
                  <div className="flex items-center gap-2.5 pb-2.5 border-b border-stone-700/80">
                    <div className="w-9 h-9 rounded-full bg-amber-500 text-stone-950 font-bold flex items-center justify-center text-sm">
                      {currentAccount.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-stone-100 truncate flex items-center gap-1.5">
                        <span>{currentAccount.name} 학생</span>
                        <span className="text-[9px] px-1.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
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
                    <div className="text-stone-200 font-semibold pl-4">{currentAccount.schoolName}</div>
                    <div className="text-amber-300 pl-4 font-mono">
                      {currentAccount.grade}학년 {currentAccount.classNum}반 {currentAccount.studentNum}번
                    </div>
                  </div>

                  {onLogoutAccount && (
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        onLogoutAccount();
                      }}
                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>로그아웃</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            onOpenAuthModal && (
              <div className="space-y-1.5">
                <button
                  id="btn-header-student-login"
                  onClick={() => onOpenAuthModal('login')}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>학생 로그인</span>
                </button>
                <button
                  id="btn-header-student-register"
                  onClick={() => onOpenAuthModal('register')}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold border border-stone-700"
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
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold border border-stone-700"
            >
              <School className="w-3.5 h-3.5 text-amber-400" />
              <span>선생님 로그인</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 pt-1">
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

            <div className="relative flex-1">
              <button
                id="btn-settings-toggle"
                onClick={() => {
                  setShowUserDropdown(false);
                  setShowSettingsDropdown(!showSettingsDropdown);
                }}
                className="w-full flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 hover:text-stone-100 text-xs font-medium"
              >
                <Type className="w-4 h-4 text-amber-300" />
                <span>보기 설정</span>
              </button>

              {showSettingsDropdown && (
                <div className="absolute left-0 right-0 bottom-full mb-2 w-64 max-w-[calc(100vw-2rem)] bg-stone-800 border border-stone-700 rounded-xl shadow-xl p-4 text-stone-200 text-sm z-50">
                  <div className="flex items-center justify-between pb-3 border-b border-stone-700">
                    <span className="font-semibold text-stone-100 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      타자 환경 설정
                    </span>
                    <button onClick={() => setShowSettingsDropdown(false)} className="text-stone-400 hover:text-stone-200 text-xs">
                      닫기
                    </button>
                  </div>

                  <div className="py-3 border-b border-stone-700">
                    <label className="block text-xs font-medium text-stone-400 mb-2">글꼴 스타일</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['batang', 'sans', 'mono'] as FontFamily[]).map((f) => (
                        <button
                          key={f}
                          onClick={() => onUpdateSettings({ font: f })}
                          className={`py-1.5 px-2 rounded text-xs text-center border ${
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

                  <div className="py-3 border-b border-stone-700">
                    <label className="block text-xs font-medium text-stone-400 mb-2">글자 크기</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(['sm', 'md', 'lg', 'xl'] as FontSize[]).map((size) => (
                        <button
                          key={size}
                          onClick={() => onUpdateSettings({ fontSize: size })}
                          className={`py-1 px-2 rounded text-xs text-center border ${
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
                          className={`py-1 px-1.5 rounded text-[11px] text-center border ${
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

            <button
              id="btn-copyright-info"
              onClick={() => setShowCopyrightModal(true)}
              title="저작권 안내 (공공누리/공유마당)"
              className="p-2 rounded-lg bg-stone-800/60 border border-stone-700 text-stone-400 hover:text-stone-200"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

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
              <button onClick={() => setShowCopyrightModal(false)} className="text-stone-400 hover:text-stone-100 text-sm p-1">
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
                  <span>
                    <strong>윤동주, 김유정, 이효석, 이상, 한용운, 현진건:</strong> 저작자 사후 70년 이상 경과하여 자유로운 이용이 보장된 한국 근현대 고전 문학.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">•</span>
                  <span>
                    <strong>생텍쥐페리, 프란츠 카프카:</strong> 원작 저작권 만료 및 만료 번역본 기반 문학 발췌.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>국립중앙도서관 공유마당 및 공공누리(제1유형) 자유이용 가이드라인을 엄격히 준수합니다.</span>
                </div>
              </div>
              <p className="text-xs text-stone-400">아름다운 우리 문학과 세계 고전의 숨결을 느끼며 순수한 필사의 즐거움과 타자 실력을 함께 키워보세요.</p>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowCopyrightModal(false)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-sm"
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
