import { TypingSessionResult, TypingSettings, StudentProfile, StudentRankRecord, RankSortMode, BookReport, StudentAccount } from '../types';

const STORAGE_KEYS = {
  HISTORY: 'literary_typing_history_v2',
  SETTINGS: 'literary_typing_settings_v2',
  STUDENT_PROFILE: 'literary_typing_student_profile_v2',
  CLASS_CACHE: 'literary_typing_class_cache_v2',
  REPORTS: 'literary_typing_book_reports_v2',
  STUDENT_ACCOUNTS: 'literary_typing_student_accounts_v2',
  CURRENT_STUDENT_ACCOUNT: 'literary_typing_current_student_account_v2',
  RECENT_ACCOUNTS: 'literary_typing_recent_accounts_v2',
};

export const INITIAL_GUEST_PROFILE: StudentProfile = {
  schoolYear: '2026학년도',
  schoolName: '',
  grade: 1,
  classNum: 1,
  studentNum: 1,
  name: '',
};

export const DEFAULT_STUDENT_ACCOUNT: StudentAccount = {
  id: '2026학년도_가온중학교_2_3_15',
  schoolYear: '2026학년도',
  schoolName: '가온중학교',
  grade: 2,
  classNum: 3,
  studentNum: 15,
  name: '김지민',
  createdAt: 1711000000000,
  lastLoginAt: Date.now(),
};

export const DEFAULT_STUDENT_PROFILE: StudentProfile = {
  schoolYear: '2026학년도',
  schoolName: '가온중학교',
  grade: 2,
  classNum: 3,
  studentNum: 15,
  name: '김지민',
  accountId: '2026학년도_가온중학교_2_3_15',
};

export const DEFAULT_SETTINGS: TypingSettings = {
  font: 'batang',
  fontSize: 'lg',
  soundType: 'typewriter',
  soundVolume: 0.6,
  showKeyboardGuide: false,
  autoNextSentence: true,
};

// Seed realistic practice history for beautiful charts on first launch
export const INITIAL_SAMPLE_RECORDS: TypingSessionResult[] = [
  {
    id: 'sample-1',
    timestamp: Date.now() - 1000 * 60 * 60 * 48, // 2 days ago
    excerptId: 'yoon-seosi',
    bookTitle: '하늘과 바람과 별과 시',
    author: '윤동주',
    excerptTitle: '서시 (序詩)',
    cpm: 310,
    wpm: 62,
    peakCpm: 360,
    accuracy: 96.5,
    errorCount: 3,
    totalChars: 125,
    totalStrokes: 298,
    durationSeconds: 58,
    mistypedLetters: { 'ㄹ': 2, '이': 1 },
  },
  {
    id: 'sample-2',
    timestamp: Date.now() - 1000 * 60 * 60 * 36, // 1.5 days ago
    excerptId: 'kim-dongbaek',
    bookTitle: '동백꽃',
    author: '김유정',
    excerptTitle: '점순이와 알싸한 동백꽃',
    cpm: 345,
    wpm: 69,
    peakCpm: 395,
    accuracy: 97.8,
    errorCount: 2,
    totalChars: 168,
    totalStrokes: 412,
    durationSeconds: 71,
    mistypedLetters: { 'ㅐ': 1, 'ㅂ': 1 },
  },
  {
    id: 'sample-3',
    timestamp: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
    excerptId: 'lee-hyoseok-memil',
    bookTitle: '메밀꽃 필 무렵',
    author: '이효석',
    excerptTitle: '달밤의 메밀밭 길',
    cpm: 382,
    wpm: 76,
    peakCpm: 430,
    accuracy: 98.4,
    errorCount: 2,
    totalChars: 210,
    totalStrokes: 520,
    durationSeconds: 82,
    mistypedLetters: { 'ㅢ': 1, 'ㅅ': 1 },
  },
  {
    id: 'sample-4',
    timestamp: Date.now() - 1000 * 60 * 60 * 12, // 12 hours ago
    excerptId: 'saint-exupery-prince',
    bookTitle: '어린 왕자',
    author: '생텍쥐페리',
    excerptTitle: '마음으로 보아야 보이는 것',
    cpm: 405,
    wpm: 81,
    peakCpm: 465,
    accuracy: 99.1,
    errorCount: 1,
    totalChars: 185,
    totalStrokes: 440,
    durationSeconds: 65,
    mistypedLetters: { 'ㅓ': 1 },
  },
  {
    id: 'sample-5',
    timestamp: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
    excerptId: 'yoon-byeol',
    bookTitle: '하늘과 바람과 별과 시',
    author: '윤동주',
    excerptTitle: '별 헤는 밤',
    cpm: 428,
    wpm: 85,
    peakCpm: 490,
    accuracy: 98.8,
    errorCount: 3,
    totalChars: 245,
    totalStrokes: 610,
    durationSeconds: 85,
    mistypedLetters: { 'ㄹ': 1, 'ㅁ': 1, 'ㄴ': 1 },
  }
];

