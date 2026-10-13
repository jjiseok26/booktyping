export type StudentDraft = {
  grade: number;
  classNum: number;
  studentNum: number;
  name: string;
};

export type StudentIdRow = StudentDraft & {
  schoolName: string;
  schoolYear: string;
  id: string;
};

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
    if (ch === '"') quoted = true;
    else if (ch === ',' || ch === '\t') {
      row.push(cell.trim());
      cell = '';
    } else if (ch === '\n') {
      row.push(cell.trim());
      if (row.some((value) => value)) rows.push(row);
      row = [];
      cell = '';
    } else if (ch !== '\r') cell += ch;
  }
  row.push(cell.trim());
  if (row.some((value) => value)) rows.push(row);
  return rows;
}

function headerIndex(headers: string[], aliases: string[]): number {
  return headers.findIndex((header) => aliases.some((alias) => header.includes(alias)));
}

function toInt(value: string): number {
  const match = value.replace(/학년|반|번/g, '').match(/\d+/);
  return match ? Number(match[0]) : 0;
}

export function rowsToStudents(table: string[][]): StudentDraft[] {
  if (table.length < 2) return [];
  const headers = table[0].map((value) => value.replace(/\s+/g, '').toLowerCase());
  const gradeIdx = headerIndex(headers, ['학년']);
  const classIdx = headerIndex(headers, ['학급', '반']);
  const numIdx = headerIndex(headers, ['번호', '번']);
  const nameIdx = headerIndex(headers, ['성명', '이름', '학생']);
  if (nameIdx < 0 || numIdx < 0) return [];
  return table.slice(1).flatMap((row) => {
    const name = String(row[nameIdx] || '').trim();
    const studentNum = toInt(String(row[numIdx] || ''));
    if (!name && !studentNum) return [];
    return [
      {
        grade: gradeIdx >= 0 ? toInt(String(row[gradeIdx] || '')) : 0,
        classNum: classIdx >= 0 ? toInt(String(row[classIdx] || '')) : 0,
        studentNum,
        name,
      },
    ];
  });
}

export async function parseStudentSpreadsheet(file: File): Promise<StudentDraft[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv') || name.endsWith('.txt')) return rowsToStudents(parseCsv(await file.text()));
  const xlsx = await import('xlsx');
  const workbook = xlsx.read(await file.arrayBuffer(), { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const table = (xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' }) as unknown[][]).map((row) =>
    row.map((value) => String(value || '').trim())
  );
  return rowsToStudents(table);
}

export async function downloadStudentWorkbook(filename: string, rows: string[][]) {
  const xlsx = await import('xlsx');
  const sheet = xlsx.utils.aoa_to_sheet(rows);
  const book = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(book, sheet, '학생아이디');
  xlsx.writeFile(book, filename);
}
