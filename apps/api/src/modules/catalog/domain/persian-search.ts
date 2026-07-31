const arabicDiacritics = /[\u064b-\u065f\u0670\u06d6-\u06ed]/gu;
const unsafeSearchCharacters = /[^\p{L}\p{N}\s_-]/gu;

export function normalizePersianSearch(value: string): string {
  return value
    .normalize('NFKC')
    .replaceAll('ي', 'ی')
    .replaceAll('ك', 'ک')
    .replaceAll('ۀ', 'ه')
    .replaceAll('ة', 'ه')
    .replaceAll('\u200c', ' ')
    .replace(arabicDiacritics, '')
    .replace(unsafeSearchCharacters, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
    .toLocaleLowerCase('fa-IR');
}