export function getStoredHistory(): TypingSessionResult[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveTypingResult(result: TypingSessionResult): TypingSessionResult[] {
  if (typeof window === 'undefined') return [];
  try {
    const history = getStoredHistory();
    const updated = [result, ...history];
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function clearHistoryStorage(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify([]));
}

export function getStoredSettings(): TypingSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveStoredSettings(settings: TypingSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings', e);
  }
}

// Student Profile Management
export function getStoredStudentProfile(): StudentProfile {
  if (typeof window === 'undefined') return INITIAL_GUEST_PROFILE;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDENT_PROFILE);
    if (!raw) {
      return INITIAL_GUEST_PROFILE;
    }
    return { ...INITIAL_GUEST_PROFILE, ...JSON.parse(raw) };
  } catch {
    return INITIAL_GUEST_PROFILE;
  }
}

export function saveStoredStudentProfile(profile: StudentProfile): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.STUDENT_PROFILE, JSON.stringify(profile));
  } catch (e) {
    console.error('Failed to save student profile', e);
  }
}

// Helper to build canonical student account ID
export function buildStudentAccountId(
  schoolYear: string,
  schoolName: string,
  grade: number,
  classNum: number,
  studentNum: number
): string {
  const cleanSchool = schoolName.trim().replace(/\s+/g, '');
  const cleanYear = schoolYear.trim();
  return `${cleanYear}_${cleanSchool}_${grade}_${classNum}_${studentNum}`;
}

// Student Accounts Management
export function rememberRecentAccount(account: StudentAccount): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getRecentStudentAccounts().filter((item) => item.id !== account.id);
    localStorage.setItem(STORAGE_KEYS.RECENT_ACCOUNTS, JSON.stringify([account, ...existing].slice(0, 8)));
  } catch (e) {
    console.error('Failed to save recent student account', e);
  }
}

export function getRecentStudentAccounts(): StudentAccount[] {
  if (typeof window === 'undefined') return [];
  try {
    const recentRaw = localStorage.getItem(STORAGE_KEYS.RECENT_ACCOUNTS);
    if (recentRaw) {
      const parsed = JSON.parse(recentRaw);
      if (Array.isArray(parsed)) return parsed;
    }
    const legacyRaw = localStorage.getItem(STORAGE_KEYS.STUDENT_ACCOUNTS);
    if (!legacyRaw) return [];
    const parsed = JSON.parse(legacyRaw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getStoredStudentAccounts(): StudentAccount[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDENT_ACCOUNTS);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredStudentAccounts(accounts: StudentAccount[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.STUDENT_ACCOUNTS, JSON.stringify(accounts));
  } catch (e) {
    console.error('Failed to save student accounts', e);
  }
}

// Current Logged-in Student Account
export function getCurrentStudentAccount(): StudentAccount | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_STUDENT_ACCOUNT);
    if (!raw || raw === 'null') return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setCurrentStudentAccount(account: StudentAccount | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (account) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_STUDENT_ACCOUNT, JSON.stringify(account));
      // Sync student profile
      const profile: StudentProfile = {
        schoolYear: account.schoolYear,
        schoolName: account.schoolName,
        grade: account.grade,
        classNum: account.classNum,
        studentNum: account.studentNum,
        name: account.name,
        accountId: account.id,
      };
      saveStoredStudentProfile(profile);
    } else {
      localStorage.setItem(STORAGE_KEYS.CURRENT_STUDENT_ACCOUNT, 'null');
    }
  } catch (e) {
    console.error('Failed to set current student account', e);
  }
}

