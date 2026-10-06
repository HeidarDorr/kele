export const typographyVariants = [
  'estedad-vazirmatn',
  'parastoo-vazirmatn',
  'elize',
  'markazi',
] as const;

export type TypographyVariant = (typeof typographyVariants)[number];

export function resolveTypographyVariant(value: string | undefined): TypographyVariant {
  if (
    value === 'parastoo-vazirmatn' ||
    value === 'estedad-vazirmatn' ||
    value === 'elize' ||
    value === 'markazi'
  ) {
    return value;
  }

  return 'parastoo-vazirmatn';
}
