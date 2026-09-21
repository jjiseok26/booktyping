import { BookReport } from '../types';

const STORAGE_KEY = 'literary_typing_paragraph_notes_v1';

type ParagraphNote = NonNullable<BookReport['paragraphNotes']>[number];

function readAll(): Record<string, ParagraphNote[]> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Record<string, ParagraphNote[]>;
  } catch {
    return {};
  }
}

export function getParagraphNotes(bookId: string): ParagraphNote[] {
  return readAll()[bookId] || [];
}

export function saveParagraphNote(bookId: string, note: ParagraphNote): ParagraphNote[] {
  const all = readAll();
  const current = all[bookId] || [];
  const next = [...current.filter((item) => !(item.from === note.from && item.to === note.to)), note].sort(
    (a, b) => a.from - b.from
  );
  all[bookId] = next;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return next;
}

export function formatParagraphNotes(notes: ParagraphNote[]): string {
  return notes
    .filter((item) => item.note.trim())
    .map((item) => `(${item.from}~${item.to}문장) ${item.note.trim()}`)
    .join('\n');
}