// Register Student Account (성명이 암호 역할)
export function registerStudentAccount(data: {
  schoolYear: string;
  schoolName: string;
  grade: number;
  classNum: number;
  studentNum: number;
  name: string;
}): { success: boolean; message: string; account?: StudentAccount } {
  const schoolName = data.schoolName.trim();
  const schoolYear = data.schoolYear.trim();
  const name = data.name.trim();

  if (!schoolName) {
    return { success: false, message: '학교명을 입력해주세요.' };
  }
  if (!name) {
    return { success: false, message: '학생 성명을 입력해주세요. (성명이 암호 역할을 합니다)' };
  }
  if (data.grade < 1 || data.classNum < 1 || data.studentNum < 1) {
    return { success: false, message: '학년, 반, 번호를 올바르게 입력해주세요.' };
  }

  const accounts = getStoredStudentAccounts();
  const accountId = buildStudentAccountId(schoolYear, schoolName, data.grade, data.classNum, data.studentNum);

  // Check if account already exists
  const existing = accounts.find((a) => a.id === accountId);
  if (existing) {
    return {
      success: false,
      message: `${schoolYear} ${schoolName} ${data.grade}학년 ${data.classNum}반 ${data.studentNum}번으로 이미 등록된 계정이 있습니다. 로그인 탭에서 본인 성명으로 로그인해 주세요.`,
    };
  }

  const newAccount: StudentAccount = {
    id: accountId,
    schoolYear,
    schoolName,
    grade: data.grade,
    classNum: data.classNum,
    studentNum: data.studentNum,
    name,
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
  };

  const updatedAccounts = [...accounts, newAccount];
  saveStoredStudentAccounts(updatedAccounts);
  setCurrentStudentAccount(newAccount);

  return {
    success: true,
    message: `${name} 학생의 회원가입이 완료되었습니다! (성명이 로그인 암호입니다)`,
    account: newAccount,
  };
}

// Login Student Account (성명을 암호로 검증)
export function loginStudentAccount(data: {
  schoolYear: string;
  schoolName: string;
  grade: number;
  classNum: number;
  studentNum: number;
  name: string;
}): { success: boolean; message: string; account?: StudentAccount } {
  const schoolName = data.schoolName.trim();
  const schoolYear = data.schoolYear.trim();
  const name = data.name.trim();

  if (!schoolName) {
    return { success: false, message: '학교명을 입력해주세요.' };
  }
  if (!name) {
    return { success: false, message: '등록된 학생 성명(암호)을 입력해주세요.' };
  }
  if (data.grade < 1 || data.classNum < 1 || data.studentNum < 1) {
    return { success: false, message: '학년, 반, 번호를 올바르게 입력해주세요.' };
  }

  const accounts = getStoredStudentAccounts();
  const accountId = buildStudentAccountId(schoolYear, schoolName, data.grade, data.classNum, data.studentNum);

  const matched = accounts.find((a) => a.id === accountId);

  if (!matched) {
    return {
      success: false,
      message: `입력하신 정보(${schoolYear} ${schoolName} ${data.grade}학년 ${data.classNum}반 ${data.studentNum}번)로 등록된 계정이 없습니다. [회원가입] 탭에서 먼저 등록해주세요.`,
    };
  }

  // Name check as password (case and whitespace normalized)
  if (matched.name.trim() !== name) {
    return {
      success: false,
      message: `등록된 학생 성명(암호)과 일치하지 않습니다. 가입 시 입력하셨던 성명을 정확히 입력해 주세요.`,
    };
  }

  // Update last login
  const updatedAccount: StudentAccount = {
    ...matched,
    lastLoginAt: Date.now(),
  };
  const updatedList = accounts.map((a) => (a.id === matched.id ? updatedAccount : a));
  saveStoredStudentAccounts(updatedList);
  setCurrentStudentAccount(updatedAccount);

  return {
    success: true,
    message: `${matched.name} 학생으로 로그인되었습니다.`,
    account: updatedAccount,
  };
}

