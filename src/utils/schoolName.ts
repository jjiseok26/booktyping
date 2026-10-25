export function expandSchoolName(value: string): string {
  const name = value.trim().replace(/\s+/g, '');
  if (!name) return '';
  if (name.endsWith('초등학교') || name.endsWith('중학교') || name.endsWith('고등학교')) {
    return name;
  }
  if (name.endsWith('초')) return `${name}등학교`;
  if (name.endsWith('중')) return `${name}학교`;
  if (name.endsWith('고')) return `${name}등학교`;
  return name;
}

export function schoolNameVariants(value: string): string[] {
  const name = String(value || '').trim();
  if (!name) return [];
  const expanded = expandSchoolName(name);
  const variants = new Set([name, expanded]);
  if (expanded.endsWith('중학교')) variants.add(expanded.slice(0, -2));
  else if (expanded.endsWith('초등학교') || expanded.endsWith('고등학교')) variants.add(expanded.slice(0, -3));
  return [...variants].filter(Boolean);
}

export function sameSchool(left: string, right: string): boolean {
  const names = new Set(schoolNameVariants(left));
  return schoolNameVariants(right).some((name) => names.has(name));
}
