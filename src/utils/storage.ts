import { TypingSessionResult, TypingSettings, StudentProfile, StudentRankRecord, RankSortMode, BookReport, StudentAccount, TypingProgress } from '../types';

const STORAGE_KEYS = {
  HISTORY: 'literary_typing_history_v2',
  SETTINGS: 'literary_typing_settings_v2',
  STUDENT_PROFILE: 'literary_typing_student_profile_v2',
  CLASS_CACHE: 'literary_typing_class_cache_v2',
  REPORTS: 'literary_typing_book_reports_v2',
  STUDENT_ACCOUNTS: 'literary_typing_student_accounts_v2',
  CURRENT_STUDENT_ACCOUNT: 'literary_typing_current_student_account_v2',
  RECENT_ACCOUNTS: 'literary_typing_recent_accounts_v2',
  TYPING_PROGRESS: 'literary_typing_progress_v1',
};

export const INITIAL_GUEST_PROFILE: StudentProfile = {
  schoolYear: '2026학년도',
  schoolName: '',
  grade: 1,
  classNum: 1,
  studentNum: 1,
  name: '',
};

export const DEFAULT_SETTINGS: TypingSettings = {
  font: 'batang',
  fontSize: 'lg',
  soundType: 'typewriter',
  soundVolume: 0.6,
  showKeyboardGuide: false,
  autoNextSentence: true,
};

export const RANKING_MIN_ACCURACY = 80;

export function rankingSessions(history: TypingSessionResult[]): TypingSessionResult[] {
  return history.filter((item) => Number(item.accuracy) >= RANKING_MIN_ACCURACY);
}

function isDemoRecordId(id: unknown): boolean {
  const value = String(id || '');
  return value.startsWith('sample-') || value.startsWith('report-sample-') || value.startsWith('peer-');
}

export function getStoredHistory(): TypingSessionResult[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const cleaned = parsed.filter((item: { id?: string }) => item?.id && !isDemoRecordId(item.id));
    if (cleaned.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(cleaned));
    }
    return cleaned;
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

type ProgressStore = Record<string, Record<string, TypingProgress>>;

function readProgressStore(): ProgressStore {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.TYPING_PROGRESS) || '{}') as ProgressStore;
  } catch {
    return {};
  }
}

export function getStoredProgress(studentId: string, excerptId: string): TypingProgress | null {
  if (!studentId || !excerptId) return null;
  return readProgressStore()[studentId]?.[excerptId] || null;
}

export function saveStoredProgress(studentId: string, progress: TypingProgress): void {
  if (typeof window === 'undefined' || !studentId || !progress.excerptId) return;
  const store = readProgressStore();
  store[studentId] = { ...(store[studentId] || {}), [progress.excerptId]: progress };
  localStorage.setItem(STORAGE_KEYS.TYPING_PROGRESS, JSON.stringify(store));
}

export function clearStoredProgress(studentId: string, excerptId: string): void {
  if (typeof window === 'undefined' || !studentId || !excerptId) return;
  const store = readProgressStore();
  if (!store[studentId]) return;
  delete store[studentId][excerptId];
  localStorage.setItem(STORAGE_KEYS.TYPING_PROGRESS, JSON.stringify(store));
}

// Student Profile Management
function isLegacyDemoProfile(profile: { schoolName?: string; grade?: number; classNum?: number; studentNum?: number; name?: string; id?: string; accountId?: string }): boolean {
  const id = String(profile.id || profile.accountId || '');
  if (id === '2026학년도_가온중학교_2_3_15') return true;
  return (
    profile.schoolName === '가온중학교' &&
    profile.grade === 2 &&
    profile.classNum === 3 &&
    profile.studentNum === 15 &&
    profile.name === '김지민'
  );
}