// Find account by seat
export function findStudentAccountBySeat(data: {
  schoolYear: string;
  schoolName: string;
  grade: number;
  classNum: number;
  studentNum: number;
}): StudentAccount | null {
  const accounts = getStoredStudentAccounts();
  const accountId = buildStudentAccountId(
    data.schoolYear.trim(),
    data.schoolName.trim(),
    data.grade,
    data.classNum,
    data.studentNum
  );
  return accounts.find((a) => a.id === accountId) || null;
}

// Reset/Change Account Name (암호 초기화)
export function resetStudentAccountName(data: {
  schoolYear: string;
  schoolName: string;
  grade: number;
  classNum: number;
  studentNum: number;
  newName: string;
}): { success: boolean; message: string; account?: StudentAccount } {
  const newName = data.newName.trim();
  if (!newName) {
    return { success: false, message: '새로 설정할 학생 성명(새 암호)을 입력해주세요.' };
  }

  const accounts = getStoredStudentAccounts();
  const accountId = buildStudentAccountId(
    data.schoolYear.trim(),
    data.schoolName.trim(),
    data.grade,
    data.classNum,
    data.studentNum
  );

  const matched = accounts.find((a) => a.id === accountId);
  if (!matched) {
    return {
      success: false,
      message: '해당 학년도/학교/학년/반/번호로 등록된 학생 계정을 찾을 수 없습니다. [회원가입] 탭에서 새로 등록해주세요.',
    };
  }

  const updatedAccount: StudentAccount = {
    ...matched,
    name: newName,
    lastLoginAt: Date.now(),
  };

  const updatedList = accounts.map((a) => (a.id === matched.id ? updatedAccount : a));
  saveStoredStudentAccounts(updatedList);
  setCurrentStudentAccount(updatedAccount);

  return {
    success: true,
    message: `학생 성명(암호)이 '${newName}'(으)로 성공적으로 재설정되었습니다! 바로 로그인되었습니다.`,
    account: updatedAccount,
  };
}

// Delete account by seat (완전 초기화 후 재가입 가능)
export function deleteStudentAccountForSeat(data: {
  schoolYear: string;
  schoolName: string;
  grade: number;
  classNum: number;
  studentNum: number;
}): { success: boolean; message: string } {
  const accounts = getStoredStudentAccounts();
  const accountId = buildStudentAccountId(
    data.schoolYear.trim(),
    data.schoolName.trim(),
    data.grade,
    data.classNum,
    data.studentNum
  );

  const filtered = accounts.filter((a) => a.id !== accountId);
  saveStoredStudentAccounts(filtered);

  const current = getCurrentStudentAccount();
  if (current && current.id === accountId) {
    setCurrentStudentAccount(null);
  }

  return {
    success: true,
    message: '해당 학급 번호의 계정 정보가 초기화되었습니다. [회원가입] 탭에서 새로 등록하실 수 있습니다.',
  };
}

// Single session effort calculation
export function calculateSessionEffortPoints(result: {
  totalChars: number;
  durationSeconds: number;
  accuracy: number;
  cpm: number;
}): number {
  const charPoints = Math.round(result.totalChars * 1.2);
  const completionBonus = 120;
  const timePoints = Math.round(result.durationSeconds * 0.8);
  const accuracyBonus = result.accuracy >= 98 ? 120 : result.accuracy >= 95 ? 80 : 30;
  const speedContribution = Math.round(result.cpm * 0.25);
  return charPoints + completionBonus + timePoints + accuracyBonus + speedContribution;
}

// Cumulative effort score calculation
export function calculateCumulativeEffortScore(stats: {
  totalChars: number;
  completedSessions: number;
  totalPracticeTimeSec: number;
  avgAccuracy: number;
  avgCpm: number;
  peakCpm: number;
}): number {
  const charsScore = stats.totalChars * 1;
  const sessionsScore = stats.completedSessions * 150;
  const timeScore = Math.round(stats.totalPracticeTimeSec * 0.7);
  const accuracyBonus = stats.avgAccuracy >= 98 ? 300 : stats.avgAccuracy >= 95 ? 180 : 60;
  const speedBonus = Math.round(stats.avgCpm * 0.35) + Math.round(stats.peakCpm * 0.15);
  return charsScore + sessionsScore + timeScore + accuracyBonus + speedBonus;
}

