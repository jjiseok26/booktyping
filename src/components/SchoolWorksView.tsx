import React, { useEffect, useState } from 'react';
import { KeyRound, Lock, BookOpen, LogIn } from 'lucide-react';
import { BookExcerpt } from '../types';
import { apiListSchoolWorks, apiUnlockSchoolWork, SchoolWorkSummary } from '../utils/dbClient';

interface SchoolWorksViewProps {
  schoolName: string;
  loggedIn: boolean;
  onOpenLogin: () => void;
  onSelectBook: (book: BookExcerpt) => void;
}

export const SchoolWorksView: React.FC<SchoolWorksViewProps> = ({
  schoolName,
  loggedIn,
  onOpenLogin,
  onSelectBook,
}) => {
  const [works, setWorks] = useState<SchoolWorkSummary[]>([]);
  const [selected, setSelected] = useState<SchoolWorkSummary | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!schoolName) {
      setWorks([]);
      return;
    }
    void apiListSchoolWorks(schoolName).then(setWorks).catch(() => setWorks([]));
  }, [schoolName]);

  const unlock = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiUnlockSchoolWork(selected.id, password);
      if (!data.book) {
        setError(data.message || '암호가 올바르지 않습니다.');
        return;
      }
      setSelected(null);
      setPassword('');
      onSelectBook(data.book);
    } catch (err) {
      setError(err instanceof Error ? err.message : '작품을 열지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 border border-sky-200 text-sky-900 text-xs font-medium mb-2">
          <Lock className="w-3.5 h-3.5" />
          학교 작품 · 암호 입력 후 필사
        </div>
        <h1 className="font-batang text-3xl font-bold text-stone-900">우리 학교 작품</h1>
        <p className="mt-2 text-sm text-stone-600">
          선생님이 올린 글입니다. 공개 서재와 따로 있으며, 선생님이 알려 준 암호를 입력해야 필사할 수 있습니다.
        </p>
      </div>

      {!loggedIn || !schoolName ? (
        <div className="bg-white border border-stone-200 rounded-3xl p-8 text-center">
          <p className="text-stone-600 text-sm mb-4">로그인한 학생만 자기 학교 작품을 볼 수 있습니다.</p>
          <button
            type="button"
            onClick={onOpenLogin}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-stone-950 font-semibold text-sm"
          >
            <LogIn className="w-4 h-4" />
            학생 로그인
          </button>
        </div>
      ) : works.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-3xl p-8 text-center text-sm text-stone-500">
          아직 선생님이 올린 학교 작품이 없습니다.
        </div>
      ) : (
        <div className="grid gap-3">
          {works.map((work) => (
            <button
              key={work.id}
              type="button"
              onClick={() => {
                setSelected(work);
                setPassword('');
                setError(null);
              }}
              className="text-left bg-white border border-stone-200 hover:border-sky-300 rounded-2xl p-4 flex items-center justify-between gap-3"
            >
              <div>
                <p className="font-batang font-bold text-stone-900">{work.title}</p>
                <p className="text-xs text-stone-500 mt-1">
                  {work.author || '선생님'} · {work.teacherUsername}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs text-sky-800 bg-sky-50 border border-sky-200 px-2 py-1 rounded-lg">
                <KeyRound className="w-3.5 h-3.5" />
                암호 필요
              </span>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 flex items-center justify-center p-4">
          <form onSubmit={unlock} className="bg-white rounded-3xl p-6 w-full max-w-md space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-sky-700" />
              <h2 className="font-batang font-bold text-lg">{selected.title}</h2>
            </div>
            <p className="text-xs text-stone-500">선생님이 알려 준 작품 암호를 입력하세요.</p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm"
              placeholder="작품 암호"
              autoFocus
            />
            {error && <p className="text-xs text-rose-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setSelected(null)} className="px-3 py-2 text-sm text-stone-600">
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-sky-700 text-white text-sm font-semibold disabled:opacity-60"
              >
                {loading ? '확인 중...' : '필사 시작'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
