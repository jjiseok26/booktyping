import React from 'react';
import { BookReport } from '../types';

interface BookReportPrintSheetProps {
  report: BookReport;
}

export const BookReportPrintSheet: React.FC<BookReportPrintSheetProps> = ({ report }) => {
  const formattedDate = new Date(report.createdAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const paragraphNotes = (report.paragraphNotes || []).filter((item) => item.note.trim());

  return (
    <div className="print-page-sheet bg-white text-stone-900 p-6 sm:p-8 max-w-3xl mx-auto font-batang leading-relaxed select-text border border-stone-800">
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

      <table className="w-full border-collapse border border-stone-800 text-xs font-sans-kr mb-4">
        <tbody>
          <tr>
            <th className="w-[16%] bg-stone-100 font-bold p-2 text-center text-stone-800 border border-stone-300">학 교</th>
            <td className="w-[28%] p-2 text-stone-900 font-medium border border-stone-300">{report.studentProfile.schoolName}</td>
            <th className="w-[16%] bg-stone-100 font-bold p-2 text-center text-stone-800 border border-stone-300">학 년 / 반</th>
            <td className="w-[16%] p-2 text-stone-900 font-medium border border-stone-300">
              {report.studentProfile.grade}학년 {report.studentProfile.classNum}반
            </td>
            <td className="w-[24%] p-2 text-center align-top border border-stone-800" rowSpan={3}>
              <div className="font-bold text-stone-700 mb-1">지도교사 확인</div>
              <div className="w-14 h-14 mx-auto my-1 border-2 border-dashed border-stone-400 rounded-full flex items-center justify-center text-[10px] text-stone-400">
                (인)
              </div>
              <div className="text-[10px] text-stone-500">평가: [ 최우수 · 우수 · 보통 ]</div>
            </td>
          </tr>
          <tr>
            <th className="bg-stone-100 font-bold p-2 text-center text-stone-800 border border-stone-300">번 호</th>
            <td className="p-2 text-stone-900 font-medium border border-stone-300">{report.studentProfile.studentNum}번</td>
            <th className="bg-stone-100 font-bold p-2 text-center text-stone-800 border border-stone-300">성 명</th>
            <td className="p-2 text-stone-900 font-bold border border-stone-300">{report.studentProfile.name}</td>
          </tr>
          <tr>
            <th className="bg-stone-100 font-bold p-2 text-center text-stone-800 border border-stone-300">작성 일자</th>
            <td className="p-2 text-stone-800 border border-stone-300" colSpan={3}>
              {formattedDate}
            </td>
          </tr>
        </tbody>
      </table>

      <table className="w-full border-collapse border border-stone-800 text-xs font-sans-kr mb-4">
        <tbody>
          <tr>
            <th className="w-[16%] bg-stone-100 font-bold p-2 text-center text-stone-800 border border-stone-300">도 서 명</th>
            <td className="p-2 font-bold text-stone-950 font-batang text-sm border border-stone-300" colSpan={3}>
              {report.bookTitle} {report.excerptTitle ? `(${report.excerptTitle})` : ''}
            </td>
            <th className="w-[12%] bg-stone-100 font-bold p-2 text-center text-stone-800 border border-stone-300">저 자</th>
            <td className="w-[18%] p-2 font-medium text-stone-900 font-batang border border-stone-300">{report.author}</td>
          </tr>
          <tr>
            <th className="bg-stone-100 font-bold p-2 text-center text-stone-800 border border-stone-300">필사 타수</th>
            <td className="p-2 font-mono text-stone-900 font-semibold border border-stone-300">{report.cpm} CPM</td>
            <th className="w-[16%] bg-stone-100 font-bold p-2 text-center text-stone-800 border border-stone-300">필사 정확도</th>
            <td className="p-2 font-mono text-stone-900 font-semibold border border-stone-300">{report.accuracy}%</td>
            <th className="bg-stone-100 font-bold p-2 text-center text-stone-800 border border-stone-300">나만의 별점</th>
            <td className="p-2 text-amber-600 border border-stone-300">
              {'★'.repeat(report.rating)}
              {'☆'.repeat(Math.max(0, 5 - report.rating))}
              <span className="ml-1 text-[11px] text-stone-700 font-mono">({report.rating}/5)</span>
            </td>
          </tr>
        </tbody>
      </table>

      <table className="w-full border-collapse border border-stone-800 mb-4">
        <thead>
          <tr>
            <th className="bg-stone-100 px-3 py-1.5 border-b border-stone-800 font-sans-kr font-bold text-xs text-stone-800 text-left">
              독후감 제목
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="p-3 font-bold text-base text-stone-900 font-batang">{report.title || '제목 없음'}</td>
          </tr>
        </tbody>
      </table>

      <table className="w-full border-collapse border border-stone-800 mb-4">
        <thead>
          <tr>
            <th className="bg-stone-100 px-3 py-1.5 border-b border-stone-800 font-sans-kr font-bold text-xs text-stone-800 text-left">
              가장 마음에 와닿은 문장 (필사 발췌)
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="p-3 bg-stone-50 text-stone-900 font-batang italic text-sm leading-relaxed">
              "{report.memorableQuote || '선택한 문장이 없습니다.'}"
            </td>
          </tr>
          {report.quoteReason ? (
            <tr>
              <td className="p-3 text-xs text-stone-700 leading-normal border-t border-dashed border-stone-300">
                <span className="font-bold font-sans-kr text-stone-800 mr-1">[선정한 까닭]</span>
                {report.quoteReason}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {paragraphNotes.length > 0 && (
        <table className="w-full border-collapse border border-stone-800 mb-4">
          <thead>
            <tr>
              <th className="bg-stone-100 px-3 py-1.5 border-b border-stone-800 font-sans-kr font-bold text-xs text-stone-800 text-left">
                필사 중 한 줄 감상
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-3 text-sm text-stone-900 leading-relaxed font-batang">
                {paragraphNotes.map((item) => (
                  <p key={`${item.from}-${item.to}`} className="mb-2 last:mb-0">
                    <span className="font-sans-kr text-xs text-stone-500 mr-1">
                      {item.from}~{item.to}문장
                    </span>
                    {item.note.trim()}
                  </p>
                ))}
              </td>
            </tr>
          </tbody>
        </table>
      )}

      <table className="w-full border-collapse border border-stone-800 mb-4">
        <thead>
          <tr>
            <th className="bg-stone-100 px-3 py-1.5 border-b border-stone-800 font-sans-kr font-bold text-xs text-stone-800 text-left">
              책을 읽고 느낀 점 및 감상 (독후감)
              <span className="float-right text-[10px] text-stone-500 font-mono font-normal">
                글자수: {report.content.length}자
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="p-4 text-sm text-stone-900 leading-relaxed font-batang whitespace-pre-line min-h-[220px]">
              {report.content || '작성된 감상 내용이 없습니다.'}
            </td>
          </tr>
        </tbody>
      </table>

      <table className="w-full border-collapse border border-stone-800 mb-4">
        <thead>
          <tr>
            <th className="bg-stone-100 px-3 py-1.5 border-b border-stone-800 font-sans-kr font-bold text-xs text-stone-800 text-left">
              나에게 주는 교훈 및 앞으로의 다짐
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="p-3 text-xs text-stone-900 leading-relaxed font-batang">
              {report.personalTakeaway || '다짐 내용이 없습니다.'}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="mt-8 pt-4 border-t border-stone-300 text-center font-sans-kr text-xs text-stone-600">
        <p>문학 타자연습 — 클래식 고전 문학 필사 프로젝트</p>
        <p className="mt-1">
          위 학생은 {report.bookTitle}의 본문을 성실히 필사하고 본 독후감을 작성하였음을 확인합니다.
        </p>
      </div>
    </div>
  );
};