// Title badge determination
export function getTitleBadge(record: {
  effortScore: number;
  totalChars: number;
  completedSessions: number;
  peakCpm: number;
  avgAccuracy: number;
}): string {
  if (record.effortScore >= 6000 || record.totalChars >= 4000) return '🔥 열정 노력왕';
  if (record.completedSessions >= 12) return '✍️ 성실 필사가';
  if (record.peakCpm >= 450) return '⚡ 질주하는 번개';
  if (record.avgAccuracy >= 98.5) return '🎯 타자 명사수';
  if (record.effortScore >= 3000) return '🌱 도약하는 샛별';
  return '📖 문학 꿈나무';
}

// Generate realistic classmate data for a school/class
interface ClassmateSeed {
  studentNum: number;
  name: string;
  totalChars: number;
  completedSessions: number;
  totalPracticeTimeSec: number;
  peakCpm: number;
  avgCpm: number;
  avgAccuracy: number;
  lastActive: string;
}

const BASE_CLASSMATES: ClassmateSeed[] = [
  {
    studentNum: 1,
    name: '강지안',
    totalChars: 4850,
    completedSessions: 22,
    totalPracticeTimeSec: 1420,
    peakCpm: 340,
    avgCpm: 310,
    avgAccuracy: 98.4,
    lastActive: '10분 전',
  },
  {
    studentNum: 4,
    name: '박서아',
    totalChars: 4230,
    completedSessions: 19,
    totalPracticeTimeSec: 1250,
    peakCpm: 390,
    avgCpm: 335,
    avgAccuracy: 97.9,
    lastActive: '25분 전',
  },
  {
    studentNum: 7,
    name: '이준서',
    totalChars: 3720,
    completedSessions: 16,
    totalPracticeTimeSec: 1110,
    peakCpm: 460,
    avgCpm: 410,
    avgAccuracy: 96.8,
    lastActive: '40분 전',
  },
  {
    studentNum: 9,
    name: '정하은',
    totalChars: 3410,
    completedSessions: 15,
    totalPracticeTimeSec: 990,
    peakCpm: 320,
    avgCpm: 295,
    avgAccuracy: 99.2,
    lastActive: '1시간 전',
  },
  {
    studentNum: 12,
    name: '유시우',
    totalChars: 2940,
    completedSessions: 13,
    totalPracticeTimeSec: 860,
    peakCpm: 480,
    avgCpm: 425,
    avgAccuracy: 95.5,
    lastActive: '2시간 전',
  },
  {
    studentNum: 18,
    name: '윤도현',
    totalChars: 2650,
    completedSessions: 11,
    totalPracticeTimeSec: 780,
    peakCpm: 350,
    avgCpm: 315,
    avgAccuracy: 97.2,
    lastActive: '3시간 전',
  },
  {
    studentNum: 21,
    name: '송민서',
    totalChars: 2100,
    completedSessions: 9,
    totalPracticeTimeSec: 620,
    peakCpm: 290,
    avgCpm: 260,
    avgAccuracy: 98.1,
    lastActive: '어제',
  },
  {
    studentNum: 23,
    name: '임수아',
    totalChars: 1850,
    completedSessions: 8,
    totalPracticeTimeSec: 540,
    peakCpm: 520,
    avgCpm: 460,
    avgAccuracy: 94.8,
    lastActive: '어제',
  },
  {
    studentNum: 26,
    name: '조우진',
    totalChars: 1540,
    completedSessions: 7,
    totalPracticeTimeSec: 460,
    peakCpm: 310,
    avgCpm: 280,
    avgAccuracy: 96.5,
    lastActive: '어제',
  },
  {
    studentNum: 28,
    name: '한예은',
    totalChars: 1220,
    completedSessions: 5,
    totalPracticeTimeSec: 380,
    peakCpm: 270,
    avgCpm: 245,
    avgAccuracy: 97.5,
    lastActive: '2일 전',
  },
  {
    studentNum: 31,
    name: '오지호',
    totalChars: 980,
    completedSessions: 4,
    totalPracticeTimeSec: 310,
    peakCpm: 330,
    avgCpm: 290,
    avgAccuracy: 95.8,
    lastActive: '2일 전',
  },
  {
    studentNum: 34,
    name: '배채원',
    totalChars: 750,
    completedSessions: 3,
    totalPracticeTimeSec: 240,
    peakCpm: 260,
    avgCpm: 230,
    avgAccuracy: 96.2,
    lastActive: '3일 전',
  },
];

