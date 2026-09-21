export function expandSchoolName(value: string): string {
  const name = value.trim();
  if (!name) return '';
  if (name.endsWith('중학교') || name.endsWith('초등학교') || name.endsWith('고등학교')) {
    return name;
  }
  if (name.endsWith('중')) return `${name.slice(0, -1)}중학교`;
  if (name.endsWith('초')) return `${name.slice(0, -1)}초등학교`;
  if (name.endsWith('고')) return `${name.slice(0, -1)}고등학교`;
  return name;
}
