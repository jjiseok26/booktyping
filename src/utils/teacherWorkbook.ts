import { expandSchoolName } from './schoolName';

export type TeacherDraft = {
  schoolName: string;
  username: string;
  password: string;
  grade?: number;
  classNum?: number;
  schoolAdmin?: boolean;
};

export const TEACHER_CSV_TEMPLATE =
  '\uFEFF학교명,아이디,비밀번호,학년,반,구분\n금구중학교,geumgu1,pass1234,1,3,담임교사\n금구중학교,geumgu-admin,pass1234,,,학교최고관리자\n';

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const source = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];
    if (quoted) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
    } else if (ch === ',' || ch === '\t') {
      row.push(cell.trim());
      cell = '';
    } else if (ch === '\n') {
      row.push(cell.trim());
      if (row.some((value) => value)) rows.push(row);
      row = [];
      cell = '';
    } else if (ch !== '\r') {
      cell += ch;
    }
  }
  row.push(cell.trim());
  if (row.some((value) => value)) rows.push(row);
  return rows;
}

function headerIndex(headers: string[], aliases: string[]): number {
  return headers.findIndex((header) => aliases.some((alias) => header.includes(alias)));
}

function cell(row: string[], index: number): string {
  return index >= 0 ? String(row[index] || '').trim() : '';
}

function toInt(value: string): number {
  const match = value.replace(/학년|반|번/g, '').match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function isSchoolAdmin(value: string): boolean {
  return value.includes('최고');
}

export function rowsToTeachers(table: string[][]): TeacherDraft[] {
  if (table.length < 2) return [];
  const headers = table[0].map((value) => value.replace(/\s+/g, '').toLowerCase());
  const schoolIdx = headerIndex(headers, ['학교명', '학교']);
  const userIdx = headerIndex(headers, ['아이디', 'id', 'username', '계정']);
  const passIdx = headerIndex(headers, ['비밀번호', '비번', '암호', 'password']);
  const gradeIdx = headerIndex(headers, ['학년', 'grade']);
  const classIdx = headerIndex(headers, ['학급', '반', 'class']);
  const roleIdx = headerIndex(headers, ['구분', '역할', '권한', 'role']);
  if (schoolIdx < 0 || userIdx < 0 || passIdx < 0) return [];

  return table.slice(1).flatMap((row) => {
    const schoolName = expandSchoolName(cell(row, schoolIdx));
    const username = cell(row, userIdx);
    const password = cell(row, passIdx);
    if (!schoolName && !username) return [];
    return [
      {
        schoolName,
        username,
        password,
        grade: toInt(cell(row, gradeIdx)),
        classNum: toInt(cell(row, classIdx)),
        schoolAdmin: isSchoolAdmin(cell(row, roleIdx)),
      },
    ];
  });
}

export async function parseTeacherSpreadsheet(file: File): Promise<TeacherDraft[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv') || name.endsWith('.txt')) {
    return rowsToTeachers(parseCsv(await file.text()));
  }
  const xlsx = await import('xlsx');
  const workbook = xlsx.read(await file.arrayBuffer(), { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const table = (xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' }) as unknown[][]).map((row) =>
    row.map((value) => String(value || '').trim())
  );
  return rowsToTeachers(table);
}
