export const typographyVariants = ['estedad-vazirmatn', 'elize', 'markazi'] as const;

export type TypographyVariant = (typeof typographyVariants)[number];

export function resolveTypographyVariant(value: string | undefined): TypographyVariant {
  return value === 'elize' || value === 'markazi' ? value : 'estedad-vazirmatn';
}
