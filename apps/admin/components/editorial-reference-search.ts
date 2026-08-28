export type EditorialReferenceOption = Readonly<{
  id: string;
  label: string;
  meta?: string;
}>;

export function normalizeReferenceSearch(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('fa-IR')
    .replaceAll('ي', 'ی')
    .replaceAll('ك', 'ک')
    .trim();
}

export function filterReferenceOptions(
  options: EditorialReferenceOption[],
  query: string,
): EditorialReferenceOption[] {
  const normalizedQuery = normalizeReferenceSearch(query);
  if (!normalizedQuery) return options;
  return options.filter((option) =>
    normalizeReferenceSearch(`${option.label} ${option.meta ?? ''}`).includes(normalizedQuery),
  );
}
