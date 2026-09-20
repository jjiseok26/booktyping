import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  BarChart3,
  Zap,
  Target,
  Clock,
  BookOpen,
  Award,
  Download,
  RotateCcw,
  Trash2,
  TrendingUp,
  AlertTriangle,
  Feather,
  ArrowRight,
  FileText,
} from 'lucide-react';
import { TypingSessionResult } from '../types';
import { INITIAL_SAMPLE_RECORDS } from '../utils/storage';

interface DashboardProps {
  history: TypingSessionResult[];
  onClearHistory: () => void;
  onResetSampleData: () => void;
  onDeleteRecord: (id: string) => void;
  onStartTyping: () => void;
  onWriteReport?: (record: TypingSessionResult) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  history,
  onClearHistory,
  onResetSampleData,
  onDeleteRecord,
  onStartTyping,
  onWriteReport,
}) => {
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'recent10'>('all');

  // Filter history for charts
  const chartHistory = useMemo(() => {
    // Re-order chronologically (oldest to newest) for trends
    const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);
    if (filterPeriod === 'recent10') {
      return sorted.slice(-10);
    }
    return sorted;
  }, [history, filterPeriod]);

  // High-level aggregates
  const stats = useMemo(() => {
    if (history.length === 0) {
      return {
        avgCpm: 0,
        peakCpm: 0,
        avgAccuracy: 0,
        totalChars: 0,
        totalSeconds: 0,
        completedCount: 0,
      };
    }

    const totalCpm = history.reduce((sum, h) => sum + h.cpm, 0);
    const maxPeak = Math.max(...history.map((h) => h.peakCpm || h.cpm));
    const totalAcc = history.reduce((sum, h) => sum + h.accuracy, 0);
    const totalChars = history.reduce((sum, h) => sum + h.totalChars, 0);
    const totalSeconds = history.reduce((sum, h) => sum + h.durationSeconds, 0);

    return {
      avgCpm: Math.round(totalCpm / history.length),
      peakCpm: maxPeak,
      avgAccuracy: Math.round((totalAcc / history.length) * 10) / 10,
      totalChars,
      totalSeconds,
      completedCount: history.length,
    };
  }, [history]);

  // Chart 1: Speed Trend data
  const speedTrendData = useMemo(() => {
    return chartHistory.map((item, index) => {
      const date = new Date(item.timestamp);
      const label = `${date.getMonth() + 1}/${date.getDate()} #${index + 1}`;
      return {
        session: label,
        cpm: item.cpm,
        peakCpm: item.peakCpm || item.cpm,
        title: item.excerptTitle,
        book: item.bookTitle,
      };
    });
  }, [chartHistory]);

  // Chart 2: Accuracy Trend data
  const accuracyTrendData = useMemo(() => {
    return chartHistory.map((item, index) => {
      const date = new Date(item.timestamp);
      const label = `${date.getMonth() + 1}/${date.getDate()} #${index + 1}`;
      return {
        session: label,
        accuracy: item.accuracy,
        errors: item.errorCount,
        title: item.excerptTitle,
      };
    });
  }, [chartHistory]);

  // Chart 3: Book Volume distribution data
  const bookDistributionData = useMemo(() => {
    const bookMap: Record<string, { bookTitle: string; count: number; chars: number; avgCpm: number; totalCpm: number }> = {};

    history.forEach((h) => {
      const key = h.bookTitle;
      if (!bookMap[key]) {
        bookMap[key] = { bookTitle: key, count: 0, chars: 0, avgCpm: 0, totalCpm: 0 };
      }
      bookMap[key].count += 1;
      bookMap[key].chars += h.totalChars;
      bookMap[key].totalCpm += h.cpm;
    });

    return Object.values(bookMap).map((b) => ({
      name: b.bookTitle.length > 8 ? b.bookTitle.substring(0, 8) + '…' : b.bookTitle,
      fullName: b.bookTitle,
      글자수: b.chars,
      연습횟수: b.count,
      평균타수: Math.round(b.totalCpm / b.count),
    }));
  }, [history]);

  // Chart 4: Weak Characters / Frequent Mistypes
  const mistypeStats = useMemo(() => {
    const map: Record<string, number> = {};
    history.forEach((h) => {
      if (h.mistypedLetters) {
        Object.entries(h.mistypedLetters).forEach(([char, cnt]) => {
          map[char] = (map[char] || 0) + cnt;
        });
      }
    });

    return Object.entries(map)
      .map(([char, count]) => ({
        char: char === ' ' ? '공백' : char,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [history]);

  // Format seconds to hh:mm:ss
  const formatDuration = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hours > 0) return `${hours}시간 ${mins}분`;
    if (mins > 0) return `${mins}분 ${secs}초`;
    return `${secs}초`;
  };

  // Export CSV function
  const handleExportCSV = () => {
    if (history.length === 0) return;
    const headers = ['일시', '도서명', '작가', '작품명', '타수(CPM)', '정확도(%)', '오타수', '필사글자수', '소요시간(초)'];
    const rows = history.map((h) => [
      new Date(h.timestamp).toLocaleString('ko-KR'),
      `"${h.bookTitle.replace(/"/g, '""')}"`,
      `"${h.author.replace(/"/g, '""')}"`,
      `"${h.excerptTitle.replace(/"/g, '""')}"`,
      h.cpm,
      h.accuracy,
      h.errorCount,
      h.totalChars,
      h.durationSeconds,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `문학타자연습_통계기록_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Banner & Action Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-stone-200 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-medium mb-2">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>타자 속도 및 정확도 정밀 통계 분석</span>
          </div>
          <h1 className="font-batang text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">
            나의 문학 필사 대시보드
          </h1>
          <p className="mt-1.5 text-stone-600 text-sm sm:text-base leading-relaxed">
            필사 세션마다 실시간으로 기록된 분당 타수(CPM), 정확도 변화, 취약 글자들을 분석하여 타자 역량 성장을 시각화합니다.
          </p>
        </div>

        {/* Toolbar Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onStartTyping}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Feather className="w-4 h-4" />
            <span>필사 계속하기</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={history.length === 0}
            className="px-3 py-2 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors disabled:opacity-40"
            title="CSV 파일로 저장"
          >
            <Download className="w-4 h-4 text-stone-500" />
            <span>CSV 저장</span>
          </button>

          <button
            onClick={onResetSampleData}
            className="px-3 py-2 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors"
            title="기준 샘플 통계 데이터 다시 채우기"
          >
            <RotateCcw className="w-4 h-4 text-stone-500" />
            <span>예시 데이터 채우기</span>
          </button>

          <button
            onClick={onClearHistory}
            disabled={history.length === 0}
            className="px-3 py-2 rounded-xl bg-white hover:bg-rose-50 border border-stone-200 text-rose-600 text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors disabled:opacity-40"
            title="모든 연습 기록 삭제"
          >
            <Trash2 className="w-4 h-4" />
            <span>기록 비우기</span>
          </button>
        </div>
      </div>

      {/* Aggregate Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 mb-8">
        {/* Avg CPM */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-1">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="font-medium">평균 타수</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-stone-900">
            {stats.avgCpm}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">타/분 (CPM)</div>
        </div>

        {/* Peak CPM */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-1">
            <Award className="w-4 h-4 text-sky-500" />
            <span className="font-medium">최고 타수</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-sky-600">
            {stats.peakCpm}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">역대 최고 순간 속도</div>
        </div>

        {/* Avg Accuracy */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-1">
            <Target className="w-4 h-4 text-emerald-500" />
            <span className="font-medium">평균 정확도</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-600">
            {stats.avgAccuracy}%
          </div>
          <div className="text-[11px] text-stone-400 mt-1">
            {stats.avgAccuracy >= 95 ? '매우 우수한 안정성' : '집중 연습 권장'}
          </div>
        </div>

        {/* Total Characters */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-1">
            <Feather className="w-4 h-4 text-indigo-500" />
            <span className="font-medium">누적 필사 글자</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-indigo-600">
            {stats.totalChars.toLocaleString()}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">문학 본문 글자 수</div>
        </div>

        {/* Total Practice Time */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-1">
            <Clock className="w-4 h-4 text-violet-500" />
            <span className="font-medium">총 연습 시간</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-stone-800">
            {formatDuration(stats.totalSeconds)}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">순수 타건 집중 시간</div>
        </div>

        {/* Completed Excerpts */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-1">
            <BookOpen className="w-4 h-4 text-amber-600" />
            <span className="font-medium">완주한 세션</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-700">
            {stats.completedCount}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">작품 완주 기록</div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      {history.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center my-8">
          <BarChart3 className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-stone-800 mb-1">아직 저장된 필사 기록이 없습니다</h3>
          <p className="text-sm text-stone-500 mb-5">
            문학 서재에서 원하는 작품을 골라 첫 필사를 시작해보세요!
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={onStartTyping}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm"
            >
              타자 필사 시작하기
            </button>
            <button
              onClick={onResetSampleData}
              className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-sm"
            >
              예시 통계 차트 보기
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Charts Row 1: CPM Trend & Accuracy Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Chart 1: CPM Speed Growth Line Chart */}
            <div className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-batang text-lg font-bold text-stone-900 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    타자 속도(CPM) 변화 추이
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    회차별 평균 타수 및 최고 순간 타수 변화
                  </p>
                </div>
                <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg text-xs">
                  <button
                    onClick={() => setFilterPeriod('all')}
                    className={`px-2 py-1 rounded ${filterPeriod === 'all' ? 'bg-white font-bold shadow-xs' : 'text-stone-500'}`}
                  >
                    전체
                  </button>
                  <button
                    onClick={() => setFilterPeriod('recent10')}
                    className={`px-2 py-1 rounded ${filterPeriod === 'recent10' ? 'bg-white font-bold shadow-xs' : 'text-stone-500'}`}
                  >
                    최근 10회
                  </button>
                </div>
              </div>

              <div className="h-64 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={speedTrendData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f1ef" />
                    <XAxis dataKey="session" tick={{ fontSize: 11, fill: '#78716c' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#78716c' }} domain={['auto', 'auto']} unit="타" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1c1917',
                        borderColor: '#44403c',
                        borderRadius: '12px',
                        color: '#f5f5f4',
                        fontSize: '12px',
                      }}
                      formatter={(value: any, name: any) => [
                        `${value} 타/분`,
                        name === 'cpm' ? '평균 타수' : '최고 타수',
                      ]}
                    />
                    <Legend
                      formatter={(value) => (value === 'cpm' ? '평균 타수' : '최고 타수')}
                      wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                    />
                    <ReferenceLine y={350} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: '기준 350타', fill: '#d97706', fontSize: 10 }} />
                    <Line
                      type="monotone"
                      dataKey="cpm"
                      stroke="#d97706"
                      strokeWidth={3}
                      dot={{ fill: '#d97706', r: 4 }}
                      activeDot={{ r: 6, stroke: '#fef3c7', strokeWidth: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="peakCpm"
                      stroke="#0284c7"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ fill: '#0284c7', r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Accuracy % Area Chart */}
            <div className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-batang text-lg font-bold text-stone-900 flex items-center gap-2">
                    <Target className="w-4 h-4 text-emerald-600" />
                    정확도(%) 안정성 추이
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    안정적인 타건 정확도 (권장 목표선: 95% 이상)
                  </p>
                </div>
              </div>

              <div className="h-64 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={accuracyTrendData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="accuracyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f1ef" />
                    <XAxis dataKey="session" tick={{ fontSize: 11, fill: '#78716c' }} />
                    <YAxis domain={[80, 100]} unit="%" tick={{ fontSize: 11, fill: '#78716c' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1c1917',
                        borderColor: '#44403c',
                        borderRadius: '12px',
                        color: '#f5f5f4',
                        fontSize: '12px',
                      }}
                      formatter={(value: any) => [`${value}%`, '정확도']}
                    />
                    <ReferenceLine y={95} stroke="#10b981" strokeDasharray="3 3" label={{ value: '목표 95%', fill: '#059669', fontSize: 10 }} />
                    <Area
                      type="monotone"
                      dataKey="accuracy"
                      stroke="#059669"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#accuracyGrad)"
                      dot={{ fill: '#059669', r: 4 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Charts Row 2: Book Volume Distribution & Weak Keys */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Book Distribution Bar Chart (2 cols) */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-stone-200 p-5 sm:p-6 shadow-sm">
              <h3 className="font-batang text-lg font-bold text-stone-900 flex items-center gap-2 mb-1">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                작품별 필사 분량 분포 (글자 수)
              </h3>
              <p className="text-xs text-stone-500 mb-4">
                어떤 문학 작품을 가장 많이 필사했는지 확인합니다
              </p>

              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bookDistributionData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f1ef" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#78716c' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#78716c' }} unit="자" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1c1917',
                        borderColor: '#44403c',
                        borderRadius: '12px',
                        color: '#f5f5f4',
                        fontSize: '12px',
                      }}
                      formatter={(value: any, name: any) => [
                        `${value} ${name === '글자수' ? '자' : '회'}`,
                        name,
                      ]}
                    />
                    <Bar dataKey="글자수" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Weak Keys / Mistypes (1 col) */}
            <div className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-batang text-lg font-bold text-stone-900 flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  취약 자모 / 오타 빈도 분석
                </h3>
                <p className="text-xs text-stone-500 mb-4">
                  타자 시 가장 자주 헛갈리거나 늦게 입력된 글자
                </p>

                {mistypeStats.length === 0 ? (
                  <div className="text-center py-10 text-stone-400 text-xs">
                    <p>오타 기록이 거의 없이 완벽한 타건을 유지하고 계십니다!</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {mistypeStats.map((item, idx) => {
                      const maxMistype = mistypeStats[0].count;
                      const pct = Math.round((item.count / maxMistype) * 100);
                      return (
                        <div key={item.char} className="flex items-center gap-2 text-xs">
                          <span className="w-8 font-mono text-center font-bold px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200 text-stone-800">
                            {item.char}
                          </span>
                          <div className="flex-1 bg-stone-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                idx === 0 ? 'bg-rose-500' : idx < 3 ? 'bg-amber-500' : 'bg-stone-400'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="font-mono text-stone-500 text-[11px] w-8 text-right">
                            {item.count}회
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-stone-100 text-[11px] text-stone-500 bg-stone-50 p-2.5 rounded-xl">
                💡 <strong>Tip:</strong> 이중모음(ㅘ, ㅚ, ㅢ)이나 겹받침은 손가락 이동 반경을 줄이면 속도와 정확도가 대폭 향상됩니다.
              </div>
            </div>
          </div>

          {/* Detailed History Table */}
          <div className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-batang text-lg font-bold text-stone-900">
                상세 필사 기록 이력
              </h3>
              <span className="text-xs text-stone-500">
                총 <strong>{history.length}</strong>개 세션
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-600">
                <thead className="bg-stone-50 text-stone-700 font-semibold border-b border-stone-200">
                  <tr>
                    <th className="py-3 px-3">일시</th>
                    <th className="py-3 px-3">도서 및 작품</th>
                    <th className="py-3 px-3">작가</th>
                    <th className="py-3 px-3 text-right">타수 (CPM)</th>
                    <th className="py-3 px-3 text-right">최고 타수</th>
                    <th className="py-3 px-3 text-right">정확도</th>
                    <th className="py-3 px-3 text-right">오타</th>
                    <th className="py-3 px-3 text-right">글자수</th>
                    <th className="py-3 px-3 text-right">시간</th>
                    <th className="py-3 px-3 text-center">독후감</th>
                    <th className="py-3 px-3 text-center">삭제</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {history.map((record) => {
                    const date = new Date(record.timestamp);
                    const formattedDate = `${date.getFullYear()}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

                    return (
                      <tr key={record.id} className="hover:bg-stone-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono text-stone-500 text-[11px] whitespace-nowrap">
                          {formattedDate}
                        </td>
                        <td className="py-3 px-3 font-medium text-stone-900">
                          <span className="font-batang font-bold">{record.excerptTitle}</span>
                          <span className="block text-[11px] text-stone-400 font-normal">《{record.bookTitle}》</span>
                        </td>
                        <td className="py-3 px-3 text-stone-600">{record.author}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-amber-700 text-sm">
                          {record.cpm}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-sky-600">
                          {record.peakCpm || record.cpm}
                        </td>
                        <td className="py-3 px-3 text-right font-mono">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                              record.accuracy >= 95
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {record.accuracy}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-stone-500">
                          {record.errorCount}회
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-stone-600">
                          {record.totalChars}자
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-stone-500 text-[11px]">
                          {record.durationSeconds}초
                        </td>
                        <td className="py-3 px-3 text-center">
                          {onWriteReport && (
                            <button
                              onClick={() => onWriteReport(record)}
                              className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 border border-amber-400/40 text-[11px] font-medium inline-flex items-center gap-1 transition-colors"
                              title="이 작품의 독후감 작성 및 PDF 인쇄"
                            >
                              <FileText className="w-3 h-3 text-amber-600" />
                              <span>독후감</span>
                            </button>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => onDeleteRecord(record.id)}
                            className="text-stone-400 hover:text-rose-600 transition-colors p-1"
                            title="기록 삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
