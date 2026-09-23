export type FontFamily = 'batang' | 'sans' | 'mono';
export type FontSize = 'sm' | 'md' | 'lg' | 'xl';
export type SoundType = 'typewriter' | 'mechanical' | 'soft' | 'off';

export interface StudentAccount {
  id: string;          // `${schoolYear}_${schoolName}_${grade}_${classNum}_${studentNum}`
  schoolYear: string;  // e.g. "2026학년도"
  schoolName: string;  // e.g. "가온중학교"
  grade: number;       // e.g. 1, 2, 3
  classNum: number;    // e.g. 1, 2, 3
  studentNum: number;  // e.g. 1 ~ 40
  name: string;        // 성명 (로그인 암호 역할)
  createdAt: number;
  lastLoginAt: number;
}

export interface StudentProfile {
  schoolYear: string;  // e.g. "2026학년도"
  schoolName: string;  // e.g. "가온중학교"
  grade: number;       // e.g. 1, 2, 3
  classNum: number;    // e.g. 1, 2, 3
  studentNum: number;  // e.g. 1 ~ 40
  name: string;        // 성명
  accountId?: string;
}

export type RankSortMode = 'effort' | 'speed' | 'volume' | 'accuracy';

export interface StudentRankRecord {
  id: string;
  profile: StudentProfile;
  isCurrentUser: boolean;
  totalChars: number;           // 누적 필사 글자수
  totalStrokes: number;         // 총 자모 타수
  completedSessions: number;    // 완주 세션 수
  totalPracticeTimeSec: number; // 총 연습 시간 (초)
  peakCpm: number;              // 순간 최고 타수
  avgCpm: number;               // 평균 타수
  avgAccuracy: number;          // 평균 정확도 (%)
  effortScore: number;          // 노력 열정 점수 (성실도+연습량+정확도)
  titleBadge: string;           // 칭호 (예: '열정 노력왕', '성실 필사가', '속도 마스터')
  lastActive: string;           // 최근 활동 시간
}

export interface BookExcerpt {
  id: string;
  bookTitle: string;
  author: string;
  authorBio: string;
  year: string;
  category: '한국 근대시' | '한국 근대소설' | '세계 고전문학' | '한국 고전·수필' | '명상과 철학';
  difficulty: '초급' | '중급' | '고급';
  title: string;
  description: string;
  sourceAttribution: string;
  publicDomainReason: string;
  badgeColor: string;
  coverGradient: string;
  sentences: string[];
  fullSentences?: string[];
  excerptSentences?: string[];
}

export interface TypingSessionResult {
  id: string;
  timestamp: number;
  excerptId: string;
  bookTitle: string;
  author: string;
  excerptTitle: string;
  cpm: number;           // 분당 타수 (Characters / Strokes Per Minute)
  wpm: number;           // Words per minute (approx cpm / 5)
  peakCpm: number;       // 최고 타수
  accuracy: number;      // 정확도 (%)
  errorCount: number;    // 총 오타수
  totalChars: number;    // 총 글자수
  totalStrokes: number;  // 총 자모 타수
  durationSeconds: number; // 소요 시간 (초)
  mistypedLetters: Record<string, number>; // 오타가 난 문자 통계
  studentProfile?: StudentProfile; // 세션 수행자 프로필
  earnedEffortPoints?: number;     // 이번 세션에서 획득한 노력 점수
}

export interface TypingProgress {
  excerptId: string;
  sentenceIndex: number;
  userInput: string;
  accumulatedCorrectStrokes: number;
  accumulatedTotalStrokes: number;
  accumulatedChars: number;
  totalSessionErrors: number;
  sessionMistypedLetters: Record<string, number>;
  elapsedSeconds: number;
  peakCpm: number;
}

export interface BookReport {
  id: string;
  createdAt: number;
  excerptId: string;
  bookTitle: string;
  author: string;
  excerptTitle: string;
  studentProfile: StudentProfile;
  // Typing context
  cpm: number;
  accuracy: number;
  durationSeconds: number;
  // Report content
  title: string;
  rating: number; // 1 to 5
  memorableQuote: string;    // 인상 깊었던 문장
  quoteReason: string;       // 선정한 이유
  content: string;           // 감상 및 느낀 점
  personalTakeaway: string;  // 나에게 주는 교훈 및 다짐
  paragraphNotes?: Array<{ from: number; to: number; note: string }>;
}

export interface SentenceRealtimeState {
  sentenceIndex: number;
  currentInput: string;
  isCompleted: boolean;
  cpm: number;
  accuracy: number;
  errorCount: number;
}

export interface TypingSettings {
  font: FontFamily;
  fontSize: FontSize;
  soundType: SoundType;
  soundVolume: number;
  showKeyboardGuide: boolean;
  autoNextSentence: boolean;
}
