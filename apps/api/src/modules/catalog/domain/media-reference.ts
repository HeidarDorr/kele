import type { AdminMediaInput } from './catalog.types.js';

const mediaPath = /^\/media\/[A-Za-z0-9/_-]+\.(jpg|jpeg|png|webp)$/;
const maxDimension = 12_000;
const maxPixels = 64_000_000;

export function mediaReferenceIssues(input: AdminMediaInput): string[] {
  const issues: string[] = [];
  const match = mediaPath.exec(input.url);
  if (
    match === null ||
    input.url.includes('//') ||
    input.url.includes('/../') ||
    input.url.includes('/./')
  ) {
    issues.push('Media URL must be an immutable same-origin /media path.');
  } else {
    const extension = match[1] === 'jpeg' ? 'jpg' : match[1];
    if (extension !== input.format) issues.push('Media URL extension must match its format.');
  }
  if (
    !Number.isSafeInteger(input.width) ||
    !Number.isSafeInteger(input.height) ||
    input.width < 1 ||
    input.height < 1 ||
    input.width > maxDimension ||
    input.height > maxDimension ||
    input.width * input.height > maxPixels
  ) {
    issues.push('Media dimensions exceed the accepted metadata bounds.');
  }
  if (input.alt !== input.alt.trim() || containsControlCharacter(input.alt)) {
    issues.push('Media alternative text must be trimmed and contain no control characters.');
  }
  return issues;
}

function containsControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit < 32 || codeUnit === 127) return true;
  }
  return false;
}