// Helper to get student rankings for the requested class
export function getClassLeaderboard(
  profile: StudentProfile,
  userHistory: TypingSessionResult[],
  selectedClassNum?: number
): StudentRankRecord[] {
  const activeClassNum = selectedClassNum ?? profile.classNum;
  const accounts = getStoredStudentAccounts();

  // Filter registered accounts in this school & class
  const classAccounts = accounts.filter(
    (a) =>
      a.schoolYear === profile.schoolYear &&
      a.schoolName === profile.schoolName &&
      a.grade === profile.grade &&
      a.classNum === activeClassNum
  );

  const hasUserSession = Boolean(profile.name && profile.name.trim()) || userHistory.length > 0;

  // If no registered students in this class and no current user activity, return empty list
  if (classAccounts.length === 0 && !hasUserSession) {
    return [];
  }

  // 1. Calculate current user stats from history
  const totalChars = userHistory.reduce((sum, h) => sum + h.totalChars, 0);
  const totalStrokes = userHistory.reduce((sum, h) => sum + h.totalStrokes, 0);
  const completedSessions = userHistory.length;
  const totalPracticeTimeSec = userHistory.reduce((sum, h) => sum + h.durationSeconds, 0);
  const peakCpm = userHistory.length > 0 ? Math.max(...userHistory.map((h) => h.peakCpm || h.cpm)) : 0;
  const avgCpm =
    userHistory.length > 0 ? Math.round(userHistory.reduce((sum, h) => sum + h.cpm, 0) / userHistory.length) : 0;
  const avgAccuracy =
    userHistory.length > 0
      ? parseFloat((userHistory.reduce((sum, h) => sum + h.accuracy, 0) / userHistory.length).toFixed(1))
      : 0;

  const userEffortScore = calculateCumulativeEffortScore({
    totalChars,
    completedSessions,
    totalPracticeTimeSec,
    avgAccuracy,
    avgCpm,
    peakCpm,
  });

  const records: StudentRankRecord[] = [];

  // Add current active user
  if (hasUserSession) {
    const currentUserRecord: StudentRankRecord = {
      id: profile.accountId || `user-${profile.studentNum}`,
      profile: {
        ...profile,
        classNum: activeClassNum,
      },
      isCurrentUser: true,
      totalChars,
      totalStrokes,
      completedSessions,
      totalPracticeTimeSec,
      peakCpm,
      avgCpm,
      avgAccuracy,
      effortScore: userEffortScore,
      titleBadge: getTitleBadge({
        effortScore: userEffortScore,
        totalChars,
        completedSessions,
        peakCpm,
        avgAccuracy,
      }),
      lastActive: userHistory.length > 0 ? '방금 전' : '활동 대기',
    };
    records.push(currentUserRecord);
  }

  // 2. Add other registered accounts in this class
  for (const acc of classAccounts) {
    if (profile.accountId && acc.id === profile.accountId) continue;
    if (hasUserSession && acc.studentNum === profile.studentNum) continue;

    const peerHistory = userHistory.filter(
      (h) => h.studentProfile?.accountId === acc.id || h.studentProfile?.studentNum === acc.studentNum
    );
    const peerChars = peerHistory.reduce((sum, h) => sum + h.totalChars, 0);
    const peerStrokes = peerHistory.reduce((sum, h) => sum + h.totalStrokes, 0);
    const peerSessions = peerHistory.length;
    const peerTime = peerHistory.reduce((sum, h) => sum + h.durationSeconds, 0);
    const peerPeak = peerSessions > 0 ? Math.max(...peerHistory.map((h) => h.peakCpm || h.cpm)) : 0;
    const peerAvgCpm = peerSessions > 0 ? Math.round(peerHistory.reduce((sum, h) => sum + h.cpm, 0) / peerSessions) : 0;
    const peerAcc =
      peerSessions > 0
        ? parseFloat((peerHistory.reduce((sum, h) => sum + h.accuracy, 0) / peerSessions).toFixed(1))
        : 0;
    const peerEffort = calculateCumulativeEffortScore({
      totalChars: peerChars,
      completedSessions: peerSessions,
      totalPracticeTimeSec: peerTime,
      avgAccuracy: peerAcc,
      avgCpm: peerAvgCpm,
      peakCpm: peerPeak,
    });

    records.push({
      id: `acc-${acc.id}`,
      profile: {
        schoolYear: acc.schoolYear,
        schoolName: acc.schoolName,
        grade: acc.grade,
        classNum: acc.classNum,
        studentNum: acc.studentNum,
        name: acc.name,
        accountId: acc.id,
      },
      isCurrentUser: false,
      totalChars: peerChars,
      totalStrokes: peerStrokes,
      completedSessions: peerSessions,
      totalPracticeTimeSec: peerTime,
      peakCpm: peerPeak,
      avgCpm: peerAvgCpm,
      avgAccuracy: peerAcc,
      effortScore: peerEffort,
      titleBadge: getTitleBadge({
        effortScore: peerEffort,
        totalChars: peerChars,
        completedSessions: peerSessions,
        peakCpm: peerPeak,
        avgAccuracy: peerAcc,
      }),
      lastActive: peerSessions > 0 ? '기록 있음' : '등록 완료',
    });
  }

  return records;
}