export function getStoredStudentProfile(): StudentProfile {
  if (typeof window === 'undefined') return INITIAL_GUEST_PROFILE;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDENT_PROFILE);
    if (!raw) {
      return INITIAL_GUEST_PROFILE;
    }
    const profile = { ...INITIAL_GUEST_PROFILE, ...JSON.parse(raw) };
    if (isLegacyDemoProfile(profile)) {
      localStorage.setItem(STORAGE_KEYS.STUDENT_PROFILE, JSON.stringify(INITIAL_GUEST_PROFILE));
      return INITIAL_GUEST_PROFILE;
    }
    return profile;
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
      if (Array.isArray(parsed)) return parsed.filter((item: StudentAccount) => !isLegacyDemoProfile(item));
    }
    const legacyRaw = localStorage.getItem(STORAGE_KEYS.STUDENT_ACCOUNTS);
    if (!legacyRaw) return [];
    const parsed = JSON.parse(legacyRaw);
    return Array.isArray(parsed) ? parsed.filter((item: StudentAccount) => !isLegacyDemoProfile(item)) : [];
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
    return Array.isArray(parsed) ? parsed.filter((item: StudentAccount) => !isLegacyDemoProfile(item)) : [];
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
    const account = JSON.parse(raw) as StudentAccount;
    if (isLegacyDemoProfile(account)) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_STUDENT_ACCOUNT, 'null');
      return null;
    }
    return account;
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

export function getClassLeaderboard(
  profile: StudentProfile,
  userHistory: TypingSessionResult[],
  selectedClassNum?: number
): StudentRankRecord[] {
  const activeClassNum = selectedClassNum ?? profile.classNum;
  const accounts = getStoredStudentAccounts();

  const classAccounts = accounts.filter(
    (a) =>
      a.schoolYear === profile.schoolYear &&
      a.schoolName === profile.schoolName &&
      a.grade === profile.grade &&
      (activeClassNum <= 0 || a.classNum === activeClassNum)
  );

  const rankedHistory = rankingSessions(userHistory);
  const hasUserSession = Boolean(profile.name && profile.name.trim()) || rankedHistory.length > 0 || userHistory.length > 0;

  if (classAccounts.length === 0 && !hasUserSession) {
    return [];
  }

  const totalChars = rankedHistory.reduce((sum, h) => sum + h.totalChars, 0);
  const totalStrokes = rankedHistory.reduce((sum, h) => sum + h.totalStrokes, 0);
  const completedSessions = rankedHistory.length;
  const totalPracticeTimeSec = rankedHistory.reduce((sum, h) => sum + h.durationSeconds, 0);
  const peakCpm = rankedHistory.length > 0 ? Math.max(...rankedHistory.map((h) => h.peakCpm || h.cpm)) : 0;
  const avgCpm =
    rankedHistory.length > 0 ? Math.round(rankedHistory.reduce((sum, h) => sum + h.cpm, 0) / rankedHistory.length) : 0;
  const avgAccuracy =
    rankedHistory.length > 0
      ? parseFloat((rankedHistory.reduce((sum, h) => sum + h.accuracy, 0) / rankedHistory.length).toFixed(1))
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

  if (hasUserSession) {
    records.push({
      id: profile.accountId || `user-${profile.studentNum}`,
      profile: {
        ...profile,
        classNum: activeClassNum > 0 ? activeClassNum : profile.classNum,
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
        lastActive: rankedHistory.length > 0 ? '방금 전' : '활동 대기',
    });
  }

  for (const acc of classAccounts) {
    if (profile.accountId && acc.id === profile.accountId) continue;
    if (hasUserSession && acc.studentNum === profile.studentNum) continue;

    const peerHistory = rankingSessions(
      userHistory.filter(
        (h) => h.studentProfile?.accountId === acc.id || h.studentProfile?.studentNum === acc.studentNum
      )
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

export function getStoredBookReports(): BookReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REPORTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const cleaned = parsed.filter((item: { id?: string }) => item?.id && !isDemoRecordId(item.id));
    if (cleaned.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(cleaned));
    }
    return cleaned;
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
