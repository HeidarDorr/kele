export function deterministicId(prefix: string, sequence: number): string {
  return `${prefix}-${sequence.toString().padStart(4, '0')}`;
}