// Generate demo peers for previewing populated leaderboard
export function getSampleClassLeaderboard(
  profile: StudentProfile,
  userHistory: TypingSessionResult[],
  selectedClassNum?: number,
  existingRecords?: StudentRankRecord[]
): StudentRankRecord[] {
  const activeClassNum = selectedClassNum ?? profile.classNum;
  const realRecords = existingRecords ?? getClassLeaderboard(profile, userHistory, activeClassNum);
  const classSeedModifier = (activeClassNum * 13) % 10;
  const peerRecords: StudentRankRecord[] = BASE_CLASSMATES.filter(
    (c) => c.studentNum !== profile.studentNum
  ).map((seed) => {
    const chars = Math.max(200, seed.totalChars + classSeedModifier * 45);
    const sessions = Math.max(1, seed.completedSessions + (activeClassNum % 3) - 1);
    const practiceTime = Math.round(seed.totalPracticeTimeSec * (1 + (classSeedModifier - 5) * 0.02));
    const peak = seed.peakCpm + (classSeedModifier % 5) * 6;
    const avg = seed.avgCpm + (classSeedModifier % 4) * 5;
    const acc = parseFloat(Math.min(99.8, Math.max(92.0, seed.avgAccuracy + (classSeedModifier - 4) * 0.1)).toFixed(1));

    const effort = calculateCumulativeEffortScore({
      totalChars: chars,
      completedSessions: sessions,
      totalPracticeTimeSec: practiceTime,
      avgAccuracy: acc,
      avgCpm: avg,
      peakCpm: peak,
    });

    return {
      id: `peer-${activeClassNum}-${seed.studentNum}`,
      profile: {
        schoolYear: profile.schoolYear || '2026학년도',
        schoolName: profile.schoolName || '가온중학교',
        grade: profile.grade || 2,
        classNum: activeClassNum,
        studentNum: seed.studentNum,
        name: seed.name,
      },
      isCurrentUser: false,
      totalChars: chars,
      totalStrokes: chars * 2.4,
      completedSessions: sessions,
      totalPracticeTimeSec: practiceTime,
      peakCpm: peak,
      avgCpm: avg,
      avgAccuracy: acc,
      effortScore: effort,
      titleBadge: getTitleBadge({
        effortScore: effort,
        totalChars: chars,
        completedSessions: sessions,
        peakCpm: peak,
        avgAccuracy: acc,
      }),
      lastActive: seed.lastActive,
    };
  });

  return [...realRecords, ...peerRecords];
}

