import { randomUUID } from 'node:crypto';

interface VariantWithInternalColorCode {
  id?: string;
  normalizedColorCode?: string;
}

function colorCodeFromUuid(id: string): string {
  const token = id
    .toLocaleLowerCase('en-US')
    .replaceAll(/[^a-z0-9]/g, '')
    .slice(0, 32);
  if (token.length === 0) throw new Error('Could not generate an internal color code.');
  return `color-${token}`;
}

export function ensureInternalColorCodes<T extends VariantWithInternalColorCode>(
  variants: readonly T[],
  createId: () => string = randomUUID,
): Array<T & { normalizedColorCode: string }> {
  const occupied = new Set(
    variants
      .filter((variant) => variant.id !== undefined)
      .map((variant) => variant.normalizedColorCode?.trim())
      .filter((code): code is string => code !== undefined && code.length > 0),
  );

  return variants.map((variant) => {
    const existingCode =
      variant.id === undefined ? '' : (variant.normalizedColorCode?.trim() ?? '');
    if (existingCode.length > 0) return { ...variant, normalizedColorCode: existingCode };

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const generatedCode = colorCodeFromUuid(createId());
      if (occupied.has(generatedCode)) continue;
      occupied.add(generatedCode);
      return { ...variant, normalizedColorCode: generatedCode };
    }
    throw new Error('Could not generate a unique internal color code.');
  });
}
