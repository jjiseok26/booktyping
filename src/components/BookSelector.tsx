import React, { useState, useMemo } from 'react';
import { Search, BookMarked, Feather, Check, Sparkles, ShieldCheck, ArrowRight } from 'lucide-react';
import { BookExcerpt } from '../types';
import { PUBLIC_DOMAIN_BOOKS, CATEGORIES } from '../data/books';

interface BookSelectorProps {
  activeExcerptId: string;
  onSelectExcerpt: (excerpt: BookExcerpt) => void;
}

export const BookSelector: React.FC<BookSelectorProps> = ({
  activeExcerptId,
  onSelectExcerpt,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | '초급' | '중급' | '고급'>('all');

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { 전체: PUBLIC_DOMAIN_BOOKS.length };
    PUBLIC_DOMAIN_BOOKS.forEach((book) => {
      counts[book.category] = (counts[book.category] || 0) + 1;
    });
    return counts;
  }, []);

  const filteredBooks = useMemo(() => {
    return PUBLIC_DOMAIN_BOOKS.filter((book) => {
      const matchCategory = selectedCategory === '전체' || book.category === selectedCategory;
      const matchDifficulty = difficultyFilter === 'all' || book.difficulty === difficultyFilter;
      const query = searchQuery.trim().toLowerCase();
      const matchQuery =
        !query ||
        book.bookTitle.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query) ||
        book.title.toLowerCase().includes(query) ||
        book.description.toLowerCase().includes(query) ||
        book.sentences.some((s) => s.toLowerCase().includes(query));

      return matchCategory && matchDifficulty && matchQuery;
    });
  }, [selectedCategory, difficultyFilter, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Hero Section */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-stone-200">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/70 border border-amber-300/60 text-amber-900 text-xs font-medium mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
              <span>저작권 만료 명작 라이브러리 · 100% 합법 자유이용</span>
            </div>
            <h1 className="font-batang text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">
              문학 서재에서 필사할 작품 고르기
            </h1>
            <p className="mt-2 text-stone-600 text-sm sm:text-base leading-relaxed max-w-3xl">
              윤동주·정지용·김소월·이육사의 명시, 이효석·김유정·현진건의 소설, 박지원·정약용의 고전, 그리고 톨스토이·생텍쥐페리·오스카 와일드의 세계 명작까지 총 {PUBLIC_DOMAIN_BOOKS.length}편의 고전 명문장을 손끝으로 따라 쓰며 타자 실력과 문학적 소양을 길러보세요.
            </p>
          </div>

          <div className="text-xs text-stone-500 bg-stone-100 p-3 rounded-xl border border-stone-200 flex items-center gap-2">
            <Feather className="w-4 h-4 text-stone-400 shrink-0" />
            <span>총 <strong>{PUBLIC_DOMAIN_BOOKS.length}</strong>편의 고전 명문장 수록</span>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
            {CATEGORIES.map((cat) => {
              const count = categoryCounts[cat] || 0;
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-stone-900 text-stone-100 shadow-sm'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-600 border border-stone-200/80'
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`text-[11px] px-1.5 py-0.5 rounded-full font-mono leading-none ${
                      isSelected
                        ? 'bg-stone-700 text-amber-300'
                        : 'bg-stone-200/80 text-stone-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Difficulty and Search */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value as 'all' | '초급' | '중급' | '고급')}
              className="bg-white border border-stone-200 text-xs sm:text-sm text-stone-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            >
              <option value="all">모든 난이도</option>
              <option value="초급">초급 (짧은 문장)</option>
              <option value="중급">중급 (표준 문체)</option>
              <option value="고급">고급 (장문/어휘)</option>
            </select>

            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="도서명, 작가, 본문 검색..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-stone-200 rounded-xl text-xs sm:text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Book Grid */}
      {filteredBooks.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-stone-200 p-8">
          <BookMarked className="w-10 h-10 text-stone-400 mx-auto mb-3 opacity-60" />
          <p className="text-stone-600 font-medium">검색 조건과 일치하는 도서가 없습니다.</p>
          <button
            onClick={() => {
              setSelectedCategory('전체');
              setSearchQuery('');
              setDifficultyFilter('all');
            }}
            className="mt-3 text-xs text-amber-700 font-semibold underline hover:text-amber-800"
          >
            모든 필터 초기화
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBooks.map((book) => {
            const isCurrent = book.id === activeExcerptId;
            const totalChars = book.sentences.reduce((acc, s) => acc + s.length, 0);

            return (
              <div
                key={book.id}
                id={`book-card-${book.id}`}
                className={`group relative flex flex-col bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isCurrent
                    ? 'border-amber-500 shadow-md ring-2 ring-amber-500/20'
                    : 'border-stone-200/90 hover:border-stone-300 hover:shadow-lg'
                }`}
              >
                {/* Book header color bar */}
                <div className={`h-2.5 w-full bg-gradient-to-r ${book.coverGradient}`} />

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${book.badgeColor}`}>
                          {book.category}
                        </span>
                        {book.fullSentences && book.fullSentences.length > (book.excerptSentences?.length || 0) && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                            전문 필사
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 border border-stone-200 font-medium">
                          난이도 {book.difficulty}
                        </span>
                        {isCurrent && (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-amber-500 text-stone-950 font-bold">
                            <Check className="w-3 h-3" />
                            선택됨
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Book & Excerpt Title */}
                    <div className="mb-2">
                      <h3 className="font-batang text-xl font-bold text-stone-900 group-hover:text-amber-900 transition-colors">
                        {book.title}
                      </h3>
                      <p className="text-xs text-stone-500 font-medium mt-0.5">
                        《{book.bookTitle}》 · {book.author} ({book.year})
                      </p>
                    </div>

                    {/* Excerpt Description */}
                    <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed mb-4">
                      {book.description}
                    </p>

                    {/* First line preview */}
                    <div className="bg-stone-50 rounded-xl p-3 border border-stone-200/70 mb-4 font-batang text-xs text-stone-700 italic">
                      "{book.sentences[0]}"
                    </div>
                  </div>

                  {/* Footer Details & Action Button */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-stone-500 mb-3 pt-3 border-t border-stone-100">
                      <span>문장 수: <strong>{book.fullSentences ? `${book.fullSentences.length}개(전문)` : `${book.sentences.length}개`}</strong></span>
                      <span>총 글자 수: <strong>{book.fullSentences ? `${book.fullSentences.reduce((acc, s) => acc + s.length, 0)}자` : `${totalChars}자`}</strong></span>
                      <span className="text-emerald-700 font-medium">자유이용 만료작</span>
                    </div>

                    <button
                      onClick={() => onSelectExcerpt(book)}
                      className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                        isCurrent
                          ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-sm'
                          : 'bg-stone-900 hover:bg-stone-800 text-stone-100'
                      }`}
                    >
                      {isCurrent ? (
                        <>
                          <Sparkles className="w-4 h-4 text-stone-950" />
                          <span>지금 바로 필사 이어하기</span>
                        </>
                      ) : (
                        <>
                          <span>이 작품 필사하기</span>
                          <ArrowRight className="w-4 h-4 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