// Sort leaderboard by selected mode
export function sortLeaderboard(records: StudentRankRecord[], mode: RankSortMode): StudentRankRecord[] {
  const sorted = [...records];
  switch (mode) {
    case 'effort':
      // Primary: Effort score, secondary: total characters, tertiary: accuracy
      return sorted.sort((a, b) => b.effortScore - a.effortScore || b.totalChars - a.totalChars || b.avgAccuracy - a.avgAccuracy);
    case 'speed':
      // Primary: Peak CPM, secondary: Average CPM
      return sorted.sort((a, b) => b.peakCpm - a.peakCpm || b.avgCpm - a.avgCpm);
    case 'volume':
      // Primary: Total transcribed chars, secondary: Completed sessions
      return sorted.sort((a, b) => b.totalChars - a.totalChars || b.completedSessions - a.completedSessions);
    case 'accuracy':
      // Primary: Accuracy, secondary: Total characters
      return sorted.sort((a, b) => b.avgAccuracy - a.avgAccuracy || b.totalChars - a.totalChars);
    default:
      return sorted;
  }
}

// Default initial book report sample
export const INITIAL_SAMPLE_REPORTS: BookReport[] = [
  {
    id: 'report-sample-1',
    createdAt: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
    excerptId: 'yoon-seosi',
    bookTitle: '하늘과 바람과 별과 시',
    author: '윤동주',
    excerptTitle: '서시 (序詩)',
    studentProfile: DEFAULT_STUDENT_PROFILE,
    cpm: 325,
    accuracy: 98.4,
    durationSeconds: 165,
    title: '별을 노래하는 마음과 나 자신을 돌아보는 성찰',
    rating: 5,
    memorableQuote: '죽는 날까지 하늘을 우러러 한 점 부끄럼이 없기를, 잎새에 이는 바람에도 나는 괴로워했다.',
    quoteReason: '단순한 바람에도 부끄러움을 느끼며 스스로를 끊임없이 되돌아보고 정직하게 살고자 했던 시인의 순결한 고뇌가 마음에 깊이 와닿았습니다.',
    content: '윤동주 시인의 《서시》를 한 글자씩 키보드로 옮겨 적으며, 일제강점기라는 어두운 시대 속에서도 결코 꺾이지 않았던 청년 시인의 고결한 양심과 의지를 온몸으로 느낄 수 있었습니다. 말 한마디, 글 한 줄조차 자유롭지 못했던 시절에 시인은 밤하늘의 별을 바라보며 자신에게 주어진 길을 묵묵히 걸어가겠다고 다짐했습니다. 편안한 환경에서 공부하는 저 자신이 작은 유혹이나 게으름에 부끄러운 행동을 하지는 않았는지 깊이 반성하게 되었고, 시인의 간절한 언어가 오늘날 저에게도 커다란 울림을 주었습니다.',
    personalTakeaway: '앞으로 학업이나 생활 속에서 양심에 부끄러움이 없도록 매 순간 정직하고 성실하게 행동하고, 나만의 ‘별’을 향해 꿋꿋이 걸어가겠습니다.',
  },
];

export function getStoredBookReports(): BookReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REPORTS);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse book reports from localStorage:', err);
    return [];
  }
}

export function saveStoredBookReport(report: BookReport): BookReport[] {
  try {
    const existing = getStoredBookReports();
    // check if editing existing or adding new
    const idx = existing.findIndex((r) => r.id === report.id);
    let updated: BookReport[];
    if (idx >= 0) {
      updated = [...existing];
      updated[idx] = report;
    } else {
      updated = [report, ...existing];
    }
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to save book report:', err);
    return getStoredBookReports();
  }
}

export function deleteStoredBookReport(id: string): BookReport[] {
  try {
    const existing = getStoredBookReports();
    const updated = existing.filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to delete book report:', err);
    return getStoredBookReports();
  }
}
