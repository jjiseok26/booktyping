import React from 'react';
import { BookReport } from '../types';
import { Star } from 'lucide-react';

interface BookReportPrintSheetProps {
  report: BookReport;
}

export const BookReportPrintSheet: React.FC<BookReportPrintSheetProps> = ({ report }) => {
  const formattedDate = new Date(report.createdAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="print-page-sheet bg-white text-stone-900 p-6 sm:p-8 max-w-3xl mx-auto font-batang leading-relaxed select-text border border-stone-300 rounded-none shadow-none">
      {/* Document Header */}
      <div className="text-center pb-4 mb-4 border-b-2 border-stone-800">
        <div className="text-xs tracking-widest text-stone-600 font-sans-kr mb-1">
          {report.studentProfile.schoolYear} 독서·필사 교육활동 포트폴리오
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-950 mb-1">
          문학 명작 필사 및 독서활동 보고서
        </h1>
        <p className="text-xs text-stone-500 font-sans-kr">
          저작권 만료 고전 문학 작품을 직접 필사하고 작성한 독후감입니다.
        </p>
      </div>

      {/* Student Profile & Teacher Stamp Grid */}
      <div className="grid grid-cols-12 gap-0 border border-stone-800 text-xs font-sans-kr mb-4">
        {/* Student Info */}
        <div className="col-span-9 grid grid-cols-6 divide-x divide-y divide-stone-300">
          <div className="bg-stone-100 font-bold p-2 text-center text-stone-800">학 교</div>
          <div className="col-span-2 p-2 text-stone-900 font-medium">{report.studentProfile.schoolName}</div>
          <div className="bg-stone-100 font-bold p-2 text-center text-stone-800">학 년 / 반</div>
          <div className="col-span-2 p-2 text-stone-900 font-medium">
            {report.studentProfile.grade}학년 {report.studentProfile.classNum}반
          </div>

          <div className="bg-stone-100 font-bold p-2 text-center text-stone-800">번 호</div>
          <div className="col-span-2 p-2 text-stone-900 font-medium">{report.studentProfile.studentNum}번</div>
          <div className="bg-stone-100 font-bold p-2 text-center text-stone-800">성 명</div>
          <div className="col-span-2 p-2 text-stone-900 font-bold">{report.studentProfile.name}</div>

          <div className="bg-stone-100 font-bold p-2 text-center text-stone-800">작성 일자</div>
          <div className="col-span-5 p-2 text-stone-800">{formattedDate}</div>
        </div>

        {/* Teacher Check Stamp Box */}
        <div className="col-span-3 border-l border-stone-800 flex flex-col justify-between text-center bg-stone-50/50 p-2">
          <span className="text-[11px] font-bold text-stone-700">지도교사 확인</span>
          <div className="w-14 h-14 mx-auto my-1 border-2 border-dashed border-stone-400 rounded-full flex items-center justify-center text-[10px] text-stone-400">
            (인)
          </div>
          <span className="text-[10px] text-stone-500">평가: [ 최우수 · 우수 · 보통 ]</span>
        </div>
      </div>

      {/* Book & Typing Performance Grid */}
      <div className="border border-stone-800 text-xs font-sans-kr mb-4 divide-y divide-stone-300">
        <div className="grid grid-cols-6 divide-x divide-stone-300">
          <div className="bg-stone-100 font-bold p-2 text-center text-stone-800">도 서 명</div>
          <div className="col-span-3 p-2 font-bold text-stone-950 font-batang text-sm">
            {report.bookTitle} {report.excerptTitle ? `(${report.excerptTitle})` : ''}
          </div>
          <div className="bg-stone-100 font-bold p-2 text-center text-stone-800">저 자</div>
          <div className="p-2 font-medium text-stone-900 font-batang">{report.author}</div>
        </div>

        <div className="grid grid-cols-6 divide-x divide-stone-300">
          <div className="bg-stone-100 font-bold p-2 text-center text-stone-800">필사 타수</div>
          <div className="p-2 font-mono text-stone-900 font-semibold">{report.cpm} CPM</div>
          <div className="bg-stone-100 font-bold p-2 text-center text-stone-800">필사 정확도</div>
          <div className="p-2 font-mono text-stone-900 font-semibold">{report.accuracy}%</div>
          <div className="bg-stone-100 font-bold p-2 text-center text-stone-800">나만의 별점</div>
          <div className="p-2 flex items-center gap-0.5 text-amber-500">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-3.5 h-3.5 ${
                  star <= report.rating ? 'fill-amber-400 text-amber-500' : 'text-stone-300'
                }`}
              />
            ))}
            <span className="ml-1 text-[11px] text-stone-700 font-mono">({report.rating}/5)</span>
          </div>
        </div>
      </div>

      {/* Report Title */}
      <div className="border border-stone-800 mb-4">
        <div className="bg-stone-100 px-3 py-1.5 border-b border-stone-800 font-sans-kr font-bold text-xs text-stone-800 flex items-center justify-between">
          <span>독후감 제목</span>
        </div>
        <div className="p-3 font-bold text-base text-stone-900 font-batang">
          {report.title || '제목 없음'}
        </div>
      </div>

      {/* Memorable Quote */}
      <div className="border border-stone-800 mb-4">
        <div className="bg-stone-100 px-3 py-1.5 border-b border-stone-800 font-sans-kr font-bold text-xs text-stone-800">
          가장 마음에 와닿은 문장 (필사 발췌)
        </div>
        <div className="p-3 bg-stone-50/40 text-stone-900 font-batang italic text-sm leading-relaxed border-b border-dashed border-stone-300">
          "{report.memorableQuote || '선택한 문장이 없습니다.'}"
        </div>
        {report.quoteReason && (
          <div className="p-3 text-xs text-stone-700 leading-normal">
            <span className="font-bold font-sans-kr text-stone-800 mr-1">[선정한 까닭]</span>
            {report.quoteReason}
          </div>
        )}
      </div>

      {/* Main Reading Reflection / Impression */}
      <div className="border border-stone-800 mb-4">
        <div className="bg-stone-100 px-3 py-1.5 border-b border-stone-800 font-sans-kr font-bold text-xs text-stone-800 flex items-center justify-between">
          <span>책을 읽고 느낀 점 및 감상 (독후감)</span>
          <span className="text-[10px] text-stone-500 font-mono font-normal">
            글자수: {report.content.length}자
          </span>
        </div>
        <div className="p-4 text-sm text-stone-900 leading-relaxed font-batang whitespace-pre-line min-h-[220px]">
          {report.content || '작성된 감상 내용이 없습니다.'}
        </div>
      </div>

      {/* Personal Takeaway / Lesson */}
      <div className="border border-stone-800 mb-4">
        <div className="bg-stone-100 px-3 py-1.5 border-b border-stone-800 font-sans-kr font-bold text-xs text-stone-800">
          나에게 주는 교훈 및 앞으로의 다짐
        </div>
        <div className="p-3 text-xs text-stone-900 leading-relaxed font-batang">
          {report.personalTakeaway || '다짐 내용이 없습니다.'}
        </div>
      </div>

      {/* Document Footer Signature */}
      <div className="mt-8 pt-4 border-t border-stone-300 text-center font-sans-kr text-xs text-stone-600 flex items-center justify-between">
        <span>문학 타자연습 — 클래식 고전 문학 필사 프로젝트</span>
        <span>
          위 학생은 {report.bookTitle}의 본문을 성실히 필사하고 본 독후감을 작성하였음을 확인합니다.
        </span>
      </div>
    </div>
  );
};
